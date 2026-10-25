'use strict';
/* ===== SOCIAL: Diễn đàn thật, kết bạn @tag + QR, chat 1-1 thời gian thực (100% người dùng thật, không bot) ===== */
(function () {
  const sb = () => Auth.sb;
  const TAGS = ['Xác suất', 'Biến ngẫu nhiên', 'Phân phối', 'Mẫu', 'Ước lượng', 'Kiểm định', 'So sánh hai tham số', 'Hỏi đáp chung'];
  const EMO = [['👍', 'Thích (đồng ý/chuẩn rồi)'], ['❤️', 'Cảm ơn bạn'], ['😆', 'Vui quá'], ['😲', 'Cách giải hay quá'], ['🤔', 'Đang xem lại bước này'], ['🆘', 'Chưa hiểu chỗ này']];
  const ago = d => { const s = (Date.now() - new Date(d)) / 1000; if (s < 60) return 'vừa xong'; if (s < 3600) return Math.floor(s / 60) + ' phút trước'; if (s < 86400) return Math.floor(s / 3600) + ' giờ trước'; return new Date(d).toLocaleDateString('vi-VN'); };
  const need = () => { if (!App.user) { toast('Tính năng này cần tài khoản thật. Hãy đăng nhập hoặc đăng ký nhé.', 'error'); return false; } return true; };
  const userChip = u => u ? `<span class="uchip">${Avatars.html(u.avatar, 34)}<span><b>${esc(u.username)}</b><small>${esc(u.handle)}</small></span></span>` : '<span class="muted">Người dùng đã xóa</span>';

  const Social = window.Social = {
    friends: [], incoming: [], outgoing: [], unread: {}, chans: [],
    link(handle) { return location.origin + location.pathname.replace(/index\.html$/, '') + '#u/' + Auth.slug(handle); },
    qrSvg(text, px = 220) {
      const q = qrcode(0, 'M'); q.addData(text); q.make(); const n = q.getModuleCount(), quiet = 4, tot = n + quiet * 2; let r = '';
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) r += `<rect x="${x + quiet}" y="${y + quiet}" width="1.02" height="1.02"/>`;
      return `<div class="qr-frame"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tot} ${tot}" width="${px}" height="${px}" shape-rendering="crispEdges" role="img" aria-label="Mã QR hồ sơ"><rect width="${tot}" height="${tot}" fill="#ffffff"/><g fill="#000000">${r}</g></svg></div>`;
    },
    async refresh() {
      if (!App.user) return; const me = App.user.id;
      const { data, error } = await sb().from('friendships').select('*').or(`requester_id.eq.${me},addressee_id.eq.${me}`); if (error) return;
      const ids = [...new Set(data.map(f => f.requester_id === me ? f.addressee_id : f.requester_id))];
      const pr = ids.length ? (await sb().from('profiles').select('id,username,handle,avatar,school_class,last_seen').in('id', ids)).data || [] : [], map = Object.fromEntries(pr.map(p => [p.id, p]));
      this.friends = data.filter(f => f.status === 'accepted').map(f => ({ fid: f.id, ...map[f.requester_id === me ? f.addressee_id : f.requester_id] })).filter(f => f.id);
      this.incoming = data.filter(f => f.status === 'pending' && f.addressee_id === me).map(f => ({ fid: f.id, ...map[f.requester_id] })).filter(f => f.id);
      this.outgoing = data.filter(f => f.status === 'pending' && f.requester_id === me).map(f => ({ fid: f.id, ...map[f.addressee_id] })).filter(f => f.id);
      this.badge(); document.dispatchEvent(new CustomEvent('social'));
    },
    badge() { const n = this.incoming.length + Object.values(this.unread).reduce((a, b) => a + b, 0); Shell.setBadge(n); },
    start() {
      this.stop(); if (!App.user) return; const me = App.user.id; this.refresh();
      this.chans.push(sb().channel('fr-' + me).on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, p => {
        if (p.eventType === 'DELETE') return this.refresh(); const r = p.new && p.new.id ? p.new : p.old || {}; if (r.addressee_id !== me && r.requester_id !== me) return;
        if (p.eventType === 'INSERT' && r.addressee_id === me) toast('📨 Bạn có lời mời kết bạn mới!', 'success'); if (p.eventType === 'UPDATE' && r.status === 'accepted' && r.requester_id === me) toast('🎉 Lời mời kết bạn đã được chấp nhận!', 'success'); this.refresh();
      }).subscribe());
      this.chans.push(sb().channel('msg-' + me).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'receiver_id=eq.' + me }, p => {
        const m = p.new; if (DM.peer && DM.peer.id === m.sender_id && !DM.min) DM.incoming(m); else { this.unread[m.sender_id] = (this.unread[m.sender_id] || 0) + 1; this.badge(); const f = this.friends.find(x => x.id === m.sender_id); toast('💬 Tin nhắn mới' + (f ? ' từ ' + f.username : ''), 'info'); if (DM.peer && DM.peer.id === m.sender_id) DM.incoming(m); }
      }).on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => DM.reloadReactions()).subscribe());
    },
    stop() { this.chans.forEach(c => sb() && sb().removeChannel(c)); this.chans = []; this.friends = []; this.incoming = []; this.outgoing = []; this.unread = {}; DM.close(); },
    async sendRequest(p) { const { error } = await sb().from('friendships').insert({ requester_id: App.user.id, addressee_id: p.id, status: 'pending' }); if (error) return toast(/duplicate|unique/i.test(error.message) ? 'Hai bạn đã có lời mời/đã là bạn bè.' : 'Không gửi được lời mời: ' + error.message, 'error'); toast('Đã gửi lời mời kết bạn tới ' + p.username, 'success'); this.refresh(); },
    async answer(f, ok) { const q = ok ? sb().from('friendships').update({ status: 'accepted' }).eq('id', f.fid) : sb().from('friendships').delete().eq('id', f.fid); const { error } = await q; if (error) return toast(error.message, 'error'); toast(ok ? 'Đã kết bạn với ' + f.username : 'Đã từ chối.', ok ? 'success' : 'info'); this.refresh(); },
    async unfriend(f) { if (!await Modal.confirm('Hủy kết bạn', 'Bạn chắc chắn muốn hủy kết bạn với ' + f.username + '?')) return; await sb().from('friendships').delete().eq('id', f.fid); this.refresh(); },
    async findByHandle(h) { const { data } = await sb().from('profiles').select('id,username,handle,avatar,school_class,last_seen').eq('handle', h.trim().toLowerCase()).maybeSingle(); return data; },
    profileCard(p, big) {
      const st = p.id === App.user.id ? 'me' : this.friends.some(f => f.id === p.id) ? 'friend' : this.outgoing.some(f => f.id === p.id) ? 'sent' : this.incoming.some(f => f.id === p.id) ? 'in' : 'none';
      const on = Auth.isOnline(p.id), d = el(`<div class="pcard glass dark">${Avatars.html(p.avatar, big ? 84 : 60)}<div class="pinfo"><b>${esc(p.username)}</b> <span class="dot ${on ? 'on' : ''}" title="${on ? 'Đang online' : 'Offline'}"></span> <small>${on ? 'Online' : 'Offline'}</small><div class="muted">${esc(p.handle)}</div><div class="muted small">${p.school_class ? '🏫 ' + esc(p.school_class) : 'Chưa cập nhật trường/lớp'}</div></div><div class="pact"></div></div>`), a = $('.pact', d);
      const btn = (t, cls, fn) => { const b = el(`<button class="btn ${cls}">${t}</button>`); b.onclick = fn; a.appendChild(b); };
      if (st === 'none') btn('➕ Gửi lời mời kết bạn', 'primary', () => this.sendRequest(p).then(() => { a.innerHTML = '<span class="muted">Đã gửi lời mời</span>'; }));
      else if (st === 'sent') a.innerHTML = '<span class="muted">⏳ Đã gửi lời mời, chờ chấp nhận</span>';
      else if (st === 'in') btn('✓ Chấp nhận lời mời', 'ok', () => this.answer(this.incoming.find(f => f.id === p.id), true));
      else if (st === 'friend') btn('💬 Nhắn tin', 'primary', () => DM.open(p));
      else a.innerHTML = '<span class="muted">Đây là bạn</span>'; return d;
    },
    async openProfileSlug(slug) {
      const h = Auth.fromSlug(slug); if (!h) return toast('Liên kết hồ sơ không hợp lệ.', 'error');
      if (!App.user) { SS.set('aic_pending_u', slug); return toast('Hãy đăng nhập để xem hồ sơ và kết bạn.', 'info'); }
      await this.refresh(); const p = await this.findByHandle(h); if (!p) return toast('Không tìm thấy tài khoản ' + h, 'error');
      const m = Modal.open({ title: 'Hồ sơ bạn học' }); m.body.appendChild(this.profileCard(p, true));
    },
    profileModal() {
      const p = App.profile; if (!p) return; const link = this.link(p.handle);
      const m = Modal.open({ title: 'Hồ sơ cá nhân', wide: true, html: `<div class="grid2"><div><div class="center">${Avatars.html(p.avatar, 96)}<h3>${esc(p.username)}</h3><div class="handle">${esc(p.handle)}</div></div>
        <h4>Chọn avatar</h4><div class="avgrid">${Avatars.list.map(a => `<button class="avopt ${a === p.avatar ? 'on' : ''}" data-av="${a}" aria-label="${Avatars.label[a]}">${Avatars.html(a, 54)}<small>${Avatars.label[a]}</small></button>`).join('')}</div>
        <label>Trường/lớp<input id="pcls" maxlength="60" value="${esc(p.school_class || '')}" placeholder="VD: ĐH Kinh tế – lớp D01"/></label><div class="row end"><button class="btn primary" id="psave">Lưu hồ sơ</button></div></div>
        <div class="center"><h4>Mã QR của bạn</h4>${this.qrSvg(link, 220)}<p class="muted small">Quét bằng camera điện thoại để mở hồ sơ và kết bạn.</p><div class="row center wrap"><button class="btn ghost" id="pcopy">🔗 Sao chép liên kết cá nhân</button><button class="btn ghost" id="phandle">📋 Sao chép ${esc(p.handle)}</button></div><p class="small muted break">${esc(link)}</p></div></div>`
      });
      let av = p.avatar; $$('[data-av]', m.body).forEach(b => b.onclick = () => { av = b.dataset.av; $$('[data-av]', m.body).forEach(x => x.classList.toggle('on', x === b)); });
      $('#psave', m.body).onclick = async () => { try { await Auth.updateProfile({ avatar: av, school_class: $('#pcls', m.body).value.trim() }); toast('Đã lưu hồ sơ.', 'success'); m.close(); } catch (e) { toast(e.message, 'error'); } };
      const cp = (t, msg) => navigator.clipboard ? navigator.clipboard.writeText(t).then(() => toast(msg, 'success')) : prompt('Sao chép:', t);
      $('#pcopy', m.body).onclick = () => cp(link, 'Đã sao chép liên kết cá nhân.'); $('#phandle', m.body).onclick = () => cp(p.handle, 'Đã sao chép mã định danh.');
    }
  };

  // ============ DIỄN ĐÀN ============
  let froot, tab = 'posts', expanded = new Set(), forumChan = null;
  async function loadPosts() {
    const box = $('#plist', froot); if (!box) return;
    const { data, error } = await sb().from('posts').select('*, author:profiles!author_id(id,username,handle,avatar), comments(count)').order('created_at', { ascending: false }).limit(60);
    if (error) { box.innerHTML = `<div class="notice warn">Không tải được bài đăng: ${esc(error.message)}. Hãy chắc chắn đã chạy <code>supabase/schema.sql</code>.</div>`; return; }
    if (!data.length) { box.innerHTML = `<div class="notice">Chưa có bài đăng nào. Hãy là người đầu tiên đặt câu hỏi cho các bạn! 🚀</div>`; return; }
    box.innerHTML = ''; data.forEach(p => box.appendChild(postCard(p)));
  }
  function postCard(p) {
    const n = (p.comments && p.comments[0] && p.comments[0].count) || 0, open = expanded.has(p.id);
    const plain = p.body.replace(/\\\(|\\\)|\\\[|\\\]/g, '').replace(/\s+/g, ' ').slice(0, 130);
    const c = el(`<article class="post glass dark ${open ? 'open' : ''}" data-id="${p.id}"><div class="phead">${userChip(p.author)}<span class="muted small">${ago(p.created_at)}</span></div>
      <h3>${esc(p.title)}</h3><div class="tags"><span class="tag">${esc(p.tag)}</span><span class="muted small">💬 ${n} bình luận</span>${App.user && p.author_id === App.user.id ? '<button class="btn small ghost" data-del>🗑 Xóa</button>' : ''}</div>
      <p class="pshort muted">${esc(plain)}${p.body.length > 130 ? '…' : ''}</p><div class="pfull"><div class="pin"></div></div>
      <button class="chev" aria-label="Mở rộng bài đăng" aria-expanded="${open}"><span></span></button></article>`);
    const full = $('.pin', c); const fill = () => {
      full.innerHTML = `<div class="rich">${Rich.html(p.body)}</div>${(p.images || []).map(u => `<img class="pimg" src="${esc(u)}" alt="Ảnh đính kèm" data-lb/>`).join('')}
        <div class="row wrap"><button class="btn small ghost" data-ai>🤖 Nhờ AI CLASSROOM gợi ý</button></div><div class="aibox" hidden></div>
        <h4>Bình luận của các bạn</h4><div class="cmts"><span class="muted">Đang tải…</span></div><div class="cform"></div>`;
      $$('[data-lb]', full).forEach(i => i.onclick = () => Lightbox.open(i.src));
      $('[data-ai]', full).onclick = async () => { if (!AI.ready) return Shell.aiSettings(); const ab = $('.aibox', full); ab.hidden = false; ab.innerHTML = '<div class="ailabel">🤖 Gợi ý từ AI CLASSROOM — đây KHÔNG phải bình luận của bạn học</div><div class="rich">AI đang suy nghĩ…</div>'; const r = $('.rich', ab); try { await AI.stream({ system: AI.prompts.core + '\nHãy GỢI Ý hướng giải (không đưa đáp án ngay) cho câu hỏi của bạn học trên diễn đàn.', text: p.title + '\n' + p.body }, (d, f) => Rich.into(r, f)); } catch (e) { r.textContent = e.message; } };
      loadComments(p, $('.cmts', full)); commentForm(p, $('.cform', full), () => loadComments(p, $('.cmts', full)));
    };
    $('.chev', c).onclick = () => { const o = c.classList.toggle('open'); $('.chev', c).setAttribute('aria-expanded', o); if (o) { expanded.add(p.id); if (!full.dataset.f) { full.dataset.f = 1; fill(); } } else expanded.delete(p.id); };
    if (open) { full.dataset.f = 1; fill(); }
    const d = $('[data-del]', c); if (d) d.onclick = async () => { if (await Modal.confirm('Xóa bài đăng', 'Xóa bài đăng này?')) { await sb().from('posts').delete().eq('id', p.id); loadPosts(); } };
    return c;
  }
  async function loadComments(p, box) {
    const { data } = await sb().from('comments').select('*, author:profiles!author_id(id,username,handle,avatar)').eq('post_id', p.id).order('created_at'); if (!data || !data.length) { box.innerHTML = '<span class="muted">Chưa có bình luận.</span>'; return; }
    box.innerHTML = ''; data.forEach(c => { const e = el(`<div class="cmt">${userChip(c.author)}<span class="muted small">${ago(c.created_at)}</span><div class="rich">${Rich.html(c.body)}</div>${(c.images || []).map(u => `<img class="pimg" src="${esc(u)}" alt="Ảnh" data-lb/>`).join('')}</div>`); $$('[data-lb]', e).forEach(i => i.onclick = () => Lightbox.open(i.src)); box.appendChild(e); });
  }
  // Bộ soạn thảo dùng chung (bài đăng / bình luận): dán ảnh Ctrl+V, camera, thanh ký hiệu, xem trước
  function editor(host, { rows = 4, placeholder = '' } = {}) {
    host.innerHTML = `<div class="mbh"></div><textarea rows="${rows}" placeholder="${esc(placeholder)}"></textarea><div class="row wrap"><button type="button" class="btn small ghost" data-pi>🖼 Ảnh</button><button type="button" class="btn small ghost" data-pc>📷 Chụp</button><span class="muted small">Có thể dán ảnh bằng Ctrl+V</span></div><div class="thumbs"></div><details><summary class="small">Xem trước công thức</summary><div class="preview rich"></div></details><input type="file" accept="image/*" hidden multiple/>`;
    const ta = $('textarea', host), blobs = [], th = $('.thumbs', host); MathBar.mount($('.mbh', host), ta); Preview.bind(ta, $('.preview', host));
    const add = async b => { const pb = await Img.process(b, { max: 1400, q: .82 }); blobs.push(pb); const t = el(`<span class="thumb"><img src="${Img.url(pb)}" alt="Ảnh chờ đăng"/><button type="button" aria-label="Bỏ ảnh">✕</button></span>`); $('button', t).onclick = () => { blobs.splice(blobs.indexOf(pb), 1); t.remove(); }; th.appendChild(t); };
    ta.addEventListener('paste', e => { const f = Img.fromClipboard(e); if (f) { e.preventDefault(); add(f); } });
    $('[data-pi]', host).onclick = () => $('input[type=file]', host).click(); $('input[type=file]', host).onchange = e => [...e.target.files].forEach(add);
    $('[data-pc]', host).onclick = async () => { const b = await Camera.open({ title: 'Chụp đề từ sách/vở' }); if (b) add(b); };
    return { ta, blobs, reset() { ta.value = ''; blobs.length = 0; th.innerHTML = ''; ta.dispatchEvent(new Event('input')); }, async upload() { const urls = []; for (const b of blobs) urls.push(await Img.upload(b)); return urls; } };
  }
  function commentForm(p, host, done) {
    if (!App.user) { host.innerHTML = '<div class="notice">Đăng nhập để bình luận.</div>'; return; }
    const ed = editor(host, { rows: 2, placeholder: 'Viết bình luận… (dùng thanh ký hiệu để chèn công thức)' }); const b = el('<button class="btn primary">Gửi bình luận</button>'); host.appendChild(b);
    b.onclick = async () => { const t = ed.ta.value.trim(); if (!t && !ed.blobs.length) return; b.disabled = true; try { const images = await ed.upload(); const { error } = await sb().from('comments').insert({ post_id: p.id, author_id: App.user.id, body: t, images }); if (error) throw error; ed.reset(); done(); } catch (e) { toast('Không gửi được: ' + e.message, 'error'); } b.disabled = false; };
  }
  function drawPosts(box) {
    box.innerHTML = `${App.user ? `<details class="glass dark panel newpost"><summary><b>✍️ Đăng bài / đặt câu hỏi mới</b></summary><input id="ptitle" maxlength="140" placeholder="Tiêu đề câu hỏi"/><select id="ptag">${TAGS.map(t => `<option>${t}</option>`).join('')}</select><div id="ped"></div><div class="row end"><button class="btn primary" id="ppost">Đăng bài</button></div></details>` : '<div class="notice warn">Bạn đang dùng tài khoản khách nên chỉ xem được giao diện. Hãy đăng nhập để xem và tham gia diễn đàn thật.</div>'}<div id="plist"><span class="muted">Đang tải bài đăng…</span></div>`;
    if (!App.user) return; const ed = editor($('#ped', box), { rows: 5, placeholder: 'Mô tả đề bài, dán ảnh đề, gõ công thức bằng LaTeX…' });
    $('#ppost', box).onclick = async e => { const t = $('#ptitle', box).value.trim(), body = ed.ta.value.trim(); if (!t || (!body && !ed.blobs.length)) return toast('Hãy nhập tiêu đề và nội dung.', 'error'); e.target.disabled = true; try { const images = await ed.upload(); const { error } = await sb().from('posts').insert({ author_id: App.user.id, title: t, tag: $('#ptag', box).value, body, images }); if (error) throw error; ed.reset(); $('#ptitle', box).value = ''; $('.newpost', box).open = false; toast('Đã đăng bài!', 'success'); loadPosts(); } catch (x) { toast('Không đăng được: ' + x.message, 'error'); } e.target.disabled = false; };
    loadPosts();
    forumChan = sb().channel('forum').on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => loadPosts()).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, p => { loadPosts(); }).subscribe();
  }
  function drawFriends(box) {
    if (!App.user) { box.innerHTML = '<div class="notice warn">Cần tài khoản thật để tìm bạn và nhắn tin. Hãy đăng nhập nhé.</div>'; return; }
    const draw = () => {
      box.innerHTML = `<div class="grid2"><div class="glass dark panel"><h3>🔎 Tìm bạn học</h3><p class="muted small">Nhập chính xác mã của bạn, ví dụ <code>@anbinh#2026</code></p><div class="row"><input id="fq" placeholder="@tênngườidùng#1234"/><button class="btn primary" id="fgo">Tìm</button></div><div id="fres"></div>
          <hr/><h4>Mã của bạn: <span class="handle">${esc(App.profile.handle)}</span></h4><div class="row wrap"><button class="btn ghost" id="fcopy">🔗 Sao chép liên kết cá nhân</button><button class="btn ghost" id="fqr">▦ Mã QR của tôi</button></div></div>
        <div class="glass dark panel"><h3>📨 Yêu cầu kết bạn chờ duyệt ${Social.incoming.length ? `<span class="badge">${Social.incoming.length}</span>` : ''}</h3><div id="fin">${Social.incoming.map(f => `<div class="frow">${userChip(f)}<span><button class="btn small ok" data-a="${f.fid}">Chấp nhận</button> <button class="btn small ghost" data-d="${f.fid}">Từ chối</button></span></div>`).join('') || '<span class="muted">Không có yêu cầu nào.</span>'}</div>
          ${Social.outgoing.length ? `<h4>Đã gửi</h4>${Social.outgoing.map(f => `<div class="frow">${userChip(f)}<span class="muted small">chờ duyệt…</span></div>`).join('')}` : ''}</div></div>
        <div class="glass dark panel"><h3>👥 Bạn bè (${Social.friends.length})</h3><div id="fl">${Social.friends.map(f => { const on = Auth.isOnline(f.id), u = Social.unread[f.id] || 0; return `<div class="frow">${userChip(f)}<span class="dot ${on ? 'on' : ''}" title="${on ? 'Online' : 'Offline'}"></span><span class="muted small">${on ? 'Online' : 'Offline'}</span><span><button class="btn small primary" data-c="${f.id}">💬 Nhắn tin ${u ? `<b class="badge">${u}</b>` : ''}</button> <button class="btn small ghost" data-u="${f.fid}">Hủy</button></span></div>`; }).join('') || '<span class="muted">Chưa có bạn bè. Hãy tìm bạn bằng mã @tag hoặc quét QR nhé.</span>'}</div></div>`;
      $('#fgo', box).onclick = async () => { const q = $('#fq', box).value.trim(); if (!/^@.+#\d{4}$/.test(q)) return toast('Mã cần có dạng @tênngườidùng#1234', 'error'); const p = await Social.findByHandle(q), r = $('#fres', box); r.innerHTML = ''; if (!p) r.innerHTML = '<div class="notice warn">Không tìm thấy tài khoản này.</div>'; else r.appendChild(Social.profileCard(p)); };
      $('#fq', box).addEventListener('keydown', e => e.key === 'Enter' && $('#fgo', box).click());
      $('#fcopy', box).onclick = () => navigator.clipboard.writeText(Social.link(App.profile.handle)).then(() => toast('Đã sao chép liên kết cá nhân.', 'success')); $('#fqr', box).onclick = () => Social.profileModal();
      $$('[data-a]', box).forEach(b => b.onclick = () => Social.answer(Social.incoming.find(f => f.fid === b.dataset.a), true)); $$('[data-d]', box).forEach(b => b.onclick = () => Social.answer(Social.incoming.find(f => f.fid === b.dataset.d), false));
      $$('[data-c]', box).forEach(b => b.onclick = () => DM.open(Social.friends.find(f => f.id === b.dataset.c))); $$('[data-u]', box).forEach(b => b.onclick = () => Social.unfriend(Social.friends.find(f => f.fid === b.dataset.u)));
    }; draw(); froot._redraw = draw;
  }
  const onSoc = () => { if (froot && froot._redraw && tab === 'friends') froot._redraw(); }; document.addEventListener('social', onSoc); document.addEventListener('presence', onSoc);
  App.reg('forum', {
    render(root, p) {
      froot = root; tab = (p && p.tab) || 'posts';
      root.innerHTML = `<div class="page-head">${backBtn()}<div><h2>AI CLASSROOM FORUM</h2><p class="muted">Cộng đồng 100% người học thật — không bot, không tài khoản ảo.</p></div><button class="btn ghost" data-back="home">🏠 Trang chủ</button></div>
        <div class="tabs"><button class="tab ${tab === 'posts' ? 'on' : ''}" data-t="posts">💬 Bài thảo luận</button><button class="tab ${tab === 'friends' ? 'on' : ''}" data-t="friends">🤝 Kết bạn & Chat ${Shell.badgeN ? `<b class="badge">${Shell.badgeN}</b>` : ''}</button></div><div id="fbody"></div>`;
      const show = () => { if (forumChan) { sb().removeChannel(forumChan); forumChan = null; } const b = $('#fbody', root); $$('[data-t]', root).forEach(x => x.classList.toggle('on', x.dataset.t === tab)); tab === 'posts' ? (Auth.sb && drawPosts(b)) : drawFriends(b); };
      $$('[data-t]', root).forEach(b => b.onclick = () => { tab = b.dataset.t; show(); }); show();
    },
    destroy() { if (forumChan) { sb().removeChannel(forumChan); forumChan = null; } froot = null; }
  });

  // ============ CHAT 1-1 ============
  const DM = window.DM = {
    peer: null, win: null, msgs: [], reacts: {}, min: false, typingCh: null, tTimer: null, pending: null,
    key(a, b) { return [a, b].sort().join('_'); },
    async open(p) {
      if (!p) return; this.close(); this.peer = p; this.min = false; delete Social.unread[p.id]; Social.badge(); const me = App.user.id;
      const w = this.win = el(`<section class="dm glass dark" aria-label="Chat với ${esc(p.username)}"><header>${Avatars.html(p.avatar, 36)}<div class="who"><b>${esc(p.username)}</b><small class="st"></small></div><div class="hbtns"><button class="icon-btn" data-min title="Thu nhỏ">—</button><button class="icon-btn" data-x title="Đóng">✕</button></div></header>
        <div class="dmbody"><div class="msgs dmmsgs"><span class="muted">Đang tải tin nhắn…</span></div><div class="typing-ind" hidden>${esc(p.username)} đang nhập tin nhắn…</div>
        <div class="dmin"><div id="dmb"></div><div class="chatimg" hidden></div><div class="crow"><textarea rows="1" placeholder="Nhắn tin… dùng \\( x^2 \\) để gõ công thức"></textarea><button class="icon-btn" data-i title="Gửi ảnh">🖼</button><button class="icon-btn" data-c title="Chụp ảnh">📷</button><button class="btn primary" data-s>Gửi</button></div><input type="file" accept="image/*" hidden/></div></div></section>`);
      document.body.appendChild(w); const ta = $('textarea', w); MathBar.mount($('#dmb', w), ta);
      $('[data-x]', w).onclick = () => this.close(); $('[data-min]', w).onclick = () => { this.min = !this.min; w.classList.toggle('min', this.min); if (!this.min) { delete Social.unread[p.id]; Social.badge(); } };
      this.setStatus(); this.typingCh = sb().channel('typing:' + this.key(me, p.id), { config: { broadcast: { self: false } } }).on('broadcast', { event: 'typing' }, () => { const t = $('.typing-ind', w); if (t) { t.hidden = false; clearTimeout(this.tTimer); this.tTimer = setTimeout(() => t.hidden = true, 2500); } }).subscribe();
      let last = 0; ta.addEventListener('input', () => { if (Date.now() - last > 1200) { last = Date.now(); this.typingCh.send({ type: 'broadcast', event: 'typing', payload: {} }); } });
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); } });
      const setImg = async b => { this.pending = await Img.process(b, { max: 1400, q: .82 }); const pv = $('.chatimg', w); pv.hidden = false; pv.innerHTML = `<img src="${Img.url(this.pending)}" alt="Ảnh sẽ gửi"/><button class="icon-btn" data-rm>✕</button>`; $('[data-rm]', pv).onclick = () => { this.pending = null; pv.hidden = true; }; };
      ta.addEventListener('paste', e => { const f = Img.fromClipboard(e); if (f) { e.preventDefault(); setImg(f); } });
      $('[data-i]', w).onclick = () => $('input[type=file]', w).click(); $('input[type=file]', w).onchange = e => e.target.files[0] && setImg(e.target.files[0]); $('[data-c]', w).onclick = async () => { const b = await Camera.open({ title: 'Chụp bài làm gửi bạn' }); if (b) setImg(b); };
      $('[data-s]', w).onclick = () => this.send();
      const { data } = await sb().from('messages').select('*').or(`and(sender_id.eq.${me},receiver_id.eq.${p.id}),and(sender_id.eq.${p.id},receiver_id.eq.${me})`).order('created_at').limit(300);
      this.msgs = data || []; await this.reloadReactions(true); this.render();
    },
    setStatus() { if (!this.win) return; const on = Auth.isOnline(this.peer.id); $('.st', this.win).innerHTML = `<span class="dot ${on ? 'on' : ''}"></span> ${on ? 'Online' : 'Offline'}`; },
    async reloadReactions(skip) { if (!this.peer) return; const ids = this.msgs.map(m => m.id); if (!ids.length) { this.reacts = {}; return; } const { data } = await sb().from('reactions').select('*').in('message_id', ids); this.reacts = {}; (data || []).forEach(r => (this.reacts[r.message_id] = this.reacts[r.message_id] || []).push(r)); if (!skip) this.render(); },
    incoming(m) { if (this.msgs.some(x => x.id === m.id)) return; this.msgs.push(m); this.render(); },
    render() {
      if (!this.win) return; const box = $('.dmmsgs', this.win), me = App.user.id, near = box.scrollHeight - box.scrollTop - box.clientHeight < 120; box.innerHTML = '';
      if (!this.msgs.length) box.innerHTML = '<span class="muted">Hãy gửi lời chào đầu tiên 👋 (khung chat này chỉ có hai bạn, không có bot)</span>';
      this.msgs.forEach(m => {
        const mine = m.sender_id === me, rs = this.reacts[m.id] || [], grp = {}; rs.forEach(r => (grp[r.emoji] = grp[r.emoji] || []).push(r.user_id));
        const e = el(`<div class="dmmsg ${mine ? 'mine' : 'theirs'}"><div class="bub">${m.image ? `<img class="pimg" src="${esc(m.image)}" alt="Ảnh" data-lb/>` : ''}${m.body ? `<div class="rich">${Rich.html(m.body)}</div>` : ''}<small class="muted">${new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</small>
          <button class="rbtn" aria-label="Thả cảm xúc">☺</button><div class="rbar" hidden>${EMO.map(([x, t]) => `<button title="${esc(t)}" data-e="${x}">${x}</button>`).join('')}</div>
          ${Object.keys(grp).length ? `<div class="rlist">${Object.entries(grp).map(([x, u]) => `<span class="rx ${u.includes(me) ? 'me' : ''}" data-e="${x}" title="${u.map(i => i === me ? 'Bạn' : (i === this.peer.id ? this.peer.username : '')).join(', ')}">${x} ${u.length}</span>`).join('')}</div>` : ''}</div></div>`);
        const lb = $('[data-lb]', e); if (lb) lb.onclick = () => Lightbox.open(m.image);
        $('.rbtn', e).onclick = () => { const b = $('.rbar', e); b.hidden = !b.hidden; };
        let tm; e.addEventListener('touchstart', () => tm = setTimeout(() => $('.rbar', e).hidden = false, 450), { passive: true }); e.addEventListener('touchend', () => clearTimeout(tm));
        $$('[data-e]', e).forEach(b => b.onclick = () => this.react(m, b.dataset.e)); box.appendChild(e);
      });
      if (near || !this.seen) box.scrollTop = box.scrollHeight; this.seen = true;
    },
    async react(m, emo) {
      const me = App.user.id, mine = (this.reacts[m.id] || []).find(r => r.user_id === me && r.emoji === emo);
      if (mine) await sb().from('reactions').delete().eq('id', mine.id); else await sb().from('reactions').insert({ message_id: m.id, user_id: me, emoji: emo }); this.reloadReactions();
    },
    async send() {
      const ta = $('textarea', this.win), t = ta.value.trim(); if (!t && !this.pending) return; const btn = $('[data-s]', this.win); btn.disabled = true;
      try { const image = this.pending ? await Img.upload(this.pending) : null; const { data, error } = await sb().from('messages').insert({ sender_id: App.user.id, receiver_id: this.peer.id, body: t, image }).select().single(); if (error) throw error; this.msgs.push(data); ta.value = ''; this.pending = null; $('.chatimg', this.win).hidden = true; this.render(); }
      catch (e) { toast('Không gửi được: ' + e.message, 'error'); } btn.disabled = false;
    },
    close() { if (this.typingCh) { sb().removeChannel(this.typingCh); this.typingCh = null; } if (this.win) this.win.remove(); this.win = null; this.peer = null; this.msgs = []; this.reacts = {}; this.seen = false; }
  };
  document.addEventListener('presence', () => DM.setStatus());
})();
