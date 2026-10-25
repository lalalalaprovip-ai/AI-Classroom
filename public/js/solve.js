'use strict';
/* ===== SOLVE: AI BUDDY – SOLVE (nhập đề → mức độ hiểu → chế độ → lời giải 4 bước → luyện tập) ===== */
(function () {
  const R = String.raw;
  // Trạng thái giữ nguyên khi đổi bước / đổi chế độ (không bắt nhập lại)
  const S = { problem: '', work: '', understand: '', mode: '', img: null, imgProc: null, rot: 0, crop: { l: 0, t: 0, r: 0, b: 0 }, recog: null, tab: 'text', result: '', topic: '', meta: null, logId: null, calc: '' };
  let step = 'input', hist = [], root, abort = null, destroyed = false;

  // ---------- OMML (Word) → LaTeX ----------
  const U2T = { 'α': '\\alpha ', 'β': '\\beta ', 'γ': '\\gamma ', 'δ': '\\delta ', 'ε': '\\varepsilon ', 'θ': '\\theta ', 'λ': '\\lambda ', 'μ': '\\mu ', 'ν': '\\nu ', 'π': '\\pi ', 'ρ': '\\rho ', 'σ': '\\sigma ', 'τ': '\\tau ', 'φ': '\\varphi ', 'χ': '\\chi ', 'ω': '\\omega ', 'Φ': '\\Phi ', 'Σ': '\\Sigma ', 'Δ': '\\Delta ', 'Ω': '\\Omega ', '≤': '\\le ', '≥': '\\ge ', '≠': '\\ne ', '≈': '\\approx ', '±': '\\pm ', '×': '\\times ', '·': '\\cdot ', '∩': '\\cap ', '∪': '\\cup ', '∞': '\\infty ', '∈': '\\in ', '∣': '\\mid ', '−': '-', '→': '\\to ', '∑': '\\sum ', '∫': '\\int ', '∏': '\\prod ' };
  function ommlToLatex(node) {
    const ln = e => e.localName, kids = e => Array.from(e.children), get = (e, n) => kids(e).find(k => ln(k) === n);
    const rec = e => e ? kids(e).map(conv).join('') : '';
    const g = (e, n) => rec(get(e, n));
    function conv(e) {
      switch (ln(e)) {
        case 'r': return Array.from(e.getElementsByTagNameNS('*', 't')).map(t => t.textContent).join('').replace(/[^\x00-\x7f]/g, c => U2T[c] || c).replace(/([%#&_])/g, '\\$1');
        case 'f': return `\\frac{${g(e, 'num')}}{${g(e, 'den')}}`;
        case 'sSup': return `{${g(e, 'e')}}^{${g(e, 'sup')}}`;
        case 'sSub': return `{${g(e, 'e')}}_{${g(e, 'sub')}}`;
        case 'sSubSup': return `{${g(e, 'e')}}_{${g(e, 'sub')}}^{${g(e, 'sup')}}`;
        case 'rad': { const d = g(e, 'deg'); return d ? `\\sqrt[${d}]{${g(e, 'e')}}` : `\\sqrt{${g(e, 'e')}}`; }
        case 'nary': { const pr = get(e, 'naryPr'), chr = pr && get(pr, 'chr'), c = chr ? chr.getAttribute('m:val') || chr.getAttributeNS('*', 'val') || '∫' : '∫'; const op = { '∑': '\\sum', '∏': '\\prod', '∫': '\\int' }[c] || '\\int'; const sub = g(e, 'sub'), sup = g(e, 'sup'); return op + (sub ? `_{${sub}}` : '') + (sup ? `^{${sup}}` : '') + ' ' + g(e, 'e'); }
        case 'd': { const pr = get(e, 'dPr'); const b = pr && get(pr, 'begChr'), en = pr && get(pr, 'endChr'); const bv = b ? (b.getAttribute('m:val') ?? '(') : '(', ev = en ? (en.getAttribute('m:val') ?? ')') : ')'; return `\\left${bv === '{' ? '\\{' : bv || '.'}` + kids(e).filter(k => ln(k) === 'e').map(conv).join(',') + `\\right${ev === '}' ? '\\}' : ev || '.'}`; }
        case 'acc': { const pr = get(e, 'accPr'), ch = pr && get(pr, 'chr'), c = ch ? ch.getAttribute('m:val') : '̂'; return (/̄|¯/.test(c) ? '\\bar' : /̃/.test(c) ? '\\tilde' : '\\hat') + `{${g(e, 'e')}}`; }
        case 'bar': return `\\overline{${g(e, 'e')}}`;
        case 'func': return `\\operatorname{${g(e, 'fName')}}` + g(e, 'e');
        case 'm': return '\\begin{matrix}' + kids(e).filter(k => ln(k) === 'mr').map(r => kids(r).filter(k => ln(k) === 'e').map(conv).join('&')).join('\\\\') + '\\end{matrix}';
        case 'eqArr': return '\\begin{aligned}' + kids(e).filter(k => ln(k) === 'e').map(conv).join('\\\\') + '\\end{aligned}';
        case 'ctrlPr': case 'rPr': case 'fPr': case 'dPr': case 'naryPr': case 'accPr': return '';
        default: return rec(e);
      }
    }
    return rec(node);
  }
  async function readDocx(file) {
    const zip = await JSZip.loadAsync(file); const xml = await zip.file('word/document.xml').async('string');
    const doc = new DOMParser().parseFromString(xml, 'application/xml'), body = doc.getElementsByTagNameNS('*', 'body')[0];
    let warn = false; const lines = [];
    const para = p => {
      let s = ''; Array.from(p.children).forEach(c => {
        if (c.localName === 'r') s += Array.from(c.getElementsByTagNameNS('*', 't')).map(t => t.textContent).join('');
        else if (c.localName === 'oMath') { const t = ommlToLatex(c); if (t) s += ' \\(' + t + '\\) '; }
        else if (c.localName === 'oMathPara') { s += ' \\[' + Array.from(c.children).filter(k => k.localName === 'oMath').map(ommlToLatex).join('\\\\') + '\\] '; }
        else if (c.localName === 'hyperlink') s += c.textContent;
      }); return s.trim();
    };
    Array.from(body.children).forEach(c => {
      if (c.localName === 'p') { const t = para(c); if (t) lines.push(t); }
      else if (c.localName === 'tbl') { const rows = Array.from(c.getElementsByTagNameNS('*', 'tr')).map(tr => '| ' + Array.from(tr.getElementsByTagNameNS('*', 'tc')).map(tc => Array.from(tc.getElementsByTagNameNS('*', 'p')).map(para).join(' ')).join(' | ') + ' |'); if (rows.length > 1) rows.splice(1, 0, '|' + rows[0].split('|').slice(1, -1).map(() => '---').join('|') + '|'); lines.push(rows.join('\n')); }
    });
    const imgs = []; for (const name of Object.keys(zip.files).filter(n => /^word\/media\/.+\.(png|jpe?g|webp|gif)$/i.test(n)).slice(0, 4)) { const b = await zip.file(name).async('blob'); imgs.push(new Blob([b], { type: /png$/i.test(name) ? 'image/png' : 'image/jpeg' })); }
    return { text: lines.join('\n\n'), images: imgs, hasMath: /<m:oMath/.test(xml) };
  }
  async function readPdf(file, onProg) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise; let text = ''; const n = Math.min(pdf.numPages, 8);
    for (let i = 1; i <= n; i++) { const pg = await pdf.getPage(i); const tc = await pg.getTextContent(); text += tc.items.map(x => x.str).join(' ') + '\n'; onProg && onProg(i / n); }
    if (text.replace(/\s/g, '').length >= 40) return { text: text.trim(), images: [] };
    const images = []; for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) { const pg = await pdf.getPage(i), vp = pg.getViewport({ scale: 2 }), c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; images.push(await new Promise(r => c.toBlob(r, 'image/jpeg', .9))); }
    return { text: '', images, scanned: true };
  }
  const splitProblems = t => { const parts = t.split(/\n(?=\s*(?:Bài|Câu)\s*\d+\s*[.:)])/i).map(x => x.trim()).filter(Boolean); return parts.length > 1 ? parts : [t.trim()].filter(Boolean); };

  // ---------- Điều hướng bước ----------
  function go(s) { if (s !== step) hist.push(step); step = s; draw(); }
  function back() { if (hist.length) { step = hist.pop(); if (abort) abort.abort(); draw(); } else App.back(); }
  const head = (title, sub) => `<div class="page-head">${backBtn('← Quay lại')}<div><h2>${title}</h2>${sub ? `<p class="muted">${sub}</p>` : ''}</div><button class="btn ghost" data-back="home">🏠 Trang chủ</button></div>`;
  const stepper = i => `<ol class="stepper" aria-label="Quy trình thao tác 5 bước">${['Nhập đề', 'Mức độ hiểu', 'Chế độ', 'Lời giải', 'Luyện tập'].map((t, k) => `<li class="${k + 1 < i ? 'done' : k + 1 === i ? 'on' : ''}"><span>${k + 1}</span>${t}</li>`).join('')}</ol>`;

  function draw() {
    if (destroyed) return; if (W_TTS()) TTS.stop();
    ({ input: drawInput, confirm: drawConfirm, understand: drawUnderstand, mode: drawMode, solution: drawSolution, practice: drawPractice })[step]();
    window.scrollTo({ top: 0 });
  }
  const W_TTS = () => window.TTS;
  const noKey = () => !AI.ready && `<div class="notice warn">Chưa có API key của bạn nên AI chưa hoạt động. <button class="btn small primary" data-settings>Nhập API key</button></div>`;
  const bindSettings = r => $$('[data-settings]', r).forEach(b => b.onclick = () => Shell.aiSettings());

  // ================= BƯỚC 1: NHẬP ĐỀ =================
  function drawInput() {
    root.innerHTML = head('AI BUDDY – SOLVE', '“Chào bạn! Hãy gửi bài tập Xác suất Thống kê mà bạn cần hỗ trợ nhé.”') + stepper(1) + (noKey() || '') + `
    <div class="glass panel dark">
      <div class="tabs" role="tablist">${[['text', '✍️ Nhập văn bản'], ['cam', '📷 Chụp ảnh đề'], ['file', '📎 Tải tệp'], ['calc', '＝ Tính nhanh']].map(([k, t]) => `<button role="tab" class="tab ${S.tab === k ? 'on' : ''}" data-tab="${k}" aria-selected="${S.tab === k}">${t}</button>`).join('')}</div>
      <div id="tabbody"></div></div>`;
    bindSettings(root);
    $$('[data-tab]', root).forEach(b => b.onclick = () => { S.tab = b.dataset.tab; drawInput(); });
    ({ text: tabText, cam: tabCam, file: tabFile, calc: tabCalc })[S.tab]($('#tabbody', root));
  }
  function tabText(box) {
    box.innerHTML = `<div id="mb"></div><div class="input-wrap"><textarea id="prob" rows="7" placeholder="Gõ hoặc dán đề bài. Dùng thanh ký hiệu để chèn công thức, hoặc bấm micro để đọc đề…" aria-label="Đề bài">${esc(S.problem)}</textarea>
      <button type="button" class="mic" id="mic"><span class="mic-ico">🎤</span><span class="mic-label"></span></button></div>
      <div class="muted small">Mẹo nói: “X có phân phối chuẩn muy bằng mười, xích ma bình phương bằng bốn” → <span class="inl" id="tipf"></span></div>
      <h4>Xem trước kết xuất</h4><div class="preview rich" id="prev"></div>
      <div class="row end"><button class="btn ghost" id="clr">🗑 Xóa</button><button class="btn primary big" id="next">Tiếp tục →</button></div>`;
    const ta = $('#prob', box); MathBar.mount($('#mb', box), ta); const upd = Preview.bind(ta, $('#prev', box));
    $('#tipf', box).innerHTML = Rich.mathOnly(R`X \sim N(\mu = 10, \sigma^2 = 4)`);
    Voice.attach({ button: $('#mic', box), textarea: ta, host: $('.input-wrap', box).parentElement });
    ta.addEventListener('input', () => S.problem = ta.value);
    $('#clr', box).onclick = () => { ta.value = ''; S.problem = ''; S.recog = null; upd(); };
    $('#next', box).onclick = () => { if (!ta.value.trim()) return toast('Bạn hãy nhập đề bài trước nhé.', 'error'); S.problem = ta.value; S.recog = null; go('understand'); };
  }
  function imgPanel(box, extra = '') {
    box.insertAdjacentHTML('beforeend', `<div id="imgp"></div>`); const host = $('#imgp', box);
    const refresh = async () => {
      if (!S.img) { host.innerHTML = extra; return; }
      S.imgProc = await Img.process(S.img, { max: 1800, rotate: S.rot, crop: S.crop });
      host.innerHTML = `<div class="imgbox"><img src="${Img.url(S.imgProc)}" alt="Ảnh đề bài"/></div>
        <div class="row wrap"><button class="btn ghost" data-rot="-90">⟲ Xoay trái</button><button class="btn ghost" data-rot="90">⟳ Xoay phải</button><button class="btn ghost" data-del>🗑 Xóa ảnh</button></div>
        <details class="crop"><summary>✂️ Cắt ảnh</summary>${['t:Trên', 'b:Dưới', 'l:Trái', 'r:Phải'].map(x => { const [k, n] = x.split(':'); return `<label class="small">${n}: <input type="range" min="0" max="40" value="${Math.round(S.crop[k] * 100)}" data-crop="${k}"/></label>`; }).join('')}</details>
        <p class="muted small">Chỉ chụp bài tập, tránh chụp tên, số điện thoại hay khuôn mặt.</p>
        <div class="row end"><button class="btn primary big" id="ocr">🔍 Nhận dạng đề</button></div>`;
      $$('[data-rot]', host).forEach(b => b.onclick = () => { S.rot += +b.dataset.rot; refresh(); }); $('[data-del]', host).onclick = () => { S.img = null; S.imgProc = null; S.rot = 0; S.crop = { l: 0, t: 0, r: 0, b: 0 }; refresh(); };
      $$('[data-crop]', host).forEach(r => r.onchange = () => { S.crop[r.dataset.crop] = +r.value / 100; if (S.crop.l + S.crop.r > .8 || S.crop.t + S.crop.b > .8) { S.crop = { l: 0, t: 0, r: 0, b: 0 }; toast('Vùng cắt quá nhỏ, đã đặt lại.', 'error'); } refresh(); });
      $('#ocr', host).onclick = () => recognize([S.imgProc]);
    };
    refresh(); return refresh;
  }
  function tabCam(box) {
    box.innerHTML = `<div class="row wrap center"><button class="btn primary big" id="opencam">📷 Mở camera chụp đề</button><label class="btn ghost">🖼 Chọn ảnh từ máy<input type="file" accept="image/*" capture="environment" hidden id="pick"/></label></div>`;
    const rf = imgPanel(box);
    const set = b => { S.img = b; S.rot = 0; S.crop = { l: 0, t: 0, r: 0, b: 0 }; rf(); };
    $('#opencam', box).onclick = async () => { const b = await Camera.open({ title: 'Chụp ảnh đề bài' }); if (b) set(b); };
    $('#pick', box).onchange = e => { const f = e.target.files[0]; if (f) set(f); };
  }
  function tabFile(box) {
    box.innerHTML = `<div class="drop" id="drop" tabindex="0"><p><b>Kéo thả</b> tệp vào đây, <b>chọn tệp</b>, hoặc <b>dán ảnh</b> bằng Ctrl+V / Cmd+V</p><p class="muted small">Hỗ trợ: ảnh JPG, PNG, WEBP, HEIC · Word (.docx) · PDF · tối đa 15 MB</p><input type="file" id="fpick" hidden accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.docx,.pdf,image/*"/><button class="btn primary" id="fbtn">📂 Chọn tệp</button></div><div id="fstat"></div>`;
    const rf = imgPanel(box);
    const handle = async f => {
      const stat = $('#fstat', box), ext = (f.name.split('.').pop() || '').toLowerCase();
      if (f.size > 15 * 1048576) return toast('Tệp quá lớn (tối đa 15 MB).', 'error');
      if (!/^(jpe?g|png|webp|heic|heif|docx|pdf)$/.test(ext) && !f.type.startsWith('image/')) return toast('Định dạng chưa hỗ trợ. Hãy dùng ảnh, .docx hoặc PDF.', 'error');
      stat.innerHTML = `<div class="filechip">📄 ${esc(f.name || 'ảnh dán')} · ${(f.size / 1024).toFixed(0)} KB <progress id="fprog" max="1" value="0"></progress> <button class="btn small ghost" id="fdel">Xóa</button></div>`; $('#fdel', box).onclick = () => { stat.innerHTML = ''; S.img = null; rf(); };
      const prog = v => { const p = $('#fprog', box); if (p) p.value = v; };
      try {
        if (f.type.startsWith('image/') || /^(jpe?g|png|webp|heic|heif)$/.test(ext)) { prog(1); S.img = f.type ? f : new Blob([f], { type: 'image/heic' }); S.rot = 0; S.crop = { l: 0, t: 0, r: 0, b: 0 }; rf(); }
        else if (ext === 'docx') {
          const d = await readDocx(f); prog(1); const imgs = d.images; let probs = splitProblems(d.text), work = '', unc = [];
          if (!d.text && !imgs.length) return toast('Tệp Word không có nội dung đọc được.', 'error');
          if (imgs.length) { const rs = await recognizeQuiet(imgs); probs = probs.concat(rs.problems); unc = rs.uncertain; }
          if (d.text && !d.hasMath && /[=≤≥σμ]/.test(d.text) === false) { }
          S.recog = { problems: probs, work, uncertain: unc, type: 'de_bai', quality: 'tot', fromFile: f.name, note: d.hasMath ? 'Công thức Word (OMML) đã được chuyển sang LaTeX; hãy kiểm tra kỹ.' : '' }; chooseProblem(0); go('confirm');
        } else if (ext === 'pdf') {
          const d = await readPdf(f, prog); let probs = splitProblems(d.text), unc = [];
          if (d.images.length) { toast('PDF là bản quét, đang nhận dạng từng trang…', 'info'); const rs = await recognizeQuiet(d.images); probs = rs.problems; unc = rs.uncertain; }
          if (!probs.length) return toast('Không đọc được nội dung PDF.', 'error');
          S.recog = { problems: probs, work: '', uncertain: unc, type: 'de_bai', quality: 'tot', fromFile: f.name, note: d.text ? 'Văn bản lấy từ lớp chữ của PDF; công thức có thể chưa chuẩn, hãy kiểm tra.' : '' }; chooseProblem(0); go('confirm');
        }
      } catch (e) { stat.innerHTML = ''; toast('Không đọc được tệp: ' + e.message, 'error', 6000); }
    };
    const drop = $('#drop', box); $('#fbtn', box).onclick = () => $('#fpick', box).click(); $('#fpick', box).onchange = e => e.target.files[0] && handle(e.target.files[0]);
    ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); })); ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => e.dataTransfer.files[0] && handle(e.dataTransfer.files[0]));
    S._paste = e => { const f = Img.fromClipboard(e); if (f && S.tab === 'file' && step === 'input') { e.preventDefault(); handle(f); } };
  }
  document.addEventListener('paste', e => S._paste && S._paste(e));
  function tabCalc(box) {
    box.innerHTML = `<p class="muted">Chỉ cần nhập phép tính rồi bấm <b>＝</b> để xem kết quả — không cần gửi cả đề.</p>
      <div class="calc-row"><span class="eq">＝</span><input id="cin" type="text" inputmode="text" autocomplete="off" placeholder="Ví dụ: C(10,3)/2^10 hoặc normcdf(1.96)" value="${esc(S.calc)}" aria-label="Phép tính"/><button class="btn primary big" id="cgo">＝ Tính</button></div>
      <div class="chips">${['3/8+0.25', 'nCr(10,3)', 'binompmf(2,5,0.3)', 'poissoncdf(2,1.5)', 'normcdf(1.96)', 'Phi0(1.5)', 'invnorm(0.975)', 'mean(2,4,6,8)', 'std(2,4,6,8)'].map(x => `<button class="chip" data-ex="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      <p class="muted small">${esc(Calc.help)} · Dùng dấu chấm cho số thập phân khi có hàm nhiều tham số. Φ(z)=<code>Phi(z)</code>, Φ₀(z)=<code>Phi0(z)</code>.</p><div id="cout"></div>`;
    const go_ = () => {
      const v = $('#cin', box).value; S.calc = v; const r = Calc.run(v), out = $('#cout', box);
      if (!r.ok) { out.innerHTML = `<div class="notice warn">${esc(r.error)}</div>`; return; }
      out.innerHTML = `<div class="calc-res glass"><div class="rich">${r.tex ? Rich.mathOnly(r.tex, true) : ''}</div><div class="big-res">＝ <b>${esc(r.result)}</b></div>${r.round4 != null && String(r.round4) !== r.result ? `<div class="muted">Làm tròn 4 chữ số: <b>${r.round4}</b></div>` : ''}${r.exact ? `<div class="muted">Dạng phân số: ${Rich.mathOnly(r.exact)}</div>` : ''}
        <div class="row wrap"><button class="btn ghost" id="cai">🧠 Nhờ AI giải thích phép tính</button><button class="btn ghost" id="clisten">🔊 Nghe</button></div><div id="cexp" class="rich"></div></div>`;
      $('#clisten', out).onclick = () => TTS.speakText('Kết quả bằng ' + r.result);
      $('#cai', out).onclick = async () => { if (!AI.ready) return Shell.aiSettings(); const ex = $('#cexp', out); ex.textContent = 'AI đang giải thích…'; try { await AI.stream({ system: AI.prompts.core, text: `Giải thích ngắn gọn từng bước cách tính phép tính sau và ý nghĩa kết quả (nếu là xác suất/thống kê): ${v}\nKết quả máy tính: ${r.result}` }, (d, full) => Rich.into(ex, full)); } catch (e) { ex.textContent = e.message; } };
    };
    $('#cgo', box).onclick = go_; $('#cin', box).addEventListener('keydown', e => { if (e.key === 'Enter') go_(); }); $$('[data-ex]', box).forEach(b => b.onclick = () => { $('#cin', box).value = b.dataset.ex; go_(); });
    if (S.calc) go_();
  }

  // ---------- Nhận dạng ----------
  async function recognizeQuiet(blobs) {
    const all = { problems: [], uncertain: [] };
    for (const b of blobs) { try { const r = AI.ready ? await AI.ocr(b) : { problems: [await AI.ocrFallback(b)], uncertain: ['Chưa có API key: chỉ nhận dạng được chữ, công thức cần bạn tự sửa.'] }; all.problems.push(...r.problems); all.uncertain.push(...r.uncertain); } catch (e) { toast('Một ảnh không nhận dạng được: ' + e.message, 'error', 5000); } }
    return all;
  }
  async function recognize(blobs) {
    const m = Modal.open({ title: 'Đang đọc đề…', sticky: true, html: `<div class="loading"><div class="spin"></div><p>AI đang nhận dạng đề và chuyển công thức sang LaTeX…</p></div>` });
    try {
      let r;
      if (AI.ready) { try { r = await AI.ocr(blobs[0]); } catch (e) { toast(e.message + ' — thử bộ OCR dự phòng…', 'error', 5000); r = { type: 'de_bai', quality: 'mo', problems: [await AI.ocrFallback(blobs[0], p => { })], work: '', uncertain: ['Bộ OCR dự phòng chỉ đọc chữ, KHÔNG nhận dạng công thức. Hãy sửa lại ký hiệu.'] }; } }
      else r = { type: 'de_bai', quality: 'mo', problems: [await AI.ocrFallback(blobs[0])], work: '', uncertain: ['Chưa có API key: đây là OCR dự phòng chỉ đọc chữ, KHÔNG nhận dạng công thức. Hãy sửa lại ký hiệu.'] };
      m.close();
      if (r.type === 'khong_lien_quan') return Modal.open({ title: 'Ảnh chưa phù hợp', html: `<p>Ảnh này có vẻ không phải bài Xác suất Thống kê hoặc nội dung liên quan nên mình xin phép không xử lý nhé. Bạn hãy chụp lại đề bài môn học để mình hỗ trợ.</p>` });
      if (!r.problems.length && !r.work) return Modal.open({ title: 'Mình chưa đọc được đề', html: `<p>Ảnh có thể bị mờ hoặc bị cắt. Bạn hãy chụp lại: đủ sáng, chụp thẳng, lấy trọn trang, rồi thử lại nhé.</p>` });
      S.recog = r; if (r.type === 'bai_lam' || r.work) S.work = r.work || r.problems.join('\n'); chooseProblem(0); go('confirm');
    } catch (e) { m.close(); toast('Không nhận dạng được: ' + e.message, 'error', 7000); }
  }
  function chooseProblem(i) { S.problem = (S.recog.problems[i] || '').trim(); S.recog.sel = i; }

  // ================= XÁC NHẬN ĐỀ =================
  function drawConfirm() {
    const r = S.recog, hasUnsure = r.uncertain.length || r.quality !== 'tot' || /\[\?/.test(S.problem);
    root.innerHTML = head('Xác nhận nội dung đề', 'Kiểm tra đề đã nhận dạng cạnh ảnh gốc. Bạn có thể sửa trực tiếp trước khi giải.') + stepper(1) + `
    <div class="grid2"><div class="glass panel dark"><h4>Ảnh/tệp gốc</h4>${S.imgProc ? `<img class="orig" src="${Img.url(S.imgProc)}" alt="Ảnh gốc"/>` : `<p class="muted">📄 ${esc(r.fromFile || 'Không có ảnh')}</p>`}${r.note ? `<div class="notice">${esc(r.note)}</div>` : ''}</div>
    <div class="glass panel dark">${r.problems.length > 1 ? `<h4>Tệp có ${r.problems.length} bài — chọn bài cần giải</h4><div class="chips">${r.problems.map((p, i) => `<button class="chip ${r.sel === i ? 'on' : ''}" data-p="${i}">Bài ${i + 1}</button>`).join('')}</div>` : ''}
      <h4>Đề đã nhận dạng (sửa được)</h4><div id="mb2"></div><textarea id="ptxt" rows="8">${esc(S.problem)}</textarea><h4>Hiển thị công thức</h4><div class="preview rich" id="prev2"></div>
      ${r.uncertain.length ? `<div class="notice warn"><b>Mình chưa chắc ở những chỗ này:</b><ul>${r.uncertain.map(u => `<li>${esc(u)}${/^[^?]*$/.test(u) ? ' — đúng không?' : ''}</li>`).join('')}</ul></div>` : ''}
      ${r.quality !== 'tot' ? `<div class="notice warn">Ảnh có vẻ ${r.quality === 'bi_cat' ? 'bị cắt' : 'hơi mờ'}. Nếu đề chưa đủ, hãy chụp lại (đủ sáng, chụp thẳng, lấy trọn trang).</div>` : ''}
      ${S.work ? `<h4>Bài làm của bạn (nhận dạng được)</h4><textarea id="wtxt" rows="5">${esc(S.work)}</textarea><p class="muted small">Mình sẽ dùng phần này để chấm ở chế độ KIỂM TRA.</p>` : ''}
      ${hasUnsure ? `<label class="check"><input type="checkbox" id="okchk"/> Mình đã kiểm tra dấu âm/dương, số mũ, chỉ số dưới, phân số, căn, ký hiệu Hy Lạp, ngoặc và điều kiện xác suất.</label>` : ''}
      <div class="row end"><button class="btn primary big" id="cnext">Tiếp tục →</button></div></div></div>`;
    bindSettings(root);
    const ta = $('#ptxt', root); MathBar.mount($('#mb2', root), ta); Preview.bind(ta, $('#prev2', root)); ta.oninput = () => S.problem = ta.value;
    $$('[data-p]', root).forEach(b => b.onclick = () => { chooseProblem(+b.dataset.p); drawConfirm(); });
    const w = $('#wtxt', root); if (w) w.oninput = () => S.work = w.value;
    $('#cnext', root).onclick = () => {
      if (!ta.value.trim()) return toast('Đề đang trống.', 'error'); if (/\[\?/.test(ta.value)) return toast('Vẫn còn chỗ đánh dấu [?…?]. Hãy sửa hoặc xóa dấu [? ?] sau khi đã kiểm tra.', 'error', 5500);
      const c = $('#okchk', root); if (c && !c.checked) return toast('Hãy tick xác nhận đã kiểm tra đề trước khi giải.', 'error'); S.problem = ta.value; go('understand');
    };
  }

  // ================= BƯỚC 2: MỨC ĐỘ HIỂU =================
  const UND = [['chua_hieu_de', '😕 Tôi chưa hiểu đề bài', 'Mình giải thích dữ kiện và yêu cầu cần tìm.'], ['chua_biet_cach', '🤔 Tôi hiểu đề nhưng chưa biết cách làm', 'Mình gợi ý kiến thức và phương pháp.'], ['lam_thu', '✍️ Tôi đã làm thử nhưng chưa chắc chắn', 'Mình ưu tiên kiểm tra, tìm lỗi sai.'], ['xem_day_du', '📖 Tôi muốn xem lời giải đầy đủ', 'Mình cung cấp lời giải chi tiết.']];
  function drawUnderstand() {
    root.innerHTML = head('Bạn đã hiểu đề bài đến đâu?') + stepper(2) + `<div class="glass panel dark"><div class="preview rich small">${Rich.html(S.problem)}</div></div><div class="cards4">${UND.map(([k, t, d]) => `<button class="opt ${S.understand === k ? 'on' : ''}" data-k="${k}"><b>${t}</b><span>${d}</span></button>`).join('')}</div><div class="row end"><button class="btn primary big" id="n">Tiếp tục →</button></div>`;
    $$('[data-k]', root).forEach(b => b.onclick = () => { S.understand = b.dataset.k; $$('[data-k]', root).forEach(x => x.classList.toggle('on', x === b)); if (S.understand === 'lam_thu' && !S.mode) S.mode = 'kiem_tra'; if (S.understand === 'xem_day_du' && !S.mode) S.mode = 'day_du'; });
    $('#n', root).onclick = () => { if (!S.understand) return toast('Hãy chọn một mức độ hiểu bài.', 'error'); go('mode'); };
  }

  // ================= BƯỚC 3: CHỌN CHẾ ĐỘ =================
  const MODES = [['goi_y', '💡', 'GỢI Ý', 'Gợi ý từng phần, nêu kiến thức và công thức liên quan, không lộ toàn bộ lời giải.'], ['huong_dan', '🧭', 'HƯỚNG DẪN', 'Phân tích đề, xác định dữ kiện, hướng dẫn từng bước và giải thích lý do chọn công thức.'], ['kiem_tra', '🔎', 'KIỂM TRA', 'Bạn nhập lời giải/đáp án (hoặc chụp bài làm), AI kiểm tra từng bước và chỉ lỗi sai.'], ['day_du', '📘', 'GIẢI ĐẦY ĐỦ', 'Lời giải chi tiết từ đầu đến cuối, công thức tổng quát trước khi thay số.']];
  function drawMode() {
    root.innerHTML = head('Chọn chế độ hỗ trợ', 'Đổi chế độ không cần nhập lại đề.') + stepper(3) + `<div class="cards4">${MODES.map(([k, ic, t, d]) => `<button class="opt mode ${S.mode === k ? 'on' : ''}" data-m="${k}"><i>${ic}</i><b>${t}</b><span>${d}</span></button>`).join('')}</div>
      <div id="workbox" class="glass panel dark" ${S.mode === 'kiem_tra' ? '' : 'hidden'}><h4>Lời giải / đáp án của bạn</h4><div id="mb3"></div><textarea id="wk" rows="6" placeholder="Nhập các bước bạn đã làm…">${esc(S.work)}</textarea>
      <div class="row wrap"><button class="btn ghost" id="wcam">📷 Chụp bài làm</button><button type="button" class="mic" id="mic3"><span class="mic-ico">🎤</span><span class="mic-label"></span></button></div><div class="preview rich" id="prev3"></div></div>
      <div class="row end"><button class="btn primary big" id="n">Xem lời giải →</button></div>`;
    const ta = $('#wk', root); MathBar.mount($('#mb3', root), ta); Preview.bind(ta, $('#prev3', root)); ta.oninput = () => S.work = ta.value; Voice.attach({ button: $('#mic3', root), textarea: ta, host: $('#workbox', root) });
    $('#wcam', root).onclick = async () => { const b = await Camera.open({ title: 'Chụp bài làm' }); if (!b) return; try { const r = await AI.ocr(await Img.process(b), 'Đây là BÀI LÀM của người học: chép lại từng dòng vào mục ---BAI_LAM---.'); ta.value = (ta.value + '\n' + (r.work || r.problems.join('\n'))).trim(); S.work = ta.value; ta.dispatchEvent(new Event('input')); } catch (e) { toast(e.message, 'error'); } };
    $$('[data-m]', root).forEach(b => b.onclick = () => { S.mode = b.dataset.m; $$('[data-m]', root).forEach(x => x.classList.toggle('on', x === b)); $('#workbox', root).hidden = S.mode !== 'kiem_tra'; });
    $('#n', root).onclick = () => { if (!S.mode) return toast('Hãy chọn một chế độ.', 'error'); if (S.mode === 'kiem_tra' && !ta.value.trim()) return toast('Chế độ KIỂM TRA cần lời giải của bạn. Hãy nhập hoặc chụp bài làm.', 'error'); S.work = ta.value; S.result = ''; go('solution'); };
  }

  // ================= BƯỚC 4: LỜI GIẢI 4 BƯỚC =================
  const BLOCKS = [['BƯỚC 1', 'Tìm hiểu nội dung bài toán', 'Phân tích đề bài'], ['BƯỚC 2', 'Xây dựng chương trình giải', 'Kiến thức áp dụng'], ['BƯỚC 3', 'Trình bày lời giải', 'Các bước giải chi tiết & Kết quả'], ['BƯỚC 4', 'Kiểm tra và nghiên cứu lời giải', 'Kiểm tra, cách giải khác, bài tương tự']];
  function splitBlocks(t) { const out = ['', '', '', '']; const parts = t.split(/^##\s*BƯỚC\s*([1-4])[^\n]*\n?/m); if (parts.length === 1) { out[2] = t; return out; } for (let i = 1; i < parts.length; i += 2) out[+parts[i] - 1] = parts[i + 1].trim(); return out; }
  function drawSolution() {
    const mode = MODES.find(m => m[0] === S.mode);
    root.innerHTML = head('Lời giải theo quy trình 4 bước', `Chế độ: ${mode[1]} ${mode[2]}`) + stepper(4) + (noKey() || '') + `
    <div class="glass panel dark"><b>Đề bài</b><div class="rich">${Rich.html(S.problem)}</div></div>
    <div class="row wrap solbar"><button class="btn ok" id="listen">🔊 Nghe lời giải</button><button class="btn ghost" id="tts">⚙ Giọng đọc</button><button class="btn ghost" id="chmode">🔁 Đổi chế độ</button><button class="btn ghost" id="regen">↻ Tạo lại</button><button class="btn ghost" id="expand">⇕ Mở/thu tất cả</button></div>
    <div id="sol" class="solution">${BLOCKS.map((b, i) => `<details class="sblock" open data-i="${i}"><summary><span class="bn">${i + 1}</span><span><b>${b[0]} — ${b[1]}</b><small>${b[2]}</small></span></summary><div class="sbody rich"><span class="muted">Đang chờ…</span></div></details>`).join('')}</div>
    <div id="after" hidden class="glass panel dark"><b>Bạn tự đánh giá bài này để theo dõi tiến độ:</b><div class="chips" id="selfr">${[['dung', '✅ Tự làm đúng'], ['can_goi_y', '💡 Cần gợi ý'], ['sai_mot_phan', '🟡 Sai một phần'], ['sai', '❌ Sai']].map(([k, t]) => `<button class="chip" data-r="${k}">${t}</button>`).join('')}</div></div>
    <div class="row end"><button class="btn primary big" id="cont" disabled>Luyện tập thêm →</button></div>`;
    bindSettings(root); const sol = $('#sol', root);
    $('#chmode', root).onclick = () => { if (abort) abort.abort(); back(); }; $('#regen', root).onclick = () => run();
    $('#listen', root).onclick = () => { if (!S.result) return toast('Lời giải chưa sẵn sàng.', 'info'); TTS.toggleEl(sol); }; $('#tts', root).onclick = () => TTS.openSettings();
    $('#expand', root).onclick = () => { const ds = $$('details', sol), any = ds.some(d => d.open); ds.forEach(d => d.open = !any); };
    $('#cont', root).onclick = () => go('practice');
    $$('[data-r]', root).forEach(b => b.onclick = () => { Logs.update(S.logId, { result: b.dataset.r }); $$('[data-r]', root).forEach(x => x.classList.toggle('on', x === b)); toast('Đã ghi nhận vào Nhật ký phiên học.', 'success'); });
    if (S.result && S.shown === S.result) renderBlocks(S.result); else run();
    function renderBlocks(text) { const bl = splitBlocks(text); $$('.sbody', sol).forEach((d, i) => { if (bl[i]) Rich.into(d, bl[i]); }); }
    async function run() {
      if (!AI.ready) return Shell.aiSettings(); if (abort) abort.abort(); abort = new AbortController(); const my = abort; TTS.stop();
      $$('.sbody', sol).forEach(d => d.innerHTML = '<span class="muted">Đang chờ…</span>'); $('#cont', root).disabled = true; $('#after', root).hidden = true;
      const text = `ĐỀ BÀI:\n${S.problem}` + (S.work ? `\n\nBÀI LÀM / ĐÁP ÁN CỦA NGƯỜI HỌC:\n${S.work}` : '');
      let last = 0; const status = el('<div class="muted small">AI đang soạn lời giải…</div>'); sol.before(status);
      try {
        const full = await AI.stream({ system: AI.prompts.solve(S.mode, S.understand), text, temperature: .3, signal: my.signal }, (d, f) => { const n = Date.now(); if (n - last > 140) { last = n; renderBlocks(AI.parseMeta(f).body); } });
        const { body, meta } = AI.parseMeta(full); S.result = body; S.shown = body; S.meta = meta; renderBlocks(body); status.remove();
        const res = S.mode === 'kiem_tra' && meta && ['dung', 'sai_mot_phan', 'sai'].includes(meta.ket_qua) ? meta.ket_qua : 'can_goi_y';
        S.logId = Logs.add({ topic: (meta && meta.chu_de) || 'Chưa phân loại', chapter: (meta && meta.chuong) || '', kind: (meta && meta.dang_bai) || '', result: res, support: { goi_y: 'goi_y', huong_dan: 'goi_y', kiem_tra: 'tu_lam', day_du: 'xem_loi_giai' }[S.mode], error: (meta && meta.nhan_loi) || '', source: 'bai_tap', problem: S.problem.slice(0, 1500), solution: body.slice(0, 6000) });
        S.topic = (meta && meta.chu_de) || ''; $('#after', root).hidden = false; $('#cont', root).disabled = false; TTS.maybeAuto(sol);
      } catch (e) { status.remove(); if (e.name === 'AbortError') return; $('.sbody', sol).innerHTML = `<div class="notice warn">${esc(e.message)}</div><button class="btn primary" data-settings>Cài đặt AI</button>`; bindSettings(sol); }
    }
  }

  // ================= BƯỚC 5: LUYỆN TẬP =================
  function drawPractice() {
    root.innerHTML = head('Luyện tập thêm') + stepper(5) + `<div class="glass panel dark center"><h3>Bạn có muốn luyện tập thêm về dạng bài này không?</h3><div class="row center wrap"><button class="btn ghost big" id="no">Không – Quay về trang chủ</button><button class="btn primary big" id="yes">Có – Chơi trò chơi 🎮</button></div></div>`;
    $('#no', root).onclick = () => App.go('home', {}, { reset: true });
    $('#yes', root).onclick = () => App.go('games', { topic: S.topic, banner: 'Cùng luyện tập thêm dạng bài bạn vừa học nhé!' });
  }

  App.reg('solve', {
    render(r, p) { root = r; destroyed = false; if (p && p.tab) S.tab = p.tab; if (p && p.problem != null) { S.problem = p.problem; S.recog = null; S.mode = ''; S.understand = ''; S.result = ''; S.shown = ''; step = p.problem ? 'understand' : 'input'; hist = p.problem ? ['input'] : []; } else if (!hist.length) step = 'input'; draw(); },
    destroy() { destroyed = true; if (abort) abort.abort(); if (window.TTS) TTS.stop(); S._paste = null; if (Voice.last && Voice.last.active) Voice.last.stop(); }
  });
  window.Solve = { state: S, ommlToLatex };
})();
