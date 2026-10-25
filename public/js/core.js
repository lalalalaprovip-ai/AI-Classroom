'use strict';
/* ===== CORE: tiện ích, lưu trữ, thông báo, hộp thoại, hiển thị công thức (KaTeX), điều hướng ===== */
(function () {
  const W = window;
  W.$ = (s, r = document) => r.querySelector(s);
  W.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  W.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  W.sleep = ms => new Promise(r => setTimeout(r, ms));
  W.rid = () => Math.random().toString(36).slice(2, 10);
  W.el = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  W.today = () => new Date().toISOString().slice(0, 10);

  // ---- Lưu trữ an toàn (localStorage có thể bị chặn) ----
  const mem = {};
  function store(kind) {
    return {
      get(k, d = null) { try { const v = window[kind].getItem(k); return v == null ? (k in mem ? mem[k] : d) : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } },
      set(k, v) { mem[k] = v; try { window[kind].setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
      del(k) { delete mem[k]; try { window[kind].removeItem(k); } catch (e) { } }
    };
  }
  W.LS = store('localStorage');
  W.SS = store('sessionStorage');

  // ---- Toast ----
  W.toast = (msg, type = 'info', ms = 3800) => {
    const box = $('#toasts'); if (!box) return;
    const t = el(`<div class="toast ${type}" role="status">${esc(msg)}</div>`);
    box.appendChild(t); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, ms);
  };

  // ---- Modal ----
  W.Modal = {
    open(o) {
      const back = el(`<div class="modal-back"><div class="modal glass ${o.wide ? 'wide' : ''}" role="dialog" aria-modal="true">
        <div class="modal-head"><h3>${esc(o.title || '')}</h3><button class="icon-btn" data-close aria-label="Đóng">✕</button></div><div class="modal-body"></div></div></div>`);
      const body = $('.modal-body', back);
      if (o.html) body.innerHTML = o.html; if (o.node) body.appendChild(o.node);
      let closed = false;
      const api = { el: back, body, close() { if (closed) return; closed = true; back.remove(); o.onClose && o.onClose(); } };
      back.addEventListener('mousedown', e => { if (e.target === back && !o.sticky) api.close(); });
      $('[data-close]', back).onclick = api.close;
      $('#modal-root').appendChild(back);
      return api;
    },
    confirm(title, msg, okText = 'Đồng ý') {
      return new Promise(res => {
        const m = Modal.open({ title, html: `<p>${esc(msg)}</p><div class="row end"><button class="btn ghost" data-no>Hủy</button><button class="btn primary" data-ok>${esc(okText)}</button></div>`, onClose: () => res(false) });
        $('[data-no]', m.body).onclick = () => m.close();
        $('[data-ok]', m.body).onclick = () => { res(true); m.close = () => m.el.remove(); m.el.remove(); };
      });
    }
  };

  // ---- Rich text: Markdown mini + KaTeX (render từng đoạn, không render lặp) ----
  const PH = (i) => '\uE000' + i + '\uE001', PHRE = /\uE000(\d+)\uE001/g;
  function mathHtml(tex, display) {
    try {
      return W.katex.renderToString(tex, { displayMode: display, throwOnError: true, output: 'htmlAndMathml', strict: 'ignore', trust: false });
    } catch (e) {
      const raw = display ? '\\[' + tex + '\\]' : '\\(' + tex + '\\)';
      return `<span class="math-warn" title="Công thức này cần kiểm tra">${esc(raw)} <b>⚠ cần kiểm tra</b></span>`;
    }
  }
  function extractMath(text, store) {
    const put = (tex, d) => { store.push(mathHtml(tex.trim(), d)); return PH(store.length - 1); };
    text = text.replace(/\\\[([\s\S]+?)\\\]/g, (m, a) => put(a, true));
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (m, a) => put(a, true));
    text = text.replace(/\\\(([\s\S]+?)\\\)/g, (m, a) => put(a, false));
    // $...$ chỉ coi là công thức khi nội dung không bắt đầu/kết thúc bằng khoảng trắng và không phải tiền/số trơn
    text = text.replace(/(^|[^\\$\w])\$(?!\s)([^$\n]+?)(?<!\s)\$(?![\w$])/g, (m, pre, a) => /^[\d.,\s]+$/.test(a) ? m : pre + put(a, false));
    return text;
  }
  function inline(s) {
    return s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<i>$2</i>');
  }
  function mdToHtml(text) {
    const lines = text.split('\n'); const out = []; let list = null, para = [], table = [];
    const flushP = () => { if (para.length) { out.push('<p>' + inline(para.join('<br>')) + '</p>'); para = []; } };
    const flushL = () => { if (list) { out.push(`</${list}>`); list = null; } };
    const flushT = () => {
      if (!table.length) return;
      const rows = table.filter(r => !/^\s*\|?\s*:?-{2,}/.test(r)).map(r => r.replace(/^\s*\||\|\s*$/g, '').split('|').map(c => c.trim()));
      out.push('<div class="tbl-wrap"><table>' + rows.map((r, i) => '<tr>' + r.map(c => `<${i ? 'td' : 'th'}>${inline(c)}</${i ? 'td' : 'th'}>`).join('') + '</tr>').join('') + '</table></div>'); table = [];
    };
    for (const raw of lines) {
      const ln = raw.replace(/\s+$/, '');
      if (/^\s*\|.*\|\s*$/.test(ln)) { flushP(); flushL(); table.push(ln); continue; } else flushT();
      let m;
      if (!ln.trim()) { flushP(); flushL(); continue; }
      if ((m = ln.match(/^(#{1,4})\s+(.*)$/))) { flushP(); flushL(); out.push(`<h${m[1].length + 2}>${inline(m[2])}</h${m[1].length + 2}>`); continue; }
      if ((m = ln.match(/^\s*[-*•]\s+(.*)$/))) { flushP(); if (list !== 'ul') { flushL(); out.push('<ul>'); list = 'ul'; } out.push('<li>' + inline(m[1]) + '</li>'); continue; }
      if ((m = ln.match(/^\s*\d+[.)]\s+(.*)$/))) { flushP(); if (list !== 'ol') { flushL(); out.push('<ol>'); list = 'ol'; } out.push('<li>' + inline(m[1]) + '</li>'); continue; }
      if ((m = ln.match(/^&gt;\s?(.*)$/))) { flushP(); flushL(); out.push('<blockquote>' + inline(m[1]) + '</blockquote>'); continue; }
      flushL(); para.push(ln);
    }
    flushP(); flushL(); flushT(); return out.join('');
  }
  W.Rich = {
    // Trả về HTML an toàn. Thứ tự: tách công thức → escape → markdown → làm sạch → ghép công thức đã render.
    html(text) {
      text = String(text == null ? '' : text);
      const codes = [], maths = [];
      text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (m, l, c) => { codes.push(c); return '\uE002' + (codes.length - 1) + '\uE003'; });
      text = extractMath(text, maths);
      let html = mdToHtml(esc(text));
      html = W.DOMPurify ? W.DOMPurify.sanitize(html, { ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'code', 'pre', 'ul', 'ol', 'li', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'table', 'tr', 'td', 'th', 'div', 'span'], ALLOWED_ATTR: ['class'] }) : html;
      html = html.replace(PHRE, (m, i) => maths[+i]);
      html = html.replace(/\uE002(\d+)\uE003/g, (m, i) => `<pre><code>${esc(codes[+i])}</code></pre>`);
      return html;
    },
    into(node, text) { node.innerHTML = Rich.html(text); },
    // Kiểm tra LaTeX hợp lệ (dùng cho giọng nói)
    valid(tex) { try { W.katex.renderToString(tex, { throwOnError: true, strict: 'ignore' }); return true; } catch (e) { return false; } },
    mathOnly(tex, display) { return mathHtml(tex, !!display); }
  };

  // ---- Chèn tại vị trí con trỏ ----
  W.insertAtCaret = (ta, str) => {
    const s = ta.selectionStart ?? ta.value.length, e = ta.selectionEnd ?? ta.value.length;
    ta.value = ta.value.slice(0, s) + str + ta.value.slice(e);
    const p = s + str.length; ta.focus(); try { ta.setSelectionRange(p, p); } catch (x) { }
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  };

  // ---- Hàm số học dùng chung (không phụ thuộc thư viện ngoài) ----
  W.NM = {
    erf(x) { const a = Math.abs(x); let r; if (a < 3) { let t = a, s = a; for (let n = 1; n < 80; n++) { t *= -a * a / n; s += t / (2 * n + 1); } r = 2 / Math.sqrt(Math.PI) * s; } else r = 1 - Math.exp(-a * a) / (a * Math.sqrt(Math.PI)) * (1 - 1 / (2 * a * a) + 3 / (4 * a ** 4)); return x < 0 ? -r : r; },
    lnC(n, k) { let r = 0; for (let i = 1; i <= k; i++) r += Math.log(n - k + i) - Math.log(i); return r; },
    binom(k, n, p) { if (k < 0 || k > n) return 0; return Math.exp(NM.lnC(n, k) + (k ? k * Math.log(p) : 0) + ((n - k) ? (n - k) * Math.log(1 - p) : 0)); },
    pois(k, l) { if (k < 0) return 0; let g = 0; for (let i = 2; i <= k; i++) g += Math.log(i); return Math.exp(-l + k * Math.log(l) - g); },
    Phi(z) { return 0.5 * (1 + NM.erf(z / Math.SQRT2)); }
  };

  // ---- Router đơn giản có nút Quay lại ----
  W.App = {
    views: {}, stack: [], cur: null, curView: null, user: null, profile: null, guest: false,
    reg(name, v) { this.views[name] = v; },
    go(name, params = {}, opts = {}) {
      const v = this.views[name]; if (!v) { toast('Màn hình "' + name + '" chưa có.', 'error'); return; }
      if (this.curView && this.curView.destroy) { try { this.curView.destroy(); } catch (e) { } }
      if (W.TTS) TTS.stop();
      if (this.cur && !opts.replace && this.cur.name !== name) this.stack.push(this.cur);
      if (opts.reset) this.stack = [];
      this.cur = { name, params }; this.curView = v;
      document.body.dataset.view = name;
      if (W.Shell) Shell.update(v);
      const root = $('#view') || $('#app'); root.innerHTML = ''; root.scrollTop = 0; window.scrollTo(0, 0);
      v.render(root, params);
    },
    back() {
      const prev = this.stack.pop();
      if (prev) this.go(prev.name, prev.params, { replace: true }); else this.go('home', {}, { replace: true });
    }
  };
  W.backBtn = (label = '← Quay lại') => `<button class="btn ghost back-btn" data-back>${label}</button>`;
  document.addEventListener('click', e => { const b = e.target.closest('[data-back]'); if (b) { e.preventDefault(); if (b.dataset.back === 'home') App.go('home', {}, { reset: true }); else App.back(); } });
})();
