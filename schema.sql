-- =====================================================================
-- AI CLASSROOM — SCHEMA SUPABASE (chạy MỘT LẦN trong Supabase → SQL Editor → New query → Run)
-- An toàn khi chạy lại nhiều lần (idempotent).
-- =====================================================================

-- 1) HỒ SƠ ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  user_tag text unique not null,
  display_name text,
  avatar text not null default 'cat',
  role text not null default 'learner' check (role in ('learner','teacher','moderator')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare uname text; tag text; n int := 0;
begin
  uname := coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1));
  loop
    tag := '@' || uname || '#' || lpad((floor(random()*9000)+1000)::int::text, 4, '0');
    exit when not exists (select 1 from public.profiles where user_tag = tag);
    n := n + 1; if n > 30 then tag := '@' || uname || '#' || substr(md5(random()::text),1,6); exit; end if;
  end loop;
  insert into public.profiles(id, username, user_tag, display_name, avatar)
  values (new.id, uname, tag, uname, coalesce(new.raw_user_meta_data->>'avatar','cat'));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.profiles_guard() returns trigger language plpgsql as $$
begin
  if new.role <> old.role or new.user_tag <> old.user_tag or new.username <> old.username then
    raise exception 'Không được đổi vai trò, tên hoặc User Tag';
  end if; return new;
end $$;
drop trigger if exists profiles_guard_t on public.profiles;
create trigger profiles_guard_t before update on public.profiles for each row execute function public.profiles_guard();

-- 2) DIỄN ĐÀN ---------------------------------------------------------
create table if not exists public.posts (
  id bigint generated always as identity primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 160),
  body text not null check (char_length(body) between 5 and 20000),
  chapter int check (chapter between 1 and 7),
  tags text[] not null default '{}',
  images text[] not null default '{}',
  solved_answer_id bigint,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.answers (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 2 and 20000),
  images text[] not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists public.post_likes (
  post_id bigint references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (post_id, user_id)
);
create table if not exists public.post_reports (
  post_id bigint references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);
create index if not exists posts_created_idx on public.posts(created_at desc);
create index if not exists answers_post_idx on public.answers(post_id);

create or replace view public.posts_view with (security_invoker = true) as
select p.*, pr.username, pr.display_name, pr.user_tag, pr.avatar,
  (select count(*) from public.answers a where a.post_id = p.id)::int as answer_count,
  (select count(*) from public.post_likes l where l.post_id = p.id)::int as like_count
from public.posts p join public.profiles pr on pr.id = p.author_id;
create or replace view public.answers_view with (security_invoker = true) as
select a.*, pr.username, pr.display_name, pr.user_tag, pr.avatar
from public.answers a join public.profiles pr on pr.id = a.author_id;

-- chống spam + ẩn bài bị báo cáo nhiều lần
create or replace function public.rate_posts() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.posts where author_id = new.author_id and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'rate limit: đăng quá nhanh'; end if; return new; end $$;
drop trigger if exists rate_posts_t on public.posts;
create trigger rate_posts_t before insert on public.posts for each row execute function public.rate_posts();
create or replace function public.rate_answers() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.answers where author_id = new.author_id and created_at > now() - interval '10 minutes') >= 12 then
    raise exception 'rate limit: trả lời quá nhanh'; end if; return new; end $$;
drop trigger if exists rate_answers_t on public.answers;
create trigger rate_answers_t before insert on public.answers for each row execute function public.rate_answers();
create or replace function public.hide_reported() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.post_reports where post_id = new.post_id) >= 3 then
    update public.posts set hidden = true where id = new.post_id; end if; return new; end $$;
drop trigger if exists hide_reported_t on public.post_reports;
create trigger hide_reported_t after insert on public.post_reports for each row execute function public.hide_reported();

