'use strict';
/* ===== MAIN: khung giao diện, nhập API key, Welcome, đăng nhập/đăng ký, Trang chủ, khởi động ===== */
(function () {
  const LOGO = `<svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#a78bfa"/></linearGradient></defs><rect x="2" y="2" width="36" height="36" rx="10" fill="#0f1240" stroke="url(#lg)" stroke-width="2"/><text x="20" y="27" text-anchor="middle" font-size="22" font-weight="800" fill="url(#lg)" font-family="Georgia,serif">Σ</text></svg>`;
  const NOTICE = {
    casio: ['Casio FX-580', 'Tính năng giả lập máy tính Casio FX-580 chưa được triển khai trong phiên bản này. Bạn có thể dùng tab “＝ Tính nhanh” ở AI BUDDY – SOLVE để tính các phép tính xác suất thống kê.'],
    trap: ['Luyện Bẫy Thi', 'Tính năng Luyện Bẫy Thi chưa được triển khai trong phiên bản này. Hiện bạn có thể luyện bằng Trò chơi hoặc hỏi Chatbot AI về các lỗi thường gặp.']
  };

  // ---------- Khung điều hướng ----------
  const Shell = window.Shell = {
    badgeN: 0, built: false,
    build() {
      if (this.built) return; this.built = true;
      $('#app').innerHTML = `<header id="nav" class="nav glass" hidden><button class="brand" data-go="home" aria-label="AI CLASSROOM – Trang chủ">${LOGO}<b>AI CLASSROOM</b></button>
        <button class="burger icon-btn" id="burger" aria-label="Mở menu">☰</button>
        <nav class="menu" id="menu" aria-label="Điều hướng chính">
          <a href="#" data-go="solve" data-p='{"tab":"calc"}'>Giải Toán & Đồ Thị</a><a href="#" data-go="steps4">Quy Trình 4 Bước</a><a href="#" data-go="laplace">Giá Trị Hàm Laplace</a><a href="#" data-note="casio">Casio FX-580</a><a href="#" data-note="trap">Luyện Bẫy Thi</a>
          <a href="#" data-go="forum" id="navforum">Diễn đàn <b class="badge" id="nbadge" hidden></b></a><a href="#" data-go="tutor">TUTOR</a>
          <span class="trio"><a href="#" data-go="solve">Giải bài</a><a href="#" data-go="games">Chơi trò chơi</a><a href="#" data-go="review">Ôn tập</a></span>
          <div class="acct" id="acct"></div><button class="btn primary cta" data-go="solve">Giải Đề Ngay</button></nav></header><main id="view" tabindex="-1"></main><footer class="foot">© Nhóm 3 - D01</footer>`;
      $('#nav').addEventListener('click', e => {
        const n = e.target.closest('[data-note]'); if (n) { e.preventDefault(); const [t, m] = NOTICE[n.dataset.note]; Modal.open({ title: t, html: `<p>${esc(m)}</p>` }); $('#menu').classList.remove('open'); return; }
        const a = e.target.closest('[data-go]'); if (!a) return; e.preventDefault(); $('#menu').classList.remove('open'); const g = a.dataset.go;
        if (g === 'steps4') { App.go('home', {}, { reset: true }); setTimeout(() => { const s = $('#steps4'); s && s.scrollIntoView({ behavior: 'smooth' }); }, 60); }
        else if (g === 'home') App.go('home', {}, { reset: true }); else if (g === 'solve' && a.dataset.p) App.go('solve', JSON.parse(a.dataset.p)); else App.go(g);
      });
      $('#burger').onclick = () => $('#menu').classList.toggle('open');
      Auth.on(() => this.drawAcct()); this.drawAcct();
    },
    update(v) { this.build(); const show = v.nav !== false; $('#nav').hidden = !show; $('.foot').hidden = false; if (show) Chatbot.show(); else Chatbot.hide(); },
    setBadge(n) { this.badgeN = n; const b = $('#nbadge'); if (b) { b.hidden = !n; b.textContent = n; } },
    drawAcct() {
      const a = $('#acct'); if (!a) return;
      if (App.profile) { a.innerHTML = `<button class="acbtn" id="acbtn" aria-haspopup="true">${Avatars.html(App.profile.avatar, 34)}<span>${esc(App.profile.username)}</span></button><div class="dropmenu glass dark" id="drop" hidden><div class="dh"><b>${esc(App.profile.username)}</b><small>${esc(App.profile.handle)}</small></div><button data-a="profile">👤 Hồ sơ & QR</button><button data-a="friends">🤝 Bạn bè & Chat</button><button data-a="ai">⚙ Cài đặt AI (API key/model)</button><button data-a="tts">🔊 Giọng đọc</button><button data-a="out">⎋ Đăng xuất</button></div>`; }
      else a.innerHTML = `<button class="acbtn" id="acbtn" aria-haspopup="true"><span class="guest-av">👤</span><span>${App.guest ? 'Khách' : 'Tài khoản'}</span></button><div class="dropmenu glass dark" id="drop" hidden><button data-a="login">🔑 Đăng nhập / Đăng ký</button><button data-a="ai">⚙ Cài đặt AI (API key/model)</button><button data-a="tts">🔊 Giọng đọc</button></div>`;
      const d = $('#drop'); $('#acbtn').onclick = e => { e.stopPropagation(); d.hidden = !d.hidden; }; document.onclick = () => { d.hidden = true; };
      $$('[data-a]', d).forEach(b => b.onclick = async () => { d.hidden = true; const k = b.dataset.a; if (k === 'profile') Social.profileModal(); else if (k === 'friends') App.go('forum', { tab: 'friends' }); else if (k === 'ai') Shell.aiSettings(); else if (k === 'tts') TTS.openSettings(); else if (k === 'login') { App.guest = false; App.go('auth', {}, { reset: true }); } else if (k === 'out') { Social.stop(); await Auth.logout(); Shell.setBadge(0); App.go('auth', {}, { reset: true }); } });
    },
    aiSettings() { const m = Modal.open({ title: 'Cài đặt AI — API key & model', wide: true, html: '<div id="kf"></div>' }); keyForm($('#kf', m.body), () => { m.close(); toast('Đã lưu cài đặt AI.', 'success'); }, true); }
  };

  // ---------- Form nhập API key + tải danh sách model ----------
  function keyForm(host, done, inModal) {
    let models = [], tested = false; const cur = AI.key;
    host.innerHTML = `<label>API key (lấy tại <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>)<div class="row"><input id="kk" type="password" autocomplete="off" spellcheck="false" placeholder="AIza..." value="${esc(cur)}"/><button class="btn ghost" id="kshow" type="button" aria-label="Hiện/ẩn key">👁</button></div></label>
      <div class="row wrap"><button class="btn primary" id="klist">📥 Tải danh sách model</button><span class="muted small" id="kstat"></span></div>
      <div id="mbox" hidden><input id="kq" placeholder="Lọc model (vd: flash, pro)…" aria-label="Lọc model"/><select id="ksel" size="7" aria-label="Danh sách model"></select><div class="muted small" id="kdesc"></div>
        <div class="row wrap"><button class="btn ghost" id="ktest">🔌 Kiểm tra kết nối</button><span id="kres" class="small"></span></div></div>
      <label class="check"><input type="checkbox" id="krem" ${LS.get('aic_key') || !cur ? 'checked' : ''}/> Ghi nhớ key trên thiết bị này (bỏ tick nếu dùng máy chung — key sẽ mất khi đóng tab)</label>
      <div class="row end">${inModal ? '' : ''}<button class="btn primary big" id="ksave" disabled>Lưu & tiếp tục →</button></div>
      <p class="muted small">🔒 Key của bạn chỉ lưu trong trình duyệt và gửi thẳng tới Google; website không lưu key trên máy chủ. Mỗi người dùng key riêng nên có hạn mức riêng.</p>`;
    const key = () => $('#kk', host).value.trim(), sel = $('#ksel', host);
    $('#kshow', host).onclick = () => { const i = $('#kk', host); i.type = i.type === 'password' ? 'text' : 'password'; };
    const fill = q => { const f = models.filter(m => (m.name + m.label).toLowerCase().includes((q || '').toLowerCase())); sel.innerHTML = f.map(m => `<option value="${esc(m.name)}" ${m.name === AI.model ? 'selected' : ''}>${esc(m.label)} — ${esc(m.name.replace('models/', ''))}</option>`).join(''); if (!sel.value && f[0]) sel.value = f[0].name; showDesc(); };
    const showDesc = () => { const m = models.find(x => x.name === sel.value); $('#kdesc', host).textContent = m ? `${m.desc.slice(0, 160)} ${m.inTok ? '· Đầu vào tối đa ' + m.inTok.toLocaleString('vi-VN') + ' token' : ''}` : ''; tested = false; $('#ksave', host).disabled = !(AI.ready && sel.value && key()); };
    $('#kq', host).oninput = e => fill(e.target.value); sel.onchange = showDesc;
    $('#klist', host).onclick = async () => {
      if (!key()) return toast('Hãy dán API key trước.', 'error'); const b = $('#klist', host); b.disabled = true; $('#kstat', host).textContent = 'Đang tải danh sách…';
      try { models = await AI.listModels(key()); if (!models.length) throw new Error('Key hợp lệ nhưng không có model nào dùng được.'); $('#mbox', host).hidden = false; if (!models.some(m => m.name === AI.model)) LS.set('aic_model', (models.find(m => /gemini-2\.5-flash$/.test(m.name)) || models.find(m => /flash/.test(m.name)) || models[0]).name); fill(''); $('#kstat', host).textContent = `✓ Tìm thấy ${models.length} model dùng được.`; }
      catch (e) { $('#kstat', host).innerHTML = `<span class="err">${esc(e.message)}</span>`; } b.disabled = false;
    };
    $('#ktest', host).onclick = async () => {
      const m = sel.value; if (!m) return toast('Hãy chọn một model.', 'error'); const r = $('#kres', host); r.textContent = 'Đang kiểm tra…'; $('#ktest', host).disabled = true;
      try { await AI.generate({ text: 'Trả lời đúng một từ: OK', maxTokens: 64, temperature: 0 }, key(), m); r.innerHTML = '<span class="okc">✓ Kết nối thành công!</span>'; tested = true; $('#ksave', host).disabled = false; }
      catch (e) { r.innerHTML = `<span class="err">✗ ${esc(e.message)}</span>`; tested = false; } $('#ktest', host).disabled = false;
    };
    $('#ksave', host).onclick = () => { if (!key()) return; AI.save(key(), sel.value || AI.model, $('#krem', host).checked); done(); };
    if (cur) { $('#klist', host).click(); }
  }

  // ---------- Màn hình nhập API key ----------
  App.reg('apikey', { nav: false, render(root) {
    Shell.build(); root.innerHTML = `<section class="gate"><div class="gate-card glass dark"><div class="center">${LOGO}<h1>AI CLASSROOM</h1><p class="slogan">Learn. Play. Solve. Level Up.</p></div>
      <h2>🔑 Kết nối AI của riêng bạn</h2><p>Trước khi bắt đầu, hãy nhập <b>API key từ Google AI Studio</b>. Mỗi bạn dùng key riêng để AI hoạt động ổn định và không ảnh hưởng nhau. Bạn có thể tải danh sách model để chọn model hợp với mình nhất.</p><div id="kf"></div>
      <div class="row center"><button class="btn ghost" id="noai">Tiếp tục không dùng AI (chỉ xem giao diện)</button></div></div></section>`;
    keyForm($('#kf', root), next); $('#noai', root).onclick = () => { SS.set('aic_noai', 1); next(); };
  } });

  // ---------- Welcome / Hero ----------
  App.reg('welcome', { nav: false, render(root) {
    root.innerHTML = `<section class="welcome"><div class="wl"><span class="eyebrow">BEYOND THE KNOWN UNIVERSE</span><h1>Mỗi con số mở ra một bí ẩn</h1>
      <p class="lead">Bước vào hành trình chinh phục những quy luật ngẫu nhiên, khám phá bí ẩn của dữ liệu và mở ra những chân trời tri thức mới cùng AI</p><p class="slogan">Learn. Play. Solve. Level Up.</p>
      <div class="row wrap"><button class="btn primary big" id="w1">Bắt đầu khám phá</button><button class="btn ghost big" id="w2">Tôi đã có tài khoản</button><button class="btn ghost big" id="w3">Tài khoản khách</button></div><button class="linkbtn" id="wskip">Bỏ qua giới thiệu →</button></div>
      <div class="wr"><div class="hero-die" id="hd">${Dice.cube(6, 120)}</div><div class="wcards"><div class="wc glass">🧠 Interactive Learning</div><div class="wc glass">🪜 Step-by-step Solutions</div><div class="wc glass">🎯 Smart Practice</div></div></div></section>`;
    LS.set('aic_welcome', 1); const hd = $('#hd', root); hd.classList.add('appear'); setTimeout(() => { const d = $('.die3d', hd); d && (d.style.transition = 'transform 2.2s cubic-bezier(.2,.8,.2,1)', d.style.transform = 'rotateX(-24deg) rotateY(-32deg)'); }, 100);
    $('#w1', root).onclick = () => App.go('auth', { tab: 'register' }); $('#w2', root).onclick = () => App.go('auth', { tab: 'login' }); $('#w3', root).onclick = guest; $('#wskip', root).onclick = () => App.go('auth', {});
  } });
  function guest() { App.guest = true; App.user = null; App.profile = null; Shell.drawAcct(); App.go('home', {}, { reset: true }); toast('Bạn đang dùng tài khoản khách: các tính năng AI dùng được, còn diễn đàn/kết bạn cần tài khoản thật.', 'info', 6000); }

  // ---------- Đăng nhập / đăng ký ----------
  App.reg('auth', { nav: false, render(root, p) {
    let tab = (p && p.tab) || 'login', busy = false;
    const draw = () => {
      root.innerHTML = `<section class="gate"><div class="gate-card glass dark"><button class="btn ghost back-btn" id="aback">← Quay lại</button><div class="center">${LOGO}<h1>AI CLASSROOM</h1><p class="slogan">Learn. Play. Solve. Level Up.</p></div>
        <div class="tabs"><button class="tab ${tab === 'login' ? 'on' : ''}" data-t="login">Đăng nhập</button><button class="tab ${tab === 'register' ? 'on' : ''}" data-t="register">Đăng ký</button></div>
        <div class="form"><label>Tên người dùng<input id="au" autocomplete="username" autocapitalize="none" maxlength="20" placeholder="vd: anbinh"/></label>
          <label>Mật khẩu<div class="row"><input id="ap" type="password" autocomplete="${tab === 'login' ? 'current-password' : 'new-password'}" placeholder="Ít nhất 6 ký tự"/><button type="button" class="btn ghost" id="apshow" aria-label="Hiện/ẩn mật khẩu">👁</button></div></label>
          ${tab === 'register' ? '<label>Xác nhận mật khẩu<input id="ap2" type="password" autocomplete="new-password"/></label>' : ''}
          <div class="err" id="aerr" role="alert"></div><button class="btn primary big full" id="ago">${tab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</button>
          <button class="linkbtn" id="aswitch">${tab === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}</button><button class="linkbtn" id="aguest">Dùng tài khoản khách</button>
          <p class="muted small">Mật khẩu được xử lý an toàn bởi hệ thống xác thực Supabase (không lưu dạng văn bản thuần, không lưu ở trình duyệt). Bạn sẽ nhận mã định danh dạng <code>@tên#1234</code>.</p></div></div></section>`;
      $$('[data-t]', root).forEach(b => b.onclick = () => { tab = b.dataset.t; draw(); }); $('#aswitch', root).onclick = () => { tab = tab === 'login' ? 'register' : 'login'; draw(); }; $('#aguest', root).onclick = guest;
      $('#aback', root).onclick = () => App.go(LS.get('aic_welcome') ? 'welcome' : 'apikey', {}, { replace: true });
      $('#apshow', root).onclick = () => { const i = $('#ap', root); i.type = i.type === 'password' ? 'text' : 'password'; };
      const go = async () => {
        if (busy) return; const u = $('#au', root).value.trim(), pw = $('#ap', root).value, err = $('#aerr', root); err.textContent = ''; busy = true; const b = $('#ago', root); b.disabled = true; b.textContent = 'Đang xử lý…';
        try { if (tab === 'login') await Auth.login(u, pw); else await Auth.register(u, pw, $('#ap2', root).value); toast('Xin chào ' + App.profile.username + '! 🎉', 'success'); afterLogin(); }
        catch (e) { err.textContent = e.message; b.disabled = false; b.textContent = tab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'; busy = false; }
      }; $('#ago', root).onclick = go; root.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    }; draw();
  } });
  async function afterLogin() {
    Shell.drawAcct(); Social.start(); Logs.pull(); App.go('home', {}, { reset: true });
    const pend = SS.get('aic_pending_u'); if (pend) { SS.del('aic_pending_u'); setTimeout(() => Social.openProfileSlug(pend), 600); }
  }

  // ---------- Trang chủ ----------
  App.reg('home', { render(root) {
    root.innerHTML = `<section class="hero"><span class="eyebrow">Nền Tảng Toán Xác Suất Thống Kê Chuẩn Đại Học</span><h1>Giải Toán &amp; Trực Quan Hóa<br/><span class="grad">Phân Phối Chuẩn &amp; Xác Suất</span></h1>
      <p class="lead">Tự động hỗ trợ giải bài tập, phân tích từng bước và giúp sinh viên hiểu rõ bản chất kiến thức Xác suất Thống kê thông qua trải nghiệm học tập trực quan, chủ động và dễ hiểu.</p>
      <div class="row wrap center"><button class="btn primary big" data-g="solve">Thử Bộ Giải Tự Động ✨</button><button class="btn ghost big" data-note="casio">Thử Bài Máy Casio 580</button></div>
      <div class="formula-strip rich" id="fs"></div></section>
      <section class="cards3 feat">
        <article class="glass fcard f1"><div class="ficon">🧮</div><h3>Giải bài – AI BUDDY – SOLVE</h3><p>Nhập đề, chụp ảnh hoặc tải tệp lên để nhận hướng dẫn giải bài tập Xác suất Thống kê từng bước.</p><button class="btn primary" data-g="solve">Bắt đầu giải bài</button></article>
        <article class="glass fcard f2"><div class="ficon">🎲</div><h3>Chơi trò chơi</h3><p>Củng cố kiến thức Xác suất Thống kê qua bản đồ trò chơi, các câu hỏi thử thách và hành trình chinh phục từng level.</p><button class="btn primary" data-g="games">Chơi ngay</button></article>
        <article class="glass fcard f3"><div class="ficon">📈</div><h3>Ôn tập</h3><p>Nhìn lại kiến thức đã học, nhận diện lỗi sai và khám phá những nội dung cần củng cố thêm.</p><button class="btn primary" data-g="review">Xem ôn tập</button></article></section>
      <section id="steps4" class="glass dark panel steps4"><h3>Quy trình giải toán 4 bước</h3><div class="s4">${[['1', 'Tìm hiểu nội dung bài toán', 'Xác định dữ kiện, yêu cầu; ký hiệu hóa đề.'], ['2', 'Xây dựng chương trình giải', 'Chọn kiến thức, công thức và phương pháp phù hợp.'], ['3', 'Trình bày lời giải', 'Lập luận logic, công thức tổng quát rồi thay số.'], ['4', 'Kiểm tra và nghiên cứu lời giải', 'Kiểm tra kết quả, cách giải khác, bài toán tương tự.']].map(x => `<div class="s4i"><span>${x[0]}</span><b>${x[1]}</b><small>${x[2]}</small></div>`).join('')}</div></section>`;
    $('#fs', root).innerHTML = [String.raw`P(A\mid B)=\frac{P(A\cap B)}{P(B)}`, String.raw`Z=\frac{X-\mu}{\sigma}`, String.raw`\bar{x}\pm z_{\alpha/2}\frac{\sigma}{\sqrt{n}}`].map(f => `<span class="fchip">${Rich.mathOnly(f)}</span>`).join('');
    $$('[data-g]', root).forEach(b => b.onclick = () => App.go(b.dataset.g)); $$('[data-note]', root).forEach(b => b.onclick = () => { const [t, m] = NOTICE[b.dataset.note]; Modal.open({ title: t, html: `<p>${esc(m)}</p>` }); });
  } });

  // ---------- Khởi động ----------
  async function next() {
    if (App.user) return afterLogin();
    if (!AI.ready && !SS.get('aic_noai')) return App.go('apikey', {}, { reset: true });
    if (!LS.get('aic_welcome')) return App.go('welcome', {}, { reset: true });
    App.go('auth', {}, { reset: true });
  }
  async function boot() {
    Shell.build(); Auth.init();
    const m = location.hash.match(/^#u\/(.+)$/); if (m) SS.set('aic_pending_u', m[1]);
    const ok = await Auth.restore(); if (ok) { if (!AI.ready && !SS.get('aic_noai')) return App.go('apikey', {}, { reset: true }); return afterLogin(); }
    next();
  }
  window.addEventListener('hashchange', () => { const m = location.hash.match(/^#u\/(.+)$/); if (m && App.user) Social.openProfileSlug(m[1]); });
  let booted = false; const once = () => { if (!booted) { booted = true; boot(); } }; document.addEventListener('DOMContentLoaded', once); if (document.readyState !== 'loading') once();
})();
