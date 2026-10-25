'use strict';
/* ===== GAMES: bản đồ vũ trụ + 3 game chơi được (Dice Rush, Lucky Vault, Distribution Architect) ===== */
(function () {
  const R = String.raw, M = () => window.math;
  const Stars = window.Stars = {
    get() { return Math.max(0, +LS.get('aic_stars', 0) || 0); },
    add(n) { LS.set('aic_stars', this.get() + Math.max(0, n)); document.dispatchEvent(new Event('stars')); },
    done: id => !!(LS.get('aic_gdone', {})[id]), mark(id) { const d = LS.get('aic_gdone', {}); d[id] = 1; LS.set('aic_gdone', d); }
  };
  const PLANETS = [
    ['Chương 1', 'Xác suất', 'prob', ['#7dd3fc', '#1d4ed8', '#0b1e5c'], ['dice', 'vault', 'detective']],
    ['Chương 2', 'Biến ngẫu nhiên', 'rv', ['#fdba74', '#c2410c', '#431407'], []],
    ['Chương 3', 'Phân phối xác suất', 'dist', ['#d8b4fe', '#7c3aed', '#2e1065'], ['arch']],
    ['Chương 4', 'Mẫu ngẫu nhiên', 'sample', ['#86efac', '#15803d', '#052e16'], []],
    ['Chương 5', 'Ước lượng khoảng', 'est', ['#fca5a5', '#b91c1c', '#450a0a'], ['colony']],
    ['Chương 6', 'Kiểm định giả thiết', 'test', ['#a5f3fc', '#0e7490', '#083344'], ['reactor']],
    ['Chương 7', 'So sánh hai tham số', 'cmp', ['#fde68a', '#b45309', '#451a03'], []]
  ];
  const GAMES = {
    dice: { name: 'Cosmic Dice Rush', vi: 'Đường đua xúc xắc', goal: 'Dự đoán kết quả hai xúc xắc để đưa tàu về đích trong 12 lượt.', genre: 'Arcade – Xác suất', lvl: 'Dễ', ready: true },
    vault: { name: 'Lucky Vault', vi: 'Kho báu xác suất', goal: 'Rút bóng (có/không hoàn lại) để thu thập đủ vật phẩm mở cửa kho.', genre: 'Strategy – Xác suất có điều kiện', lvl: 'Vừa', ready: true },
    detective: { name: 'Stat Detective – The Missing Signal', vi: 'Điều tra tín hiệu lạ', goal: 'Thu thập bằng chứng, cập nhật xác suất Bayes để tìm nguồn phát.', genre: 'Mystery – Bayes', lvl: 'Khó', ready: false },
    arch: { name: 'Distribution Architect', vi: 'Kiến trúc sư phân phối', goal: 'Điều chỉnh tham số để xây phân phối đúng yêu cầu, rồi chạy mô phỏng đối chiếu.', genre: 'Simulation – Phân phối', lvl: 'Vừa', ready: true },
    colony: { name: 'Colony Survival', vi: 'Sinh tồn trên Sao Hỏa', goal: 'Lấy mẫu, dựng khoảng tin cậy và quyết định lượng nước dự trữ.', genre: 'Strategy – Ước lượng', lvl: 'Khó', ready: false },
    reactor: { name: 'Reactor Crisis', vi: 'Khủng hoảng lò phản ứng', goal: 'Kiểm định giả thiết dưới áp lực thời gian để quyết định vận hành hay an toàn.', genre: 'Time Challenge – Kiểm định', lvl: 'Khó', ready: false }
  };
  const cover = id => ({
    dice: `<svg viewBox="0 0 320 150" class="cv"><defs><linearGradient id="c1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset="1" stop-color="#0e7490"/></linearGradient></defs><rect width="320" height="150" fill="url(#c1)"/><path d="M10 120 Q80 60 150 100 T310 50" stroke="#22d3ee" stroke-width="6" fill="none" stroke-dasharray="2 12" stroke-linecap="round"/><g transform="translate(40,30) rotate(-12)"><rect width="48" height="48" rx="9" fill="#fff"/><circle cx="14" cy="14" r="5" fill="#111"/><circle cx="34" cy="34" r="5" fill="#111"/><circle cx="24" cy="24" r="5" fill="#111"/></g><g transform="translate(100,50) rotate(10)"><rect width="48" height="48" rx="9" fill="#fff"/><circle cx="14" cy="14" r="5" fill="#111"/><circle cx="34" cy="14" r="5" fill="#111"/><circle cx="14" cy="34" r="5" fill="#111"/><circle cx="34" cy="34" r="5" fill="#111"/></g><g transform="translate(250,40) rotate(35)"><path d="M0 0 L30 12 L0 24 L6 12Z" fill="#fbbf24"/><circle cx="26" cy="12" r="4" fill="#22d3ee"/></g><circle cx="290" cy="110" r="10" fill="#fbbf24"/></svg>`,
    vault: `<svg viewBox="0 0 320 150" class="cv"><defs><linearGradient id="c2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#312e81"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs><rect width="320" height="150" fill="url(#c2)"/><rect x="95" y="40" width="130" height="90" rx="14" fill="rgba(180,220,255,.18)" stroke="#a5f3fc" stroke-width="3"/>${[[125, 100, '#ef4444'], [155, 105, '#3b82f6'], [185, 100, '#22c55e'], [140, 78, '#facc15'], [170, 80, '#ef4444'], [200, 82, '#3b82f6'], [128, 62, '#22c55e']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="13" fill="${c}"/><circle cx="${x - 4}" cy="${y - 4}" r="4" fill="#fff" opacity=".6"/>`).join('')}<path d="M160 10 v28 M148 38 h24 l-6 10 h-12z" stroke="#fbbf24" stroke-width="5" fill="#fbbf24"/><rect x="20" y="85" width="50" height="50" rx="8" fill="#334155" stroke="#fbbf24" stroke-width="3"/><circle cx="45" cy="110" r="10" fill="none" stroke="#fbbf24" stroke-width="3"/></svg>`,
    detective: `<svg viewBox="0 0 320 150" class="cv"><rect width="320" height="150" fill="#0f172a"/><circle cx="110" cy="75" r="62" fill="#052e2b" stroke="#34d399" stroke-width="3"/><circle cx="110" cy="75" r="40" fill="none" stroke="#34d399" opacity=".5"/><circle cx="110" cy="75" r="18" fill="none" stroke="#34d399" opacity=".5"/><path d="M110 75 L160 40" stroke="#6ee7b7" stroke-width="3"/><circle cx="140" cy="55" r="6" fill="#f472b6"/><rect x="200" y="25" width="100" height="100" rx="8" fill="#1e293b" stroke="#a78bfa"/><path d="M215 50 h60 M215 70 h45 M215 90 h70" stroke="#a78bfa" stroke-width="4"/><circle cx="285" cy="35" r="5" fill="#ef4444"/></svg>`,
    arch: `<svg viewBox="0 0 320 150" class="cv"><rect width="320" height="150" fill="#1e1b4b"/>${Array.from({ length: 15 }, (_, i) => { const h = 12 + 90 * Math.exp(-((i - 7) ** 2) / 14); return `<rect x="${30 + i * 18}" y="${130 - h}" width="13" height="${h}" rx="3" fill="${i % 2 ? '#22d3ee' : '#a78bfa'}"/>`; }).join('')}<path d="M30 126 C90 120 120 30 160 30 S230 120 290 126" stroke="#fbbf24" stroke-width="3" fill="none"/><rect x="240" y="10" width="70" height="26" rx="6" fill="#0f172a" stroke="#22d3ee"/><circle cx="256" cy="23" r="6" fill="#22d3ee"/><rect x="268" y="21" width="34" height="4" rx="2" fill="#22d3ee"/></svg>`,
    colony: `<svg viewBox="0 0 320 150" class="cv"><defs><linearGradient id="c5" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c2d12"/><stop offset="1" stop-color="#431407"/></linearGradient></defs><rect width="320" height="150" fill="url(#c5)"/><circle cx="270" cy="30" r="14" fill="#fde68a"/><path d="M0 120 Q80 100 160 118 T320 112 V150 H0z" fill="#9a3412"/><path d="M80 118 a40 40 0 0 1 80 0z" fill="rgba(165,243,252,.35)" stroke="#a5f3fc" stroke-width="3"/><rect x="175" y="90" width="26" height="28" rx="4" fill="#38bdf8"/><path d="M180 100 h16" stroke="#fff" stroke-width="3"/></svg>`,
    reactor: `<svg viewBox="0 0 320 150" class="cv"><rect width="320" height="150" fill="#111827"/><circle cx="160" cy="80" r="46" fill="#7f1d1d" stroke="#f87171" stroke-width="4"/><circle cx="160" cy="80" r="26" fill="#fb923c"/><circle cx="160" cy="80" r="10" fill="#fef08a"/><rect x="20" y="30" width="70" height="40" rx="6" fill="#0f172a" stroke="#22d3ee"/><path d="M26 60 l12 -14 l12 8 l12 -18 l16 14" stroke="#22d3ee" stroke-width="3" fill="none"/><circle cx="260" cy="40" r="12" fill="#ef4444"/><rect x="230" y="90" width="64" height="30" rx="6" fill="#0f172a" stroke="#facc15"/><text x="262" y="112" fill="#facc15" font-size="16" text-anchor="middle" font-family="monospace">00:30</text></svg>`
  })[id];
  const planetSvg = (i, size = 110) => {
    const [a, b, c] = PLANETS[i][3], id = 'pl' + i;
    const extra = [`<ellipse cx="45" cy="40" rx="30" ry="6" fill="#fff" opacity=".35"/><ellipse cx="62" cy="62" rx="26" ry="5" fill="#fff" opacity=".25"/>`, `<rect x="0" y="35" width="120" height="9" fill="#fff" opacity=".18"/><rect x="0" y="56" width="120" height="12" fill="#7c2d12" opacity=".35"/><rect x="0" y="80" width="120" height="8" fill="#fff" opacity=".15"/>`, `<ellipse cx="60" cy="60" rx="58" ry="12" fill="none" stroke="#e9d5ff" stroke-width="5" transform="rotate(-22 60 60)" opacity=".8"/>`, `<circle cx="40" cy="45" r="9" fill="#052e16" opacity=".35"/><circle cx="72" cy="72" r="12" fill="#052e16" opacity=".35"/><circle cx="82" cy="38" r="6" fill="#052e16" opacity=".35"/>`, `<path d="M20 70 Q60 50 100 74" stroke="#450a0a" stroke-width="5" fill="none" opacity=".5"/><circle cx="48" cy="40" r="7" fill="#450a0a" opacity=".4"/>`, `<path d="M10 50 Q60 30 110 55 M5 75 Q60 60 115 80" stroke="#fff" stroke-width="4" fill="none" opacity=".4"/>`, `<circle cx="100" cy="24" r="9" fill="#e5e7eb"/><rect x="0" y="48" width="120" height="10" fill="#fff" opacity=".2"/>`][i];
    return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" class="planet"><defs><radialGradient id="${id}" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient><clipPath id="${id}c"><circle cx="60" cy="60" r="50"/></clipPath></defs><circle cx="60" cy="60" r="50" fill="url(#${id})"/><g clip-path="url(#${id}c)">${extra}</g><circle cx="60" cy="60" r="50" fill="none" stroke="#fff" opacity=".25"/></svg>`;
  };

  // ---------- Màn hình kết thúc dùng chung ----------
  function endScreen(host, { win, title, text, explain, stars, id, again, exit }) {
    let award = 0; if (win && stars && !host._awarded) { host._awarded = true; award = stars; Stars.add(stars); }
    const o = el(`<div class="endscreen ${win ? 'win' : 'lose'}" role="dialog"><div class="endcard glass dark"><div class="big-emoji">${win ? '🏆' : '💥'}</div><h2>${esc(title)}</h2><p>${text}</p>${award ? `<div class="starsgain">+${award} ⭐ vào Hũ sao</div>` : win ? '<div class="muted">Bạn đã nhận sao ở lần chơi này rồi.</div>' : ''}
      <div class="explain rich"><h4>📚 Kiến thức Xác suất – Thống kê vận dụng</h4>${explain.replace(/\\\((.+?)\\\)/g, (m, a) => Rich.mathOnly(a, false)).replace(/\\\[(.+?)\\\]/g, (m, a) => Rich.mathOnly(a, true))}</div><div class="row center wrap"><button class="btn primary big" data-again>↻ Chơi lại</button><button class="btn ghost big" data-exit>🪐 Về bản đồ vũ trụ</button></div></div></div>`);
    $('[data-again]', o).onclick = () => { o.remove(); again(); }; $('[data-exit]', o).onclick = exit; host.appendChild(o);
  }
  const frac = (a, b) => `\\frac{${a}}{${b}}`;

  // ================= GAME 1: COSMIC DICE RUSH =================
  const PRED = [
    { id: 'sum7', t: 'Tổng = 7', p: 6 / 36, pt: R`\frac{6}{36}`, mv: 6, f: (a, b) => a + b === 7 },
    { id: 'dbl', t: 'Hai mặt giống nhau', p: 6 / 36, pt: R`\frac{6}{36}`, mv: 6, f: (a, b) => a === b },
    { id: 'ge9', t: 'Tổng ≥ 9', p: 10 / 36, pt: R`\frac{10}{36}`, mv: 4, f: (a, b) => a + b >= 9 },
    { id: 'le5', t: 'Tổng ≤ 5', p: 10 / 36, pt: R`\frac{10}{36}`, mv: 4, f: (a, b) => a + b <= 5 },
    { id: 'even', t: 'Tổng chẵn', p: 18 / 36, pt: R`\frac{18}{36}`, mv: 2, f: (a, b) => (a + b) % 2 === 0 }
  ];
  function playDice(host, api) {
    const GOAL = 12, TURNS = 12, ways = s => 6 - Math.abs(s - 7);
    let pos = 0, left = TURNS, pred = null, busy = false, over = false, showP = true; const cnt = Array(13).fill(0); let total = 0, hits = 0;
    host.innerHTML = `<div class="gplay dice"><div class="gtop"><div class="mission"><b>🎯 Nhiệm vụ:</b> Đưa tàu thăm dò tới ô <b>${GOAL}</b> trong <b>${TURNS}</b> lượt. Mỗi lượt <b>dự đoán trước</b> rồi tung 2 xúc xắc: đoán đúng thì tàu tiến số ô thưởng (dự đoán càng khó, thưởng càng lớn); đoán sai tàu đứng yên.</div>
      <div class="hud"><span>Lượt còn lại: <b id="dl">${left}</b></span><span>Vị trí: <b id="dp">0</b>/${GOAL}</span><span>Đoán đúng: <b id="dh">0</b>/<b id="dt">0</b></span></div></div>
      <div class="track" id="track">${Array.from({ length: GOAL + 1 }, (_, i) => `<div class="cell ${i === 0 ? 'start' : i === GOAL ? 'finish' : ''}">${i === 0 ? 'XUẤT PHÁT' : i === GOAL ? '🏁' : i}</div>`).join('')}<div class="ship" id="ship"><svg viewBox="0 0 60 40" width="54" height="36"><defs><linearGradient id="sg" x1="0" x2="1"><stop offset="0" stop-color="#e0e7ff"/><stop offset="1" stop-color="#818cf8"/></linearGradient></defs><path d="M2 20 L22 6 H46 L58 20 L46 34 H22Z" fill="url(#sg)" stroke="#fff" stroke-width="1.5"/><circle cx="40" cy="20" r="7" fill="#22d3ee"/><path d="M2 20 L-8 14 V26Z" fill="#fb923c"/></svg></div></div>
      <div class="arena"><div class="dice-stage"><div id="d1"></div><div id="d2"></div><div class="sumshow" id="sumshow">Tổng: –</div></div>
        <div class="predbox"><b>1) Chọn dự đoán</b><div class="preds">${PRED.map(p => `<button class="pred" data-p="${p.id}"><span>${p.t}</span><small class="pp">xác suất ${Rich.mathOnly(p.pt)} · thưởng +${p.mv} ô</small></button>`).join('')}</div>
          <label class="check small"><input type="checkbox" id="showp" checked/> Hiện xác suất lý thuyết (tắt để chơi khó hơn)</label><button class="btn primary big" id="roll" disabled>🎲 2) Tung xúc xắc</button><div class="gmsg" id="gmsg" aria-live="polite">Hãy chọn một dự đoán.</div></div></div>
      <div class="histwrap"><h4>📊 Tần suất thực nghiệm (cột đậm) so với xác suất lý thuyết (vạch vàng) — <span id="hn">0 lần tung</span></h4><div class="hist" id="hist"></div></div></div>`;
    const d1 = $('#d1', host), d2 = $('#d2', host); d1.innerHTML = Dice.cube(3, 84); d2.innerHTML = Dice.cube(4, 84);
    const setHud = () => { $('#dl', host).textContent = left; $('#dp', host).textContent = pos; $('#dh', host).textContent = hits; $('#dt', host).textContent = total; };
    const place = () => { const tr = $('#track', host), c = tr.children[pos], s = $('#ship', host); s.style.transform = `translate(${c.offsetLeft + c.offsetWidth / 2 - 27}px, ${c.offsetTop - 14}px)`; };
    const hist = () => { const mx = Math.max(.2, ...cnt.map((c, s) => total ? c / total : 0), ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(s => ways(s) / 36)); $('#hist', host).innerHTML = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(s => { const e = total ? cnt[s] / total : 0, t = ways(s) / 36; return `<div class="hcol"><div class="hbar" style="height:${e / mx * 100}%"><i>${total ? Math.round(e * 100) + '%' : ''}</i></div><div class="htheo" style="bottom:${t / mx * 100}%"></div><span>${s}</span></div>`; }).join(''); $('#hn', host).textContent = total + ' lần tung'; };
    const syncP = () => $$('.pp', host).forEach(e => e.style.visibility = showP ? 'visible' : 'hidden'); $('#showp', host).onchange = e => { showP = e.target.checked; syncP(); };
    $$('.pred', host).forEach(b => b.onclick = () => { if (busy || over) return; pred = PRED.find(p => p.id === b.dataset.p); $$('.pred', host).forEach(x => x.classList.toggle('on', x === b)); $('#roll', host).disabled = false; $('#gmsg', host).textContent = 'Bạn dự đoán: ' + pred.t + '. Bấm tung!'; });
    $('#roll', host).onclick = async () => {
      if (busy || over || !pred) return; busy = true; $('#roll', host).disabled = true; $$('.pred', host).forEach(b => b.disabled = true);
      const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6); $('#gmsg', host).textContent = 'Xúc xắc đang lăn…';
      await Promise.all([Dice.roll($('.die-wrap', d1), a, 1300), Dice.roll($('.die-wrap', d2), b, 1500)]);
      const s = a + b, ok = pred.f(a, b); cnt[s]++; total++; left--; if (ok) hits++; $('#sumshow', host).innerHTML = `Tổng: <b>${s}</b> (${a} + ${b})`;
      if (ok) { pos = Math.min(GOAL, pos + pred.mv); $('#gmsg', host).innerHTML = `✅ Đúng! "${pred.t}" xảy ra. Tàu tiến <b>+${pred.mv}</b> ô.`; $('#ship', host).classList.add('boost'); setTimeout(() => $('#ship', host).classList.remove('boost'), 900); } else $('#gmsg', host).innerHTML = `❌ Chưa đúng — "${pred.t}" không xảy ra lần này. Tàu đứng yên.`;
      place(); setHud(); hist(); pred = null; $$('.pred', host).forEach(x => { x.classList.remove('on'); x.disabled = false; }); busy = false;
      if (pos >= GOAL || left <= 0) { over = true; await sleep(700); finish(); } else $('#gmsg', host).innerHTML += ' Chọn dự đoán cho lượt tiếp theo.';
    };
    function finish() {
      const win = pos >= GOAL, emp = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(s => `${s}: ${cnt[s]}`).join(' · ');
      const ev = PRED.map(p => p.p * p.mv);
      endScreen(host, {
        win, id: 'dice', stars: win ? 3 : pos >= 8 ? 1 : 0, title: win ? 'Tàu đã về đích! 🚀' : 'Hết lượt rồi!', text: win ? `Bạn đưa tàu tới đích sau ${TURNS - left} lượt, đoán đúng ${hits}/${total} lần.` : `Tàu dừng ở ô ${pos}/${GOAL}. Bạn đoán đúng ${hits}/${total} lần.`,
        explain: `<p>Số lần mỗi tổng bạn đã tung: ${emp}.</p><p>Với hai xúc xắc cân đối, 36 kết quả đồng khả năng nên \\(P(\\text{tổng}=7)=${frac(6, 36)}=${frac(1, 6)}\\), \\(P(\\text{tổng}\\ge 9)=${frac(10, 36)}\\), \\(P(\\text{tổng chẵn})=${frac(18, 36)}=\\frac{1}{2}\\).</p><p>Mức thưởng được thiết kế tỉ lệ nghịch với xác suất nên kỳ vọng số ô tiến mỗi lượt đều xấp xỉ nhau: \\(E=p\\cdot m\\) ≈ ${ev.map(x => x.toFixed(2)).join('; ')} ô. Vì vậy chiến thắng phụ thuộc nhiều vào may rủi lẫn cách chấp nhận rủi ro.</p><p><b>Luật số lớn:</b> tung càng nhiều lần, tần suất thực nghiệm càng gần xác suất lý thuyết; với ít lượt, chênh lệch lớn là bình thường.</p>`,
        again: () => playDice(host, api), exit: api.exit
      });
    }
    syncP(); hist(); setHud(); setTimeout(place, 50); addEventListener('resize', place);
  }

  // ================= GAME 2: LUCKY VAULT =================
  const COLS = { red: ['Đỏ', '#ef4444'], blue: ['Xanh dương', '#3b82f6'], green: ['Xanh lá', '#22c55e'], gold: ['Vàng', '#facc15'] };
  const VLV = [
    { name: 'Màn 1 — Rút KHÔNG hoàn lại', replace: false, box: { red: 4, blue: 3, green: 2, gold: 1 }, need: { red: 2, gold: 1 }, turns: 6 },
    { name: 'Màn 2 — Rút CÓ hoàn lại', replace: true, box: { red: 3, blue: 3, green: 2, gold: 2 }, need: { red: 2, green: 1, gold: 1 }, turns: 8 }
  ];
  function playVault(host, api, li = 0) {
    const L = VLV[li]; let bag = []; Object.entries(L.box).forEach(([c, n]) => { for (let i = 0; i < n; i++) bag.push(c); });
    let got = {}, left = L.turns, chain = [], over = false, busy = false, showP = true;
    const total0 = bag.length;
    host.innerHTML = `<div class="gplay vault"><div class="gtop"><div class="mission"><b>🎯 ${L.name}.</b> Thu thập: ${Object.entries(L.need).map(([c, n]) => `<span class="need" style="--c:${COLS[c][1]}">${n} ${COLS[c][0]}</span>`).join(' ')} trong <b>${L.turns}</b> lượt để mở cửa kho báu. ${L.replace ? 'Bóng rút ra được <b>trả lại</b> hộp.' : 'Bóng đã rút <b>không</b> trả lại.'}</div><div class="hud"><span>Lượt còn lại: <b id="vl">${left}</b></span><label class="check small"><input type="checkbox" id="vp" checked/> Hiện xác suất</label></div></div>
      <div class="vroom"><div class="glassbox" id="gbox"></div><div class="vcontrol"><div class="crane">⚙️</div><button class="btn primary big" id="draw">🕹 Rút một bóng</button><div class="gmsg" id="vmsg" aria-live="polite"></div>
        <div class="tray"><b>Khay vật phẩm</b><div id="tray"></div></div><div class="vault-door" id="door"><div class="door-in">🔒</div></div></div></div>
      <div class="chainbox"><h4>🧮 Xác suất theo từng lượt (quy tắc nhân)</h4><div id="chain" class="rich muted">Chưa rút bóng nào.</div></div></div>`;
    const drawBox = () => { const counts = bag.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), {}); $('#gbox', host).innerHTML = bag.map((c, i) => `<i class="ball" style="--c:${COLS[c][1]};--d:${(i % 7) * .15}s" title="${COLS[c][0]}"></i>`).join('') + (showP ? `<div class="bcount">${Object.keys(COLS).map(c => `<span style="--c:${COLS[c][1]}">${COLS[c][0]}: ${counts[c] || 0}/${bag.length}</span>`).join('')}</div>` : ''); };
    const drawTray = () => { $('#tray', host).innerHTML = Object.keys(COLS).map(c => { const n = got[c] || 0, nd = L.need[c]; return `<div class="slot" style="--c:${COLS[c][1]}"><i class="ball sm"></i> ${COLS[c][0]}: <b>${n}</b>${nd ? ` / ${nd} ${n >= nd ? '✅' : ''}` : ''}</div>`; }).join(''); $('#vl', host).textContent = left; };
    const done = () => Object.entries(L.need).every(([c, n]) => (got[c] || 0) >= n);
    $('#vp', host).onchange = e => { showP = e.target.checked; drawBox(); };
    $('#draw', host).onclick = async () => {
      if (busy || over) return; busy = true; const i = Math.floor(Math.random() * bag.length), c = bag[i], n = bag.filter(x => x === c).length, N = bag.length;
      const balls = $$('.ball', $('#gbox', host)); if (balls[i]) balls[i].classList.add('picked'); await sleep(650);
      chain.push({ c, n, N }); got[c] = (got[c] || 0) + 1; left--; if (!L.replace) bag.splice(i, 1);
      $('#vmsg', host).innerHTML = `Bạn rút được bóng <b style="color:${COLS[c][1]}">${COLS[c][0]}</b>! (xác suất rút được màu này là ${n}/${N})`; drawBox(); drawTray();
      const num = chain.map(x => x.n).join('\\cdot'), den = chain.map(x => x.N).join('\\cdot'), prod = chain.reduce((a, x) => a * x.n / x.N, 1);
      $('#chain', host).innerHTML = chain.map((x, k) => `<div>Lượt ${k + 1}: \\(P(\\text{${COLS[x.c][0]}})=${frac(x.n, x.N)}\\)</div>`).map(Rich.html).join('') + Rich.html(`Xác suất của đúng chuỗi ${chain.length} lượt bạn đã rút: \\[${chain.map(x => frac(x.n, x.N)).join('\\cdot')}=${prod.toFixed(5)}\\]`);
      busy = false;
      if (done()) { over = true; $('#door', host).classList.add('open'); $('#door .door-in', host).textContent = '💎'; await sleep(900); end(true); } else if (left <= 0) { over = true; end(false); }
    };
    function end(win) {
      endScreen(host, {
        win, id: 'vault', stars: win ? (li === 0 ? 2 : 3) : 0, title: win ? 'Cửa kho báu đã mở! 💎' : 'Kho vẫn đóng…', text: win ? `Bạn thu thập đủ vật phẩm sau ${L.turns - left} lượt.` : 'Hết lượt mà chưa đủ vật phẩm. Thử chiến thuật khác nhé!',
        explain: `<p>${L.replace ? 'Rút <b>có hoàn lại</b>: các lượt <b>độc lập</b>, xác suất mỗi màu không đổi qua các lượt, \\(P(A_1\\cap A_2)=P(A_1)P(A_2)\\).' : 'Rút <b>không hoàn lại</b>: các lượt <b>phụ thuộc</b>. Sau mỗi lần rút, thành phần hộp thay đổi nên dùng <b>xác suất có điều kiện</b>: \\(P(A_1\\cap A_2)=P(A_1)\\,P(A_2\\mid A_1)\\).'}</p><p>Ví dụ: ${L.replace ? '' : 'với hộp ban đầu 4 đỏ trong 10 bóng, \\(P(\\text{đỏ, đỏ})=\\frac{4}{10}\\cdot\\frac{3}{9}=\\frac{2}{15}\\).'} Xác suất của cả chuỗi bạn vừa rút được nhân dần ở khung “quy tắc nhân”.</p>`,
        again: () => playVault(host, api, li), exit: api.exit
      });
      if (win && li === 0) { const nx = el('<div class="row center"><button class="btn ok big">➡ Sang Màn 2 (rút có hoàn lại)</button></div>'); $('.endcard', host).appendChild(nx); $('button', nx).onclick = () => { $('.endscreen', host).remove(); playVault(host, api, 1); }; }
    }
    drawBox(); drawTray();
  }

  // ================= GAME 4: DISTRIBUTION ARCHITECT =================
  const Phi = z => NM.Phi(z);
  const MISSIONS = [
    { type: 'bin', title: 'Nhị thức: E(X) = 12 và Var(X) = 7,2', hint: 'Với X ~ B(n,p): E(X)=np và Var(X)=npq (q=1−p). Chia Var cho E để tìm q.', init: { n: 20, p: .5 }, check: s => Math.abs(s.mean - 12) < .08 && Math.abs(s.varr - 7.2) < .12, stat: s => `E = ${s.mean.toFixed(2)} · Var = ${s.varr.toFixed(2)}` },
    { type: 'poi', title: 'Poisson: P(X ≥ 1) ≈ 0,95', hint: 'P(X ≥ 1) = 1 − P(X = 0) = 1 − e^(−λ). Giải e^(−λ) = 0,05.', init: { l: 1 }, check: s => Math.abs(s.target - .95) < .004, stat: s => `P(X ≥ 1) = ${s.target.toFixed(4)}` },
    { type: 'nor', title: 'Chuẩn: μ = 100 và P(X > 130) ≈ 0,0228', hint: 'P(X>130)=1−Φ((130−μ)/σ). Φ(2)=0,9772 nên cần (130−100)/σ = 2.', init: { mu: 100, sd: 25 }, check: s => Math.abs(s.mu - 100) < 1 && Math.abs(s.target - .0228) < .002, stat: s => `P(X > 130) = ${s.target.toFixed(4)}` }
  ];
  function playArch(host, api, mi = 0) {
    const M0 = MISSIONS[mi]; const st = { ...M0.init }; let sim = null, done = false;
    const ctrl = M0.type === 'bin' ? [['n', 'Số phép thử n', 1, 60, 1], ['p', 'Xác suất p', .01, .99, .01]] : M0.type === 'poi' ? [['l', 'Tham số λ', .1, 12, .1]] : [['mu', 'Trung bình μ', 50, 150, 1], ['sd', 'Độ lệch chuẩn σ', 5, 30, .5]];
    host.innerHTML = `<div class="gplay arch"><div class="gtop"><div class="mission"><b>🎯 Nhiệm vụ ${mi + 1}/3:</b> ${M0.title}</div><div class="hud"><span id="astat"></span></div></div>
      <div class="lab"><div class="chartbox"><svg id="chart" viewBox="0 0 560 260" preserveAspectRatio="xMidYMid meet"></svg><div class="legend"><span><i style="background:#a78bfa"></i>Lý thuyết</span><span><i style="background:#fbbf24"></i>Mô phỏng thực nghiệm</span></div></div>
        <div class="panelc"><b>🎛 Bảng điều khiển</b>${ctrl.map(([k, t, mn, mx, sp]) => `<label>${t}: <b id="v_${k}">${st[k]}</b><input type="range" data-k="${k}" min="${mn}" max="${mx}" step="${sp}" value="${st[k]}"/></label>`).join('')}
          <div class="row wrap"><button class="btn ghost" id="sim">🧪 Chạy mô phỏng (1000 mẫu)</button><button class="btn ghost" id="hint">💡 Gợi ý</button><button class="btn primary" id="submit">✔ Nộp phân phối</button></div><div class="gmsg" id="amsg" aria-live="polite"></div><div class="rich small" id="hintbox" hidden>${esc(M0.hint)}</div></div></div></div>`;
    const stats = () => {
      if (M0.type === 'bin') { const { n, p } = st; return { mean: n * p, varr: n * p * (1 - p), target: 0 }; }
      if (M0.type === 'poi') return { mean: st.l, varr: st.l, target: 1 - Math.exp(-st.l) };
      return { mean: st.mu, varr: st.sd ** 2, mu: st.mu, target: 1 - Phi((130 - st.mu) / st.sd) };
    };
    const draw = () => {
      const s = stats(); $('#astat', host).textContent = M0.stat({ ...s, mu: st.mu }); const W = 560, H = 260, pad = 30; let bars = [], curve = '', xs, maxY;
      if (M0.type === 'nor') {
        const lo = 20, hi = 180, f = x => Math.exp(-0.5 * ((x - st.mu) / st.sd) ** 2) / (st.sd * Math.sqrt(2 * Math.PI)); maxY = Math.max(f(st.mu), .04) * 1.1;
        const X = x => pad + (x - lo) / (hi - lo) * (W - 2 * pad), Y = y => H - pad - y / maxY * (H - 2 * pad); let d = '', tail = '';
        for (let x = lo; x <= hi; x += 1) { d += (x === lo ? 'M' : 'L') + X(x).toFixed(1) + ' ' + Y(f(x)).toFixed(1); if (x >= 130) tail += (x === 130 ? 'M' + X(130) + ' ' + Y(0) + ' L' : 'L') + X(x).toFixed(1) + ' ' + Y(f(x)).toFixed(1); } tail += `L${X(hi)} ${Y(0)}Z`;
        let hb = ''; if (sim) { const bins = 32, w = (hi - lo) / bins, c = Array(bins).fill(0); sim.forEach(v => { const b = Math.floor((v - lo) / w); if (b >= 0 && b < bins) c[b]++; }); hb = c.map((n, i) => { const den = n / sim.length / w; return `<rect x="${X(lo + i * w) + 1}" y="${Y(den)}" width="${(W - 2 * pad) / bins - 2}" height="${H - pad - Y(den)}" fill="#fbbf24" opacity=".55"/>`; }).join(''); }
        $('#chart', host).innerHTML = `${hb}<path d="${tail}" fill="rgba(244,114,182,.5)"/><path d="${d}" fill="none" stroke="#a78bfa" stroke-width="3"/><path d="M${pad} ${H - pad}H${W - pad}" stroke="#94a3b8"/>${[40, 70, 100, 130, 160].map(t => `<text x="${X(t)}" y="${H - 8}" fill="#cbd5e1" font-size="11" text-anchor="middle">${t}</text>`).join('')}<line x1="${X(130)}" x2="${X(130)}" y1="${pad}" y2="${H - pad}" stroke="#f472b6" stroke-dasharray="4"/>`;
        return;
      }
      const K = M0.type === 'bin' ? st.n : Math.max(14, Math.ceil(st.l + 6 * Math.sqrt(st.l) + 2)); const pm = k => M0.type === 'bin' ? NM.binom(k, st.n, st.p) : NM.pois(k, st.l);
      const th = Array.from({ length: K + 1 }, (_, k) => pm(k)), emp = sim ? Array.from({ length: K + 1 }, (_, k) => sim.filter(v => v === k).length / sim.length) : null; maxY = Math.max(.05, ...th, ...(emp || [0])) * 1.1;
      const bw = (W - 2 * pad) / (K + 1);
      bars = th.map((v, k) => { const hh = v / maxY * (H - 2 * pad), x = pad + k * bw; return `<rect x="${x + 1}" y="${H - pad - hh}" width="${bw * .46}" height="${hh}" rx="2" fill="#a78bfa"/>${emp ? `<rect x="${x + bw * .5}" y="${H - pad - emp[k] / maxY * (H - 2 * pad)}" width="${bw * .46}" height="${emp[k] / maxY * (H - 2 * pad)}" rx="2" fill="#fbbf24" opacity=".85"/>` : ''}${K <= 30 || k % 5 === 0 ? `<text x="${x + bw / 2}" y="${H - 10}" fill="#cbd5e1" font-size="10" text-anchor="middle">${k}</text>` : ''}`; }).join('');
      $('#chart', host).innerHTML = bars + `<path d="M${pad} ${H - pad}H${W - pad}" stroke="#94a3b8"/>`;
    };
    $$('[data-k]', host).forEach(r => r.oninput = () => { st[r.dataset.k] = +r.value; $('#v_' + r.dataset.k, host).textContent = (+r.value).toFixed(r.step < 1 ? (r.step < .1 ? 2 : 1) : 0); sim = null; draw(); });
    $('#hint', host).onclick = () => { $('#hintbox', host).hidden = false; $('#hintbox', host).innerHTML = Rich.html(M0.hint.replace(/E\(X\)=np/, '\\(E(X)=np\\)')); };
    $('#sim', host).onclick = () => {
      const N = 1000, out = [], rnd = Math.random;
      for (let i = 0; i < N; i++) { if (M0.type === 'bin') { let c = 0; for (let j = 0; j < st.n; j++) if (rnd() < st.p) c++; out.push(c); } else if (M0.type === 'poi') { const Lm = Math.exp(-st.l); let k = 0, p = 1; do { k++; p *= rnd(); } while (p > Lm); out.push(k - 1); } else { const u = 1 - rnd(), v = rnd(); out.push(st.mu + st.sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)); } }
      sim = out; const m = out.reduce((a, b) => a + b, 0) / N, vv = out.reduce((a, b) => a + (b - m) ** 2, 0) / (N - 1), s = stats(); draw();
      $('#amsg', host).innerHTML = `🧪 Mô phỏng ${N} mẫu: trung bình mẫu = <b>${m.toFixed(2)}</b> (lý thuyết ${s.mean.toFixed(2)}), phương sai mẫu = <b>${vv.toFixed(2)}</b> (lý thuyết ${s.varr.toFixed(2)}).`;
    };
    $('#submit', host).onclick = () => {
      if (done) return; const s = stats(); s.mu = st.mu;
      if (!M0.check(s)) { $('#amsg', host).innerHTML = '❌ Chưa đạt yêu cầu. Hãy quan sát giá trị thống kê phía trên và thử điều chỉnh tham số (có nút Gợi ý).'; return; }
      done = true; const key = 'arch' + mi; if (!Stars.done(key)) { Stars.mark(key); Stars.add(1); } $('#amsg', host).innerHTML = '✅ Chính xác! +1 ⭐ (mỗi nhiệm vụ chỉ nhận sao một lần).';
      setTimeout(() => {
        const last = mi === MISSIONS.length - 1;
        endScreen(host, { win: true, id: 'arch', stars: last ? 1 : 0, title: last ? 'Hoàn thành mọi nhiệm vụ! 🏗️' : 'Nhiệm vụ hoàn thành!', text: M0.title,
          explain: M0.type === 'bin' ? `<p>\\(X\\sim B(n,p)\\): \\(E(X)=np\\), \\(\\operatorname{Var}(X)=np(1-p)\\). Từ \\(np=12\\) và \\(np(1-p)=7{,}2\\) suy ra \\(1-p=0{,}6\\), \\(p=0{,}4\\), \\(n=30\\).</p>` : M0.type === 'poi' ? `<p>\\(X\\sim\\mathcal{P}(\\lambda)\\): \\(P(X\\ge 1)=1-e^{-\\lambda}\\). Cho bằng 0,95 được \\(\\lambda=\\ln 20\\approx 3{,}00\\). Với Poisson \\(E(X)=\\operatorname{Var}(X)=\\lambda\\).</p>` : `<p>\\(X\\sim N(\\mu,\\sigma^2)\\), \\(Z=\\frac{X-\\mu}{\\sigma}\\). \\(P(X>130)=1-\\Phi\\left(\\frac{130-100}{\\sigma}\\right)\\approx 0{,}0228\\) khi \\(\\sigma=15\\) vì \\(\\Phi(2)\\approx0{,}9772\\).</p>`,
          again: () => playArch(host, api, last ? 0 : mi + 1), exit: api.exit });
        if (!last) { $('[data-again]', host).textContent = '➡ Nhiệm vụ tiếp theo'; }
      }, 600);
    };
    draw();
  }

  // ================= BẢN ĐỒ + MÀN HÌNH CHƠI =================
  const PLAY = { dice: playDice, vault: playVault, arch: playArch };
  let groot;
  function drawMap(p) {
    groot.innerHTML = `<div class="page-head">${backBtn()}<div><h2>AI CLASSROOM – ÔN LUYỆN</h2><p class="muted">Chọn một hành tinh để khám phá các trò chơi Xác suất – Thống kê.</p></div><div class="starjar" id="jar" title="Hũ sao tích lũy">Hũ sao tích lũy: ⭐ <b>${Stars.get()}</b></div></div>
      ${p && p.banner ? `<div class="notice ok">🎉 ${esc(p.banner)}${p.topic ? ' Chủ đề vừa học: <b>' + esc(p.topic) + '</b>.' : ''}</div>` : ''}
      <div class="galaxy">${PLANETS.map((pl, i) => `<button class="planet-btn ${pl[4].length ? '' : 'soon'}" data-i="${i}" style="--d:${i * .4}s">${planetSvg(i, 120)}<b>${pl[0]}</b><span>${pl[1]}</span><small>${pl[4].length ? pl[4].length + ' trò chơi' : 'Sắp mở'}</small></button>`).join('')}</div><div id="gl"></div>`;
    $$('[data-i]', groot).forEach(b => b.onclick = () => showPlanet(+b.dataset.i));
    showPlanet(0);
  }
  function showPlanet(i) {
    const pl = PLANETS[i]; $$('.planet-btn', groot).forEach((b, k) => b.classList.toggle('on', k === i));
    if (!pl[4].length) { $('#gl', groot).innerHTML = `<div class="glass dark panel center"><h3>${pl[0]} — ${pl[1]}</h3><p>Hành tinh này chưa có trò chơi trong phiên bản hiện tại. Các trò chơi cho chương này sẽ được mở ở giai đoạn phát triển tiếp theo — hiện chưa phải tính năng hoạt động.</p></div>`; return; }
    $('#gl', groot).innerHTML = `<h3 class="gh">${pl[0]} — ${pl[1]}</h3><div class="gcards">${pl[4].map(id => { const g = GAMES[id]; return `<article class="gcard glass dark ${g.ready ? '' : 'locked'}">${cover(id)}<div class="gbody"><h4>${g.name}</h4><div class="muted small">${g.vi}</div><p>${g.goal}</p><div class="tags"><span class="tag">${g.genre}</span><span class="tag">Độ khó: ${g.lvl}</span><span class="tag ${g.ready ? 'ok' : ''}">${g.ready ? '🔓 Chơi được' : '🔒 Sắp ra mắt'}</span></div><button class="btn ${g.ready ? 'primary' : 'ghost'}" data-g="${id}" ${g.ready ? '' : 'disabled'}>${g.ready ? '▶ Chơi ngay' : 'Đang phát triển'}</button></div></article>`; }).join('')}</div>`;
    $$('[data-g]', groot).forEach(b => b.onclick = () => openGame(b.dataset.g));
  }
  function openGame(id) {
    groot.innerHTML = `<div class="page-head"><button class="btn ghost" id="gback">← Về bản đồ vũ trụ</button><div><h2>${GAMES[id].name}</h2><p class="muted">${GAMES[id].vi}</p></div><div class="starjar">⭐ <b id="jarn">${Stars.get()}</b></div></div><div id="gstage"></div>`;
    const exit = () => drawMap(); $('#gback', groot).onclick = exit; const upd = () => { const n = $('#jarn', groot); if (n) n.textContent = Stars.get(); }; document.addEventListener('stars', upd, { once: false }); groot._upd = upd;
    const host = $('#gstage', groot); host._awarded = false; PLAY[id](host, { exit });
  }
  App.reg('games', { render(root, p) { groot = root; drawMap(p); }, destroy() { if (groot && groot._upd) document.removeEventListener('stars', groot._upd); } });
})();