-- 3) BẠN BÈ & CHAT 1-1 ------------------------------------------------
create table if not exists public.friendships (
  id bigint generated always as identity primary key,
  requester uuid not null references public.profiles(id) on delete cascade,
  addressee uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','blocked')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index if not exists friendships_pair_uq on public.friendships (least(requester, addressee), greatest(requester, addressee));
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  sender uuid not null references public.profiles(id) on delete cascade,
  receiver uuid not null references public.profiles(id) on delete cascade,
  body text check (char_length(body) <= 4000),
  image_url text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (body is not null or image_url is not null)
);
create index if not exists messages_pair_idx on public.messages (sender, receiver, created_at);
create table if not exists public.reactions (
  message_id bigint references public.messages(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('👍','❤️','😂','😮','🤔','🆘')),
  primary key (message_id, user_id)
);
create or replace function public.are_friends(a uuid, b uuid) returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.friendships where status = 'accepted' and ((requester = a and addressee = b) or (requester = b and addressee = a))) $$;
create or replace function public.rate_messages() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.messages where sender = new.sender and created_at > now() - interval '1 minute') >= 40 then
    raise exception 'rate limit: nhắn quá nhanh'; end if; return new; end $$;
drop trigger if exists rate_messages_t on public.messages;
create trigger rate_messages_t before insert on public.messages for each row execute function public.rate_messages();


-- 4) NHẬT KÝ HỌC TẬP (cho trang Ôn tập) ---------------------------------
create table if not exists public.study_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_id text not null,
  created_at timestamptz not null default now(),
  topic text, chapter text, kind text, result text, support text, error_label text, source text,
  problem text, solution text,
  unique (user_id, client_id)
);

-- 5) BẢO MẬT HÀNG (Row Level Security) -----------------------------------
alter table public.profiles    enable row level security;
alter table public.posts       enable row level security;
alter table public.comments    enable row level security;
alter table public.friendships enable row level security;
alter table public.messages    enable row level security;
alter table public.reactions   enable row level security;
alter table public.study_logs  enable row level security;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname='public' and tablename in ('profiles','posts','comments','friendships','messages','reactions','study_logs') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- profiles: thành viên đăng nhập xem được nhau (để tìm bạn, hiện tên bài đăng); chỉ sửa hồ sơ của mình
create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- posts / comments
create policy posts_select on public.posts for select to authenticated using (true);
create policy posts_insert on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy posts_delete on public.posts for delete to authenticated using (author_id = auth.uid());
create policy comments_select on public.comments for select to authenticated using (true);
create policy comments_insert on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy comments_delete on public.comments for delete to authenticated using (author_id = auth.uid());

-- friendships
create policy fr_select on public.friendships for select to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy fr_insert on public.friendships for insert to authenticated with check (requester_id = auth.uid() and status = 'pending');
create policy fr_update on public.friendships for update to authenticated using (addressee_id = auth.uid()) with check (addressee_id = auth.uid() and status = 'accepted');
create policy fr_delete on public.friendships for delete to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid());

-- messages: chỉ nhắn được với người đã là bạn bè
create policy msg_select on public.messages for select to authenticated using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy msg_insert on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and exists (
    select 1 from public.friendships f where f.status = 'accepted'
      and ((f.requester_id = auth.uid() and f.addressee_id = receiver_id) or (f.addressee_id = auth.uid() and f.requester_id = receiver_id))));

-- reactions: chỉ thả cảm xúc trên tin nhắn mà mình nhìn thấy
create policy rx_select on public.reactions for select to authenticated using (exists (select 1 from public.messages m where m.id = message_id));
create policy rx_insert on public.reactions for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.messages m where m.id = message_id));
create policy rx_delete on public.reactions for delete to authenticated using (user_id = auth.uid());

-- study_logs: riêng tư tuyệt đối
create policy sl_all on public.study_logs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 6) KHO ẢNH (Storage) ---------------------------------------------------
insert into storage.buckets (id, name, public) values ('images', 'images', true) on conflict (id) do nothing;
drop policy if exists "images_read" on storage.objects;
drop policy if exists "images_insert" on storage.objects;
drop policy if exists "images_delete" on storage.objects;
create policy "images_read"   on storage.objects for select using (bucket_id = 'images');
create policy "images_insert" on storage.objects for insert to authenticated with check (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "images_delete" on storage.objects for delete to authenticated using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

-- 7) THỜI GIAN THỰC (Realtime) -------------------------------------------
alter table public.friendships replica identity full;
alter table public.reactions   replica identity full;
do $$ begin
  begin alter publication supabase_realtime add table public.posts;       exception when others then null; end;
  begin alter publication supabase_realtime add table public.comments;    exception when others then null; end;
  begin alter publication supabase_realtime add table public.friendships; exception when others then null; end;
  begin alter publication supabase_realtime add table public.messages;    exception when others then null; end;
  begin alter publication supabase_realtime add table public.reactions;   exception when others then null; end;
end $$;
