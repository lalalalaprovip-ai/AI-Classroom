'use strict';
/* ===== CHATBOT AI: nút nổi góc phải dưới, có mặt ở mọi trang sau khi vào web ===== */
(function () {
  const hist = SS.get('aic_chat', []);   // lịch sử trong phiên
  let box, fab, open = false, busy = false, abort = null, pendingImg = null, size = 'normal';
  const save = () => SS.set('aic_chat', hist.slice(-30));
  const FALLBACK = 'Mình chưa có API key của bạn nên chưa thể trả lời bằng AI thật. Hãy bấm ⚙ để nhập API key từ Google AI Studio nhé. (Mình không giả vờ là AI khi chưa kết nối.)';

  function msgEl(role, text) {
    const d = el(`<div class="msg ${role}"><div class="bub rich"></div>${role === 'bot' ? '<div class="mtools no-speak"><button class="btn small ghost" data-listen aria-label="Nghe câu trả lời">🔊 Nghe</button><button class="btn small ghost" data-copy>📋</button></div>' : ''}</div>`);
    const b = $('.bub', d); if (role === 'user') b.textContent = text; else Rich.into(b, text);
    if (role === 'bot') { $('[data-listen]', d).onclick = () => TTS.toggleEl(b); $('[data-copy]', d).onclick = () => navigator.clipboard && navigator.clipboard.writeText(b.innerText).then(() => toast('Đã sao chép.', 'success')); }
    return d;
  }
  function build() {
    fab = el(`<button class="fab-chat" aria-label="Mở Chatbot AI" title="Hỏi AI Buddy"><span class="fab-orb"></span><span class="fab-t">🤖</span></button>`);
    box = el(`<section class="chatbox glass dark" hidden aria-label="Chatbot AI">
      <header><div class="who"><b>AI Buddy</b><small>Bạn học Toán của bạn</small></div>
        <div class="hbtns"><button class="icon-btn" data-set title="Cài đặt AI / giọng đọc">⚙</button><button class="icon-btn" data-clear title="Cuộc trò chuyện mới">🗑</button><button class="icon-btn" data-size title="Phóng to / thu nhỏ">⤢</button><button class="icon-btn" data-min title="Thu nhỏ">—</button><button class="icon-btn" data-x title="Đóng">✕</button></div></header>
      <div class="msgs" aria-live="polite"></div>
      <div class="cinput"><div id="cmb"></div><div id="cprev" class="chatimg" hidden></div>
        <div class="crow"><textarea rows="1" placeholder="Hỏi bất kỳ điều gì về Toán…" aria-label="Tin nhắn"></textarea>
          <button class="icon-btn" data-img title="Đính kèm ảnh">🖼</button><button class="icon-btn" data-cam title="Chụp ảnh">📷</button>
          <button type="button" class="mic sm" data-mic><span class="mic-ico">🎤</span><span class="mic-label"></span></button><button class="btn primary" data-send>Gửi ➤</button></div>
        <input type="file" accept="image/*" hidden data-file/></div></section>`);
    document.body.append(fab, box);
    const msgs = $('.msgs', box), ta = $('textarea', box);
    if (!hist.length) msgs.appendChild(msgEl('bot', 'Chào bạn! Mình là AI Buddy 👋 Bạn cứ hỏi mình bất kỳ câu Toán nào (xác suất, thống kê, đại số, giải tích…). Bạn có thể gõ, nói bằng micro, hoặc gửi ảnh nhé.'));
    hist.forEach(h => msgs.appendChild(msgEl(h.role === 'user' ? 'user' : 'bot', h.text)));
    MathBar.mount($('#cmb', box), ta); Voice.attach({ button: $('[data-mic]', box), textarea: ta, host: $('.cinput', box) });
    fab.onclick = () => toggle(true); $('[data-x]', box).onclick = () => toggle(false); $('[data-min]', box).onclick = () => toggle(false);
    $('[data-size]', box).onclick = () => { size = size === 'normal' ? 'big' : 'normal'; box.classList.toggle('big', size === 'big'); };
    $('[data-set]', box).onclick = () => Shell.aiSettings(); $('[data-clear]', box).onclick = () => { hist.length = 0; save(); msgs.innerHTML = ''; msgs.appendChild(msgEl('bot', 'Mình đã làm mới cuộc trò chuyện. Bạn muốn hỏi gì tiếp nào?')); };
    $('[data-send]', box).onclick = send; ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; });
    const setImg = async b => { pendingImg = await Img.process(b, { max: 1400 }); const p = $('#cprev', box); p.hidden = false; p.innerHTML = `<img src="${Img.url(pendingImg)}" alt="Ảnh đính kèm"/><button class="icon-btn" data-rm>✕</button>`; $('[data-rm]', p).onclick = () => { pendingImg = null; p.hidden = true; }; };
    $('[data-img]', box).onclick = () => $('[data-file]', box).click(); $('[data-file]', box).onchange = e => e.target.files[0] && setImg(e.target.files[0]);
    $('[data-cam]', box).onclick = async () => { const b = await Camera.open({ title: 'Chụp ảnh gửi AI Buddy' }); if (b) setImg(b); };
    ta.addEventListener('paste', e => { const f = Img.fromClipboard(e); if (f) { e.preventDefault(); setImg(f); } });
  }
  function toggle(v) { open = v; box.hidden = !v; fab.classList.toggle('hide', v); if (v) { $('textarea', box).focus(); const m = $('.msgs', box); m.scrollTop = m.scrollHeight; } }
  async function send() {
    if (busy) return; const ta = $('textarea', box), text = ta.value.trim(); if (!text && !pendingImg) return;
    const msgs = $('.msgs', box); TTS.stop(); msgs.appendChild(msgEl('user', text || '(ảnh)')); ta.value = ''; ta.style.height = 'auto';
    if (!AI.ready) { msgs.appendChild(msgEl('bot', FALLBACK)); msgs.scrollTop = msgs.scrollHeight; return; }
    const botEl = msgEl('bot', ''), bub = $('.bub', botEl); bub.innerHTML = '<span class="typing"><i></i><i></i><i></i></span> <span class="muted">đang trả lời…</span>'; msgs.appendChild(botEl); msgs.scrollTop = msgs.scrollHeight;
    busy = true; abort = new AbortController(); $('[data-send]', box).disabled = true;
    try {
      const parts = []; if (pendingImg) { parts.push(await AI.imgPart(pendingImg)); } parts.push({ text: text || 'Hãy đọc ảnh này và hỗ trợ mình về bài toán trong ảnh (chép lại đề bằng LaTeX trước, nếu chưa rõ thì hỏi lại).' });
      const history = hist.slice(-16); pendingImg = null; $('#cprev', box).hidden = true; let last = 0;
      const full = await AI.stream({ system: AI.prompts.chat, history, parts, temperature: .6, signal: abort.signal }, (d, f) => { const n = Date.now(); if (n - last > 120) { last = n; Rich.into(bub, f); msgs.scrollTop = msgs.scrollHeight; } });
      Rich.into(bub, full); hist.push({ role: 'user', text: text || '(ảnh)' }, { role: 'model', text: full }); save(); msgs.scrollTop = msgs.scrollHeight; TTS.maybeAuto(bub);
      if (/(Giải Đề Ngay|AI BUDDY)/i.test(full)) { }
    } catch (e) { if (e.name !== 'AbortError') bub.innerHTML = `<div class="notice warn">${esc(e.message)}</div>`; }
    finally { busy = false; $('[data-send]', box).disabled = false; }
  }
  window.Chatbot = {
    show() { if (!box) build(); fab.hidden = false; if (!open) fab.classList.remove('hide'); },
    hide() { if (box) { box.hidden = true; fab.hidden = true; open = false; } },
    ask(text, img) { this.show(); toggle(true); $('textarea', box).value = text; $('textarea', box).focus(); }
  };
})();
