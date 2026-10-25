'use strict';
/* ===== AUTH: Supabase Auth (mật khẩu xử lý phía máy chủ Supabase), hồ sơ, hiện diện online ===== */
(function () {
  const C = window.AIC_CONFIG;
  const Auth = window.Auth = {
    sb: null, online: new Set(), presence: null, listeners: [],
    init() {
      if (!window.supabase) { console.warn('Chưa tải được Supabase'); return false; }
      this.sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true }, realtime: { params: { eventsPerSecond: 10 } } });
      return true;
    },
    email(u) { return u.toLowerCase() + '@' + C.EMAIL_DOMAIN; },
    slug(handle) { return String(handle || '').replace(/^@/, '').replace('#', '_'); },
    fromSlug(s) { const m = String(s).match(/^(.+)_(\d{4})$/); return m ? '@' + m[1] + '#' + m[2] : null; },
    validUser(u) { if (!u) return 'Vui lòng nhập tên người dùng.'; if (!/^[a-zA-Z0-9_]{3,20}$/.test(u)) return 'Tên người dùng gồm 3–20 ký tự: chữ không dấu, số hoặc dấu gạch dưới.'; return ''; },
    async register(user, pass, pass2) {
      const e1 = this.validUser(user); if (e1) throw new Error(e1);
      if (!pass) throw new Error('Vui lòng nhập mật khẩu.'); if (pass.length < 6) throw new Error('Mật khẩu cần ít nhất 6 ký tự.');
      if (pass !== pass2) throw new Error('Mật khẩu xác nhận chưa trùng khớp.');
      if (!this.sb) throw new Error('Chưa kết nối được máy chủ dữ liệu.');
      const { data, error } = await this.sb.auth.signUp({ email: this.email(user), password: pass, options: { data: { username: user.toLowerCase() } } });
      if (error) throw new Error(/already|registered/i.test(error.message) ? 'Tên người dùng này đã có người dùng.' : /rate|limit/i.test(error.message) ? 'Bạn thao tác quá nhanh, hãy thử lại sau ít phút.' : 'Không tạo được tài khoản: ' + error.message);
      if (!data.session) { const r = await this.sb.auth.signInWithPassword({ email: this.email(user), password: pass }); if (r.error) throw new Error('Tài khoản đã tạo nhưng chưa đăng nhập được. Chủ website cần TẮT "Confirm email" trong Supabase → Authentication → Providers → Email.'); }
      await this.afterLogin();
    },
    async login(user, pass) {
      if (!user || !pass) throw new Error('Vui lòng nhập tên người dùng và mật khẩu.'); if (!this.sb) throw new Error('Chưa kết nối được máy chủ dữ liệu.');
      const { error } = await this.sb.auth.signInWithPassword({ email: this.email(user.trim()), password: pass });
      if (error) throw new Error('Tên người dùng hoặc mật khẩu chưa đúng.');
      await this.afterLogin();
    },
    async restore() {
      if (!this.sb) return false; const { data } = await this.sb.auth.getSession(); if (!data.session) return false;
      try { await this.afterLogin(); return true; } catch (e) { return false; }
    },
    async afterLogin() {
      const { data: { user } } = await this.sb.auth.getUser(); App.user = user; App.guest = false;
      let p = null; for (let i = 0; i < 4 && !p; i++) { const r = await this.sb.from('profiles').select('*').eq('id', user.id).maybeSingle(); p = r.data; if (!p) await sleep(400); }
      if (!p) throw new Error('Chưa tìm thấy hồ sơ. Hãy chạy supabase/schema.sql trước.');
      App.profile = p; this.startPresence(); this.emit();
    },
    async logout() { this.stopPresence(); if (this.sb) await this.sb.auth.signOut(); App.user = null; App.profile = null; App.guest = false; this.emit(); },
    async updateProfile(patch) { const { data, error } = await this.sb.from('profiles').update(patch).eq('id', App.user.id).select().single(); if (error) throw new Error(error.message); App.profile = data; this.emit(); return data; },
    on(fn) { this.listeners.push(fn); }, emit() { this.listeners.forEach(f => { try { f(); } catch (e) { } }); },
    startPresence() {
      this.stopPresence(); const me = App.user.id;
      this.presence = this.sb.channel('presence:online', { config: { presence: { key: me } } });
      this.presence.on('presence', { event: 'sync' }, () => { this.online = new Set(Object.keys(this.presence.presenceState())); document.dispatchEvent(new CustomEvent('presence')); })
        .subscribe(s => { if (s === 'SUBSCRIBED') this.presence.track({ at: Date.now() }); });
      const beat = () => this.sb.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', me).then(() => { }); beat(); this.hb = setInterval(beat, 60000);
    },
    stopPresence() { if (this.presence) { this.sb.removeChannel(this.presence); this.presence = null; } clearInterval(this.hb); this.online = new Set(); },
    isOnline(id) { return this.online.has(id); },
    get loggedIn() { return !!App.user; }
  };
})();
