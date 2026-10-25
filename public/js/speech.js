'use strict';
/* ===== SPEECH: micro (nghe liên tục, chỉ tắt khi người dùng bấm tắt) + đọc to tiếng Việt chuẩn công thức ===== */
(function () {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  // ================= MICRO (STT) =================
  const Voice = window.Voice = {
    supported: !!SR, last: null,
    // opts: { button, textarea, host, onChange }
    attach(opts) {
      const ta = opts.textarea, btn = opts.button;
      btn.setAttribute('aria-label', 'Micro: bấm một lần để bắt đầu, bấm lần nữa để dừng (Ctrl+Shift+M)'); btn.title = 'Nói để nhập đề (Ctrl+Shift+M)';
      const panel = el(`<div class="voice-panel glass" hidden>
        <div class="vp-top"><span class="vp-dot"></span><b class="vp-status" aria-live="polite"></b><span class="vp-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div>
        <div class="vp-live"><span class="fin"></span><span class="int"></span></div>
        <div class="vp-result" hidden>
          <label class="small muted">Văn bản đã chuyển (công thức dạng LaTeX) — bạn có thể sửa:</label>
          <textarea rows="3"></textarea><div class="vp-prev rich"></div><div class="vp-flags"></div>
          <div class="row wrap"><button type="button" class="btn ghost" data-edit>✏️ Sửa</button><button type="button" class="btn ghost" data-read>🔊 Đọc lại</button><button type="button" class="btn ok" data-accept>✓ Chấp nhận</button><button type="button" class="btn ghost" data-cancel>✕ Hủy</button></div>
        </div></div>`);
      (opts.host || ta.parentElement).appendChild(panel);
      const $s = s => $(s, panel), live = $s('.vp-live'), fin = $s('.fin'), int = $s('.int'), status = $s('.vp-status'), res = $s('.vp-result'), rta = $('textarea', res), rprev = $s('.vp-prev');
      let rec = null, want = false, finals = [], caret = 0, netErr = 0, dirty = false, mr = null, chunks = [], refineTok = 0;
      const label = btn.querySelector('.mic-label');
      const setUI = on => { btn.classList.toggle('listening', on); btn.setAttribute('aria-pressed', on); if (label) label.textContent = on ? 'Đang nghe…' : ''; panel.classList.toggle('on', on); };
      const showRes = raw => {
        const r = MS.speechToMath(raw); rta.value = r.text; dirty = false; res.hidden = false; live.hidden = true; status.textContent = 'Đã dừng. Kiểm tra lại rồi bấm "Chấp nhận".';
        const upd = () => Rich.into(rprev, rta.value); upd(); rta.oninput = () => { dirty = true; upd(); };
        const fl = $s('.vp-flags'); fl.innerHTML = '';
        r.flags.forEach(f => { const w = el(`<div class="flag">⚠ Mình chưa chắc ký hiệu này: ${f.options.map(o => `<button type="button" class="chip" data-o="${esc(o)}">${Rich.mathOnly(o, false)}</button>`).join('')}</div>`); w.onclick = e => { const b = e.target.closest('[data-o]'); if (!b) return; rta.value = rta.value.split(f.tex).join(b.dataset.o); dirty = true; upd(); w.remove(); }; fl.appendChild(w); });
        if (r.invalid.length) fl.appendChild(el(`<div class="flag warn">Chưa chuyển được công thức này, bạn kiểm tra lại giúp nhé.</div>`));
        // Tầng 2: AI chuẩn hóa theo ngữ cảnh (nếu có API key). Chỉ thay khi LaTeX hợp lệ và người dùng chưa sửa tay.
        if (AI.ready && raw.trim().length > 3) {
          const tok = ++refineTok; status.textContent = 'Đã dừng. AI đang chuẩn hóa công thức…';
          AI.generate({ system: AI.prompts.speech2math, text: raw, temperature: 0, maxTokens: 600 }).then(out => {
            if (tok !== refineTok || dirty) return; const clean = out.replace(/\n?NGHI NGỜ:[\s\S]*$/i, '').trim();
            const maths = [...clean.matchAll(/\\\(([\s\S]+?)\\\)/g)].map(m => m[1]);
            if (clean && !/\[\?\]/.test(clean) && maths.every(Rich.valid)) { rta.value = clean; upd(); }
            status.textContent = 'Đã dừng. Kiểm tra lại rồi bấm "Chấp nhận".';
          }).catch(() => { status.textContent = 'Đã dừng. Kiểm tra lại rồi bấm "Chấp nhận".'; });
        }
      };
      function begin() {
        finals = []; fin.textContent = ''; int.textContent = ''; live.hidden = false; res.hidden = true; caret = ta.selectionStart ?? ta.value.length; netErr = 0; panel.hidden = false;
        want = true; setUI(true); status.textContent = 'Đang nghe… (micro vẫn bật cho tới khi bạn bấm tắt)';
        if (SR) startSR(); else startRecorder();
      }
      function startSR() {
        rec = new SR(); rec.lang = 'vi-VN'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
        rec.onresult = e => {
          let interim = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i], tx = r[0].transcript.trim();
            if (r.isFinal) { if (tx && finals[finals.length - 1] !== tx) handleFinal(tx); } else interim += r[0].transcript;
          }
          fin.textContent = finals.join(' ') + ' '; int.textContent = interim;
        };
        rec.onerror = e => {
          if (e.error === 'no-speech' || e.error === 'aborted') return;
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { want = false; fail('Bạn chưa cho phép micro. Bấm biểu tượng 🔒 cạnh thanh địa chỉ → Cho phép Micro → tải lại trang. (Micro chỉ chạy trên HTTPS.)'); }
          else if (e.error === 'audio-capture') { want = false; fail('Không tìm thấy micro. Hãy kiểm tra thiết bị âm thanh.'); }
          else if (e.error === 'network') { if (++netErr > 4) { want = false; fail('Mất kết nối dịch vụ nhận dạng giọng nói. Hãy kiểm tra mạng hoặc gõ phím.'); } }
        };
        rec.onend = () => { if (want) setTimeout(() => { if (!want) return; try { rec.start(); } catch (x) { startSR(); } }, 200); else setUI(false); };   // tự khởi động lại, KHÔNG tự ngắt
        try { rec.start(); } catch (x) { fail('Không bật được micro: ' + x.message); }
      }
      async function startRecorder() {
        try {
          const st = await navigator.mediaDevices.getUserMedia({ audio: true }); chunks = []; mr = new MediaRecorder(st);
          mr.ondataavailable = e => e.data.size && chunks.push(e.data);
          mr.onstop = async () => { st.getTracks().forEach(t => t.stop()); const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' }); if (!AI.ready) return fail('Trình duyệt này chưa hỗ trợ nhận dạng giọng nói trực tiếp. Hãy dùng Chrome/Edge/Safari bản mới, hoặc gõ phím / chụp ảnh đề.'); status.textContent = 'AI đang chuyển giọng nói thành chữ…'; try { const tx = await AI.transcribe(blob); finals = [tx]; setUI(false); showRes(tx); } catch (e) { fail(e.message); } };
          mr.start();
        } catch (e) { fail(e && e.name === 'NotAllowedError' ? 'Bạn chưa cho phép micro (cần HTTPS và quyền micro).' : 'Không mở được micro: ' + (e && e.message)); }
      }
      function handleFinal(tx) {
        const c = tx.toLowerCase().replace(/[.,!?]/g, '').trim();
        if (c === 'xuống dòng') finals.push('\n'); else if (c === 'xóa câu vừa rồi' || c === 'hoàn tác') finals.pop();
        else if (c === 'dừng ghi âm') stop(); else if (c === 'đọc lại') TTS.speakText(finals.join(' ')); else finals.push(tx);
      }
      function stop() {
        want = false; const tail = int.textContent.trim(); setUI(false);
        try { if (rec) rec.stop(); } catch (e) { } if (mr && mr.state !== 'inactive') { mr.stop(); return; }
        const raw = (finals.join(' ') + (tail ? ' ' + tail : '')).replace(/ \n /g, '\n').trim();
        if (!raw) { panel.hidden = true; toast('Mình chưa nghe thấy gì. Bạn thử nói lại nhé.', 'info'); return; }
        showRes(raw);
      }
      function fail(msg) { setUI(false); status.textContent = ''; toast(msg, 'error', 7000); if (!finals.length) panel.hidden = true; }
      btn.addEventListener('click', e => { e.preventDefault(); want ? stop() : begin(); });
      $s('[data-edit]').onclick = () => rta.focus();
      $s('[data-read]').onclick = () => TTS.speakText(rta.value);
      $s('[data-cancel]').onclick = () => { refineTok++; panel.hidden = true; };
      $s('[data-accept]').onclick = () => {
        refineTok++; const txt = rta.value.trim(); if (!txt) return; const cur = ta.value, p = Math.min(caret, cur.length);
        const pre = cur.slice(0, p), sep = pre && !/\s$/.test(pre) ? ' ' : ''; ta.value = pre + sep + txt + (cur.slice(p) && !/^\s/.test(cur.slice(p)) ? ' ' : '') + cur.slice(p);
        const np = (pre + sep + txt).length; ta.focus(); try { ta.setSelectionRange(np, np); } catch (e) { } ta.dispatchEvent(new Event('input', { bubbles: true })); panel.hidden = true; opts.onAccept && opts.onAccept(txt);
      };
      const api = { toggle() { want ? stop() : begin(); }, stop() { if (want) stop(); }, get active() { return want; } };
      ta.addEventListener('focus', () => { Voice.last = api; }); Voice.last = api; return api;
    }
  };
  document.addEventListener('keydown', e => { if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'm') { e.preventDefault(); const ta = document.activeElement; if (Voice.last) Voice.last.toggle(); } });

  // ================= ĐỌC TO (TTS) =================
  const synth = window.speechSynthesis;
  const T = window.TTS = {
    st: { rate: LS.get('aic_tts_rate', 1), voice: LS.get('aic_tts_voice', ''), auto: LS.get('aic_tts_auto', false) },
    items: [], idx: 0, token: 0, paused: false, audio: null, voices: [], mark: null, notified: false,
    loadVoices() { this.voices = synth ? synth.getVoices() : []; this.fillVoiceSelect(); },
    vi() { const v = this.voices.filter(x => /^vi/i.test(x.lang)); return v.find(x => x.voiceURI === this.st.voice) || v.find(x => /google|natural|online|hoai|an/i.test(x.name)) || v[0] || null; },
    en() { const v = this.voices.filter(x => /^en[-_]US/i.test(x.lang)); return v.find(x => /google|natural|samantha|aria/i.test(x.name)) || v[0] || null; },
    chunk(text, max = 170) {
      const sents = text.match(/[^.!?;:\n]+[.!?;:]?\s*/g) || [text], out = []; let cur = '';
      const push = () => { if (cur.trim()) out.push(cur.trim()); cur = ''; };
      for (const s of sents) {
        if (s.length > max) { push(); let b = ''; for (const w of s.split(/\s+/)) { if ((b + ' ' + w).length > max) { out.push(b.trim()); b = w; } else b += ' ' + w; } cur = b + ' '; continue; }
        if ((cur + s).length > max) push(); cur += s;
      }
      push(); return out.filter(Boolean);
    },
    domText(n) {
      let o = '';
      n.childNodes.forEach(c => {
        if (c.nodeType === 3) o += c.nodeValue;
        else if (c.nodeType === 1) {
          if (c.classList.contains('katex')) { const a = c.querySelector('annotation'); o += ' \\(' + (a ? a.textContent : c.textContent) + '\\) '; }
          else if (c.classList.contains('math-warn') || ['SCRIPT', 'STYLE', 'BUTTON', 'SELECT'].includes(c.tagName) || c.classList.contains('no-speak')) { }
          else if (c.tagName === 'BR') o += '. '; else o += this.domText(c) + (/^(P|LI|H\d|TR)$/.test(c.tagName) ? '. ' : ' ');
        }
      }); return o;
    },
    build(el) {
      let blocks = $$('p, li, h3, h4, h5, h6, blockquote, .speak-block', el).filter(b => !b.querySelector('p, li, h3, h4, h5, h6, .speak-block') && !b.closest('.no-speak'));
      if (!blocks.length) blocks = [el]; const items = [];
      blocks.forEach(b => { MS.speechSegments(this.domText(b)).forEach(s => this.chunk(s.t).forEach(t => items.push({ el: b, text: t, lang: s.lang }))); });
      return items;
    },
    async speakElement(el) {
      const items = this.build(el); if (!items.length) return toast('Không có nội dung để đọc.', 'info'); this.start(items);
    },
    speakText(text) { const items = []; MS.speechSegments(text).forEach(s => this.chunk(s.t).forEach(t => items.push({ el: null, text: t, lang: s.lang }))); if (items.length) this.start(items); },
    toggleEl(el) { if (this.root === el && this.items.length) { this.root = null; this.stop(); } else { this.root = el; this.speakElement(el); } },
    maybeAuto(el) { if (this.st.auto) this.speakElement(el); },
    async start(items) {
      this.stop(true); this.items = items; this.token++; const tok = this.token; this.paused = false; this.ensureBar(); this.bar.hidden = false; this.setLabel('Đang đọc…');
      if (synth && !this.voices.length) { this.loadVoices(); if (!this.voices.length) await sleep(500), this.loadVoices(); }
      this.useServer = !synth || !this.vi();
      if (this.useServer && !this.notified) { this.notified = true; toast(synth ? 'Thiết bị chưa có giọng tiếng Việt, đang dùng giọng đọc trực tuyến dự phòng (cần mạng).' : 'Trình duyệt không hỗ trợ đọc to, đang dùng giọng đọc trực tuyến dự phòng.', 'info', 6000); }
      this.play(0, tok);
    },
    play(i, tok) {
      if (tok !== this.token) return; if (this.mark) this.mark.classList.remove('tts-on');
      if (i >= this.items.length) return this.finish();
      this.idx = i; const it = this.items[i]; if (it.el) { it.el.classList.add('tts-on'); this.mark = it.el; try { it.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { } }
      if (this.useServer) {
        const a = this.audio = new Audio('https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' + (it.lang === 'en' ? 'en' : 'vi') + '&q=' + encodeURIComponent(it.text.slice(0, 190)));
        a.playbackRate = this.st.rate; a.onended = () => this.play(i + 1, tok); a.onerror = () => { if (tok === this.token) { toast('Không phát được giọng đọc dự phòng. Hãy cài giọng tiếng Việt cho thiết bị.', 'error'); this.finish(); } };
        a.play().catch(() => { toast('Trình duyệt chặn phát âm thanh. Hãy bấm nút Nghe lần nữa.', 'error'); this.finish(); }); return;
      }
      const u = new SpeechSynthesisUtterance(it.text); u.rate = this.st.rate; u.lang = it.lang === 'en' ? 'en-US' : 'vi-VN';
      const v = it.lang === 'en' ? this.en() : this.vi(); if (v) u.voice = v;
      u.onend = () => this.play(i + 1, tok); u.onerror = e => { if (e.error === 'interrupted' || e.error === 'canceled') return; this.play(i + 1, tok); };
      synth.speak(u);
    },
    finish() { if (this.mark) this.mark.classList.remove('tts-on'); this.items = []; this.token++; this.bar && (this.bar.hidden = true); this.setPP(false); },
    pause() { if (this.audio) this.audio.pause(); else synth && synth.pause(); this.paused = true; this.setPP(true); this.setLabel('Tạm dừng'); },
    resume() { if (this.audio) this.audio.play(); else synth && synth.resume(); this.paused = false; this.setPP(false); this.setLabel('Đang đọc…'); },
    stop(silent) { this.token++; if (synth) synth.cancel(); if (this.audio) { this.audio.pause(); this.audio = null; } if (this.mark) this.mark.classList.remove('tts-on'); this.items = []; this.paused = false; if (this.bar && !silent) this.bar.hidden = true; },
    setLabel(t) { const l = this.bar && $('.tts-label', this.bar); if (l) l.textContent = t; },
    setPP(p) { const b = this.bar && $('[data-pp]', this.bar); if (b) b.textContent = p ? '▶ Tiếp tục' : '⏸ Tạm dừng'; },
    fillVoiceSelect() { const s = this.bar && $('[data-voice]', this.bar); if (!s) return; const vi = this.voices.filter(x => /^vi/i.test(x.lang)); s.innerHTML = vi.length ? vi.map(v => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === this.st.voice ? 'selected' : ''}>${esc(v.name)}</option>`).join('') : '<option>Chưa có giọng Việt (dùng dự phòng)</option>'; },
    ensureBar() {
      if (this.bar) return; synth && (synth.onvoiceschanged = () => this.loadVoices());
      const b = this.bar = el(`<div class="tts-bar glass no-speak" role="region" aria-label="Bảng điều khiển đọc to" hidden>
        <b class="tts-label">Đang đọc…</b>
        <button class="btn small ghost" data-pp>⏸ Tạm dừng</button><button class="btn small ghost" data-stop>⏹ Dừng</button>
        <label class="small">Tốc độ <select data-rate>${[.75, 1, 1.25, 1.5].map(r => `<option value="${r}" ${r === this.st.rate ? 'selected' : ''}>${r}×</option>`).join('')}</select></label>
        <label class="small">Giọng <select data-voice></select></label>
        <label class="small sw"><input type="checkbox" data-auto ${this.st.auto ? 'checked' : ''}/> Tự động đọc câu trả lời mới</label></div>`);
      document.body.appendChild(b);
      $('[data-pp]', b).onclick = () => this.paused ? this.resume() : this.pause(); $('[data-stop]', b).onclick = () => this.stop();
      $('[data-rate]', b).onchange = e => { this.st.rate = +e.target.value; LS.set('aic_tts_rate', this.st.rate); if (this.audio) this.audio.playbackRate = this.st.rate; };
      $('[data-voice]', b).onchange = e => { this.st.voice = e.target.value; LS.set('aic_tts_voice', this.st.voice); };
      $('[data-auto]', b).onchange = e => { this.st.auto = e.target.checked; LS.set('aic_tts_auto', this.st.auto); toast(this.st.auto ? 'Đã bật tự động đọc câu trả lời mới.' : 'Đã tắt tự động đọc.', 'info'); };
      this.loadVoices();
    },
    openSettings() { this.ensureBar(); this.bar.hidden = false; this.setLabel('Cài đặt giọng đọc'); }
  };
  addEventListener('beforeunload', () => T.stop()); document.addEventListener('visibilitychange', () => { });
})();
