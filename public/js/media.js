'use strict';
/* ===== MEDIA: camera, xử lý ảnh, xem ảnh phóng to, thanh ký hiệu toán, xem trước công thức ===== */
(function () {
  // ---------- Ảnh ----------
  window.Img = {
    async load(blob) {
      try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); }
      catch (e) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Không đọc được ảnh (định dạng chưa được trình duyệt hỗ trợ).')); i.src = URL.createObjectURL(blob); }); }
    },
    // Thu nhỏ + nén; có thể xoay (độ) và cắt (tỉ lệ 0..1: l,t,r,b = phần cắt bỏ mỗi cạnh)
    async process(blob, { max = 1600, q = .85, rotate = 0, crop = null } = {}) {
      let im; try { im = await Img.load(blob); } catch (e) { return blob; }
      let sw = im.width, sh = im.height, sx = 0, sy = 0;
      if (crop) { sx = sw * crop.l; sy = sh * crop.t; sw = sw * (1 - crop.l - crop.r); sh = sh * (1 - crop.t - crop.b); }
      const k = Math.min(1, max / Math.max(sw, sh)); let dw = Math.max(1, Math.round(sw * k)), dh = Math.max(1, Math.round(sh * k));
      const turn = ((rotate % 360) + 360) % 360, c = document.createElement('canvas');
      c.width = turn % 180 ? dh : dw; c.height = turn % 180 ? dw : dh; const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.translate(c.width / 2, c.height / 2); g.rotate(turn * Math.PI / 180);
      g.drawImage(im, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
      return new Promise(r => c.toBlob(b => r(b || blob), 'image/jpeg', q));
    },
    b64(blob) { return new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(String(f.result).split(',')[1]); f.onerror = rej; f.readAsDataURL(blob); }); },
    url(blob) { return URL.createObjectURL(blob); },
    async upload(blob) {
      if (!Auth.sb || !App.user) throw new Error('Cần đăng nhập để tải ảnh lên.');
      const small = await Img.process(blob, { max: 1400, q: .82 });
      const path = App.user.id + '/' + Date.now() + '_' + rid() + '.jpg';
      const { error } = await Auth.sb.storage.from('images').upload(path, small, { contentType: 'image/jpeg', upsert: false });
      if (error) throw new Error('Tải ảnh thất bại: ' + error.message + ' (đã chạy supabase/schema.sql chưa?)');
      return Auth.sb.storage.from('images').getPublicUrl(path).data.publicUrl;
    },
    fromClipboard(e) { const items = (e.clipboardData && e.clipboardData.items) || []; for (const it of items) if (it.type.startsWith('image/')) return it.getAsFile(); return null; }
  };

  // ---------- Xem ảnh phóng to ----------
  window.Lightbox = {
    open(url) {
      let rot = 0; const m = Modal.open({ title: 'Xem ảnh', wide: true, html: `<div class="lb"><img src="${esc(url)}" alt="Ảnh phóng to"/></div><div class="row end"><button class="btn ghost" data-rot>⟳ Xoay</button><a class="btn ghost" data-dl>⬇ Tải về</a></div>` });
      const img = $('img', m.body); $('[data-rot]', m.body).onclick = () => { rot = (rot + 90) % 360; img.style.transform = `rotate(${rot}deg)`; };
      $('[data-dl]', m.body).onclick = async e => { e.preventDefault(); try { const b = await (await fetch(url)).blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'anh-ai-classroom.jpg'; a.click(); } catch (x) { window.open(url, '_blank'); } };
    }
  };

  // ---------- Camera ----------
  window.Camera = {
    open(opts = {}) {
      return new Promise(resolve => {
        let stream = null, facing = 'environment', done = false, shot = null, track = null, torch = false;
        const finish = v => { if (done) return; done = true; stop(); resolve(v); };
        const stop = () => { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; };
        const m = Modal.open({
          title: opts.title || 'Chụp ảnh', wide: true, sticky: true, onClose: () => finish(null),
          html: `<div class="cam"><video playsinline autoplay muted></video><img class="cam-shot" hidden alt="Ảnh vừa chụp"/><div class="cam-frame"></div></div>
          <p class="muted small cam-msg"></p>
          <div class="row wrap center">
            <button class="btn primary big" data-shoot>📸 Chụp</button>
            <button class="btn ghost" data-retake hidden>↺ Chụp lại</button>
            <button class="btn ok" data-use hidden>✓ Dùng ảnh này</button>
            <button class="btn ghost" data-flip>🔄 Đổi camera</button>
            <button class="btn ghost" data-torch hidden>🔦 Đèn</button>
            <label class="btn ghost">🖼 Chọn từ máy<input type="file" accept="image/*" capture="environment" hidden data-file/></label>
          </div><p class="muted small">Mẹo: chụp đủ sáng, chụp thẳng, lấy trọn đề. Chỉ chụp bài tập, tránh chụp thông tin cá nhân.</p>`
        });
        const v = $('video', m.body), msg = $('.cam-msg', m.body), shotImg = $('.cam-shot', m.body);
        const set = t => msg.textContent = t || '';
        async function start() {
          stop();
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { set(location.protocol === 'http:' && location.hostname !== 'localhost' ? 'Trình duyệt chỉ cho dùng camera trên HTTPS. Trang Netlify của bạn đã có HTTPS; còn nếu mở file trực tiếp, hãy dùng nút "Chọn từ máy".' : 'Thiết bị/trình duyệt này không hỗ trợ camera. Hãy dùng nút "Chọn từ máy".'); return; }
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
            v.srcObject = stream; track = stream.getVideoTracks()[0]; const caps = track.getCapabilities ? track.getCapabilities() : {};
            $('[data-torch]', m.body).hidden = !caps.torch; set('');
          } catch (e) {
            const n = e && e.name; set(n === 'NotAllowedError' ? 'Bạn đã từ chối quyền camera. Bấm biểu tượng 🔒 cạnh thanh địa chỉ → Cho phép Camera → tải lại, hoặc dùng "Chọn từ máy".' : n === 'NotFoundError' ? 'Không tìm thấy camera. Hãy dùng "Chọn từ máy".' : 'Không mở được camera: ' + (e && e.message));
          }
        }
        $('[data-shoot]', m.body).onclick = () => {
          if (!stream || !v.videoWidth) return toast('Camera chưa sẵn sàng.', 'error');
          const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0);
          c.toBlob(b => { shot = b; shotImg.src = URL.createObjectURL(b); shotImg.hidden = false; v.hidden = true; $('[data-shoot]', m.body).hidden = true; $('[data-retake]', m.body).hidden = false; $('[data-use]', m.body).hidden = false; }, 'image/jpeg', .92);
        };
        $('[data-retake]', m.body).onclick = () => { shot = null; shotImg.hidden = true; v.hidden = false; $('[data-shoot]', m.body).hidden = false; $('[data-retake]', m.body).hidden = true; $('[data-use]', m.body).hidden = true; };
        $('[data-use]', m.body).onclick = () => { const b = shot; finish(b); m.el.remove(); };
        $('[data-flip]', m.body).onclick = () => { facing = facing === 'environment' ? 'user' : 'environment'; start(); };
        $('[data-torch]', m.body).onclick = async () => { try { torch = !torch; await track.applyConstraints({ advanced: [{ torch }] }); } catch (e) { toast('Thiết bị không bật được đèn.', 'error'); } };
        $('[data-file]', m.body).onchange = e => { const f = e.target.files[0]; if (f) { finish(f); m.el.remove(); } };
        start();
      });
    }
  };

  // ---------- Thanh ký hiệu toán (9 nhóm theo bảng 4.6) ----------
  const R = String.raw;
  const G = [
    ['Cơ bản', [[R`\frac{a}{b}`], [R`\sqrt{x}`], [R`x^2`], [R`x_i`], [R`\sum`], [R`\int`], [R`\le`], [R`\ge`], [R`\ne`], [R`\approx`], [R`\pm`]]],
    ['Xác suất', [[R`P(A)`], [R`P(A\mid B)`], [R`A\cap B`, R`\cap`], [R`A\cup B`, R`\cup`], [R`\overline{A}`]]],
    ['Biến ngẫu nhiên', [[R`X`], [R`f(x)`], [R`F(x)`], [R`E(X)`], [R`\operatorname{Var}(X)`], [R`\sigma`], [R`\sigma^2`]]],
    ['Phân phối', [[R`B(n,p)`], [R`\mathcal{P}(\lambda)`], [R`H(N,M,n)`], [R`N(\mu,\sigma^2)`], [R`N(0,1)`], [R`T(n)`], [R`\chi^2(n)`], [R`F(n_1,n_2)`]]],
    ['Mẫu', [[R`\bar{x}`], [R`s^2`], [R`\hat{s}^2`], [R`s`, R`s`, 'độ lệch chuẩn mẫu'], [R`\hat{p}`]]],
    ['Ước lượng – kiểm định', [[R`H_0`], [R`H_1`], [R`\alpha`], [R`\beta`], [R`\text{giá trị }p`, R`p\text{-value}`], [R`W_\alpha`], [R`z_{\alpha/2}`], [R`t_{\alpha}(n)`]]],
    ['So sánh hai tham số', [[R`\mu_1-\mu_2`], [R`p_1-p_2`], [R`\frac{\sigma_1^2}{\sigma_2^2}`]]],
    ['Hàm Laplace, chuẩn tắc', [[R`\Phi(z)=P(Z\le z)`, R`\Phi(z)`], [R`\varphi(z)`], [R`\Phi_0(z)`]]],
    ['Hy Lạp thường dùng', ['alpha', 'beta', 'gamma', 'delta', 'varepsilon', 'theta', 'lambda', 'mu', 'nu', 'pi', 'rho', 'sigma', 'tau', 'varphi', 'chi', 'omega'].map(n => ['\\' + n])]
  ];
  window.MathBar = {
    groups: G,
    mount(host, ta, opts = {}) {
      let page = 0;
      host.classList.add('mathbar');
      host.innerHTML = `<div class="mb-head"><button type="button" class="icon-btn" data-prev aria-label="Trang trước">‹</button><span class="mb-title"></span><button type="button" class="icon-btn" data-next aria-label="Trang sau">›</button></div><div class="mb-keys"></div>`;
      const keys = $('.mb-keys', host), title = $('.mb-title', host);
      const draw = () => {
        title.textContent = `Trang ${page + 1}/${G.length}: ${G[page][0]}`; keys.innerHTML = '';
        G[page][1].forEach(([show, tex, tip]) => {
          const b = el(`<button type="button" class="mk" title="${esc(tip || tex || show)}">${Rich.mathOnly(show, false)}</button>`);
          b.onmousedown = e => e.preventDefault();
          b.onclick = () => insertAtCaret(ta, '\\(' + (tex || show) + '\\)');
          keys.appendChild(b);
        });
      };
      $('[data-prev]', host).onclick = () => { page = (page + G.length - 1) % G.length; draw(); };
      $('[data-next]', host).onclick = () => { page = (page + 1) % G.length; draw(); };
      draw();
    }
  };
  // Xem trước công thức thời gian thực
  window.Preview = {
    bind(ta, box, opts = {}) {
      let t; const upd = () => { const v = ta.value.trim(); if (!v) { box.innerHTML = '<span class="muted">Xem trước công thức sẽ hiện ở đây…</span>'; return; } Rich.into(box, v); };
      ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(upd, 120); }); upd(); return upd;
    }
  };
})();
