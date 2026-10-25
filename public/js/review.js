'use strict';
/* ===== REVIEW: nhật ký phiên học, Ôn tập có biểu đồ, bảng Laplace, TUTOR ===== */
(function () {
  const R = String.raw;
  const RES = { dung: 'Đúng hoàn toàn', can_goi_y: 'Đúng nhưng cần gợi ý', sai_mot_phan: 'Sai một phần', sai: 'Sai' };
  const ERR = ['Khái niệm', 'Công thức', 'Tính toán', 'Đọc đề', 'Thiếu bước', 'Trình bày'];
  const ERRTIP = {
    'Khái niệm': 'Đọc lại định nghĩa và bản chất: phân biệt xác suất biến cố với mật độ xác suất, phương sai tổng thể với phương sai mẫu.',
    'Công thức': 'Lập bảng “dạng bài → công thức → điều kiện áp dụng” và kiểm tra điều kiện trước khi dùng công thức (độc lập? chuẩn? cỡ mẫu lớn?).',
    'Tính toán': 'Viết công thức tổng quát trước khi thay số, không làm tròn sớm, thay ngược kết quả để kiểm tra, chú ý dấu.',
    'Đọc đề': 'Gạch chân dữ kiện và yêu cầu; ký hiệu hóa đề (P(A), X~N(μ,σ²)…) trước khi giải.',
    'Thiếu bước': 'Viết đủ các bước: công thức → thay số → kết quả → kết luận. Dùng quy trình giải toán 4 bước.',
    'Trình bày': 'Ghi rõ ký hiệu, đơn vị và câu kết luận cuối bài.'
  };
  const SUP = { tu_lam: 'Tự làm', goi_y: 'Dùng gợi ý', xem_loi_giai: 'Xem lời giải' };

  const Logs = window.Logs = {
    key() { return 'aic_logs_' + (App.user ? App.user.id : 'guest'); },
    all() { return LS.get(this.key(), []); },
    save(a) { LS.set(this.key(), a.slice(-600)); },
    add(e) {
      const id = rid() + Date.now().toString(36), row = { id, ts: new Date().toISOString(), day: today(), ...e }; const a = this.all(); a.push(row); this.save(a); this.push(row); return id;
    },
    update(id, patch) { const a = this.all(), r = a.find(x => x.id === id); if (!r) return; Object.assign(r, patch); this.save(a); this.push(r); },
    push(r) {
      if (!App.user || !Auth.sb) return;
      Auth.sb.from('study_logs').upsert({ user_id: App.user.id, client_id: r.id, created_at: r.ts, topic: r.topic, chapter: r.chapter, kind: r.kind, result: r.result, support: r.support, error_label: r.error, source: r.source, problem: r.problem, solution: r.solution }, { onConflict: 'user_id,client_id' }).then(() => { });
    },
    async pull() {
      if (!App.user || !Auth.sb) return; const { data } = await Auth.sb.from('study_logs').select('*').eq('user_id', App.user.id).order('created_at').limit(600); if (!data) return;
      const a = this.all(), have = new Set(a.map(x => x.id));
      data.forEach(d => { if (!have.has(d.client_id)) a.push({ id: d.client_id, ts: d.created_at, day: d.created_at.slice(0, 10), topic: d.topic, chapter: d.chapter, kind: d.kind, result: d.result, support: d.support, error: d.error_label, source: d.source, problem: d.problem, solution: d.solution }); });
      a.sort((x, y) => x.ts.localeCompare(y.ts)); this.save(a);
    }
  };

  // dữ liệu mẫu (chỉ để xem thử giao diện, KHÔNG phải kết quả học thật, không lưu)
  function demoLogs() {
    const topics = ['Xác suất có điều kiện', 'Biến ngẫu nhiên', 'Phân phối chuẩn', 'Ước lượng khoảng', 'Kiểm định giả thiết'], out = []; let s = 7; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let d = 13; d >= 0; d--) { const n = 1 + Math.floor(r() * 4); for (let i = 0; i < n; i++) { const t = topics[Math.floor(r() * topics.length)], x = r() * (1 + (13 - d) / 20), res = x > .75 ? 'dung' : x > .4 ? 'can_goi_y' : r() > .5 ? 'sai' : 'sai_mot_phan'; const day = new Date(Date.now() - d * 864e5).toISOString().slice(0, 10); out.push({ id: 'demo' + d + i, ts: day + 'T08:00:00Z', day, topic: t, result: res, support: res === 'dung' ? 'tu_lam' : 'goi_y', error: res.startsWith('sai') ? ERR[Math.floor(r() * 6)] : '', source: 'bai_tap', problem: '(dữ liệu mẫu) ' + t, solution: '', demo: true }); } } return out;
  }
  const dayStr = d => d.toISOString().slice(0, 10);
  const addDays = (s, n) => dayStr(new Date(new Date(s + 'T00:00:00Z').getTime() + n * 864e5));
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

  let rroot, F = { range: '7', from: '', to: '', topic: '', source: '', demo: false }, charts = [];
  function range() { const t = today(); if (F.range === '1') return [t, t]; if (F.range === '7') return [addDays(t, -6), t]; if (F.range === '30') return [addDays(t, -29), t]; return [F.from || addDays(t, -6), F.to || t]; }
  function inRange(l, a, b) { return l.day >= a && l.day <= b && (!F.topic || l.topic === F.topic) && (!F.source || l.source === F.source); }
  function killCharts() { charts.forEach(c => c.destroy()); charts = []; }

  function draw() {
    killCharts(); const base = F.demo ? demoLogs() : Logs.all(), [a, b] = range(), cur = base.filter(l => inRange(l, a, b));
    const len = Math.round((new Date(b) - new Date(a)) / 864e5) + 1, pa = addDays(a, -len), pb = addDays(a, -1), prev = base.filter(l => inRange(l, pa, pb));
    const topics = [...new Set(base.map(l => l.topic))].filter(Boolean);
    const cnt = ls => ({ n: ls.length, dung: ls.filter(l => l.result === 'dung').length, goi: ls.filter(l => l.result === 'can_goi_y').length, sai: ls.filter(l => l.result === 'sai' || l.result === 'sai_mot_phan').length });
    const C = cnt(cur), P = cnt(prev);
    rroot.innerHTML = `<div class="page-head">${backBtn()}<div><h2>Ôn tập – Theo dõi hành trình học tập</h2><p class="muted">Nhìn lại những gì bạn đã học, nhận biết lỗi sai và xác định kiến thức cần ôn tập tiếp theo.</p></div><button class="btn ghost" data-back="home">🏠 Quay về trang chủ</button></div>
      ${F.demo ? '<div class="notice warn"><b>DỮ LIỆU MẪU (DEMO)</b> — các biểu đồ dưới đây chỉ để xem thử giao diện, không phải kết quả học tập thật của bạn.</div>' : ''}
      ${!base.length && !F.demo ? '<div class="notice">Bạn chưa có dữ liệu học tập. Hãy giải một bài ở AI BUDDY – SOLVE rồi quay lại nhé — hoặc bấm “Xem dữ liệu mẫu” để xem thử giao diện.</div>' : ''}
      ${!App.user ? '<div class="notice">Bạn đang dùng tài khoản khách: dữ liệu chỉ lưu trên thiết bị này. Đăng nhập để đồng bộ giữa các thiết bị.</div>' : ''}
      <div class="glass dark panel filters"><label>Khoảng thời gian<select id="fr"><option value="1">Hôm nay</option><option value="7">7 ngày</option><option value="30">30 ngày</option><option value="c">Tùy chọn</option></select></label>
        <span id="fc" ${F.range === 'c' ? '' : 'hidden'}><label>Từ<input type="date" id="ff" value="${a}"/></label><label>Đến<input type="date" id="ft" value="${b}"/></label></span>
        <label>Chủ đề<select id="fto"><option value="">Tất cả</option>${topics.map(t => `<option ${F.topic === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
        <label>Nguồn<select id="fs"><option value="">Tất cả</option><option value="bai_tap" ${F.source === 'bai_tap' ? 'selected' : ''}>Bài tập</option><option value="van_dap" ${F.source === 'van_dap' ? 'selected' : ''}>Vấn đáp</option></select></label>
        <button class="btn ghost" id="fd">${F.demo ? '✕ Tắt dữ liệu mẫu' : '👁 Xem dữ liệu mẫu'}</button></div>
      <div class="cards3"><button class="glass dark panel rc" data-c="today"><h4>📅 Hôm nay bạn đã học gì?</h4><b>${base.filter(l => l.day === today()).length} bài</b><small>Bấm để xem từng mục</small></button><button class="glass dark panel rc" data-c="wrong"><h4>⚠️ Bạn thường sai ở đâu?</h4><b>${C.sai} bài sai trong kỳ</b><small>Nhầm công thức · sai phép tính · chưa hiểu yêu cầu</small></button><button class="glass dark panel rc" data-c="todo"><h4>🎯 Bạn nên ôn tập gì?</h4><b>${topWeak(cur).length} nội dung</b><small>Bấm để xem danh sách & “Ôn tập ngay”</small></button></div>
      <div class="chart-grid">${[['c1', 'Tỷ lệ tự làm đúng theo ngày (%)'], ['c2', 'Đúng / cần gợi ý / sai theo ngày (số bài)'], ['c3', 'Kết quả theo chủ đề (% đúng)'], ['c4', 'Các loại lỗi sai (số lần)'], ['c5', 'Điểm vấn đáp theo thời gian'], ['c6', 'Mức độ tự lập (tự làm / gợi ý / xem lời giải)']].map(([id, t]) => `<div class="glass dark panel chartc"><h4>${t}</h4>${id === 'c5' ? `<div class="muted small">Tính năng vấn đáp lý thuyết thuộc giai đoạn phát triển tiếp theo nên chưa có dữ liệu.</div>` : `<canvas id="${id}" height="200"></canvas>`}</div>`).join('')}</div>
      <div class="glass dark panel" id="cmt"></div><div id="rep"></div>`;
    $('#fr', rroot).value = F.range; $('#fr', rroot).onchange = e => { F.range = e.target.value; draw(); }; $('#ff', rroot) && ($('#ff', rroot).onchange = e => { F.from = e.target.value; F.range = 'c'; draw(); }); $('#ft', rroot) && ($('#ft', rroot).onchange = e => { F.to = e.target.value; F.range = 'c'; draw(); });
    $('#fto', rroot).onchange = e => { F.topic = e.target.value; draw(); }; $('#fs', rroot).onchange = e => { F.source = e.target.value; draw(); }; $('#fd', rroot).onclick = () => { F.demo = !F.demo; draw(); };
    $$('[data-c]', rroot).forEach(b => b.onclick = () => cardDetail(b.dataset.c, base, cur));
    if (typeof Chart === 'undefined') return; Chart.defaults.color = '#dbe4ff'; Chart.defaults.borderColor = 'rgba(255,255,255,.12)'; Chart.defaults.font.family = 'Plus Jakarta Sans, sans-serif';
    const days = []; for (let d = a; d <= b && days.length < 60; d = addDays(d, 1)) days.push(d);
    const per = days.map(d => cnt(cur.filter(l => l.day === d))), opt = (extra = {}) => ({ responsive: true, onClick: extra.onClick, plugins: { legend: { labels: { color: '#dbe4ff' } } }, ...extra.o });
    const click = (chart, ev, f) => { const el = chart.getElementsAtEventForMode(ev, 'nearest', { intersect: true }, true)[0]; if (el) f(el.index); };
    const mk = (id, cfg) => { const cv = $('#' + id, rroot); if (cv) charts.push(new Chart(cv, cfg)); return charts[charts.length - 1]; };
    mk('c1', { type: 'line', data: { labels: days.map(d => d.slice(5)), datasets: [{ label: '% bài tự làm đúng', data: per.map(p => p.n ? pct(p.dung, p.n) : null), borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,.2)', fill: true, tension: .3, spanGaps: true }] }, options: { ...opt(), scales: { y: { min: 0, max: 100, title: { display: true, text: '% đúng' } }, x: { title: { display: true, text: 'Ngày (MM-DD)' } } }, onClick: (e, _, c) => click(c, e, i => listModal('Bài ngày ' + days[i], cur.filter(l => l.day === days[i]))) } });
    mk('c2', { type: 'bar', data: { labels: days.map(d => d.slice(5)), datasets: [{ label: 'Đúng', data: per.map(p => p.dung), backgroundColor: '#34d399' }, { label: 'Cần gợi ý', data: per.map(p => p.goi), backgroundColor: '#fbbf24' }, { label: 'Sai', data: per.map(p => p.sai), backgroundColor: '#f87171' }] }, options: { ...opt(), scales: { x: { stacked: true, title: { display: true, text: 'Ngày' } }, y: { stacked: true, ticks: { precision: 0 }, title: { display: true, text: 'Số bài' } } }, onClick: (e, _, c) => click(c, e, i => listModal('Bài ngày ' + days[i], cur.filter(l => l.day === days[i]))) } });
    const tps = [...new Set(cur.map(l => l.topic))].filter(Boolean), tstat = tps.map(t => { const ls = cur.filter(l => l.topic === t); return { t, n: ls.length, p: pct(ls.filter(l => l.result === 'dung').length, ls.length) }; });
    mk('c3', { type: 'bar', data: { labels: tstat.map(x => x.t + ' (' + x.n + ')'), datasets: [{ label: '% đúng', data: tstat.map(x => x.p), backgroundColor: tstat.map(x => x.p >= 60 ? '#34d399' : x.p >= 30 ? '#fbbf24' : '#f87171') }] }, options: { ...opt(), indexAxis: 'y', scales: { x: { min: 0, max: 100, title: { display: true, text: '% bài tự làm đúng' } } }, onClick: (e, _, c) => click(c, e, i => listModal('Chủ đề: ' + tstat[i].t, cur.filter(l => l.topic === tstat[i].t))) } });
    const ec = ERR.map(e => cur.filter(l => l.error === e).length);
    mk('c4', { type: 'doughnut', data: { labels: ERR, datasets: [{ data: ec, backgroundColor: ['#a78bfa', '#22d3ee', '#fbbf24', '#f472b6', '#34d399', '#60a5fa'] }] }, options: { ...opt(), onClick: (e, _, c) => click(c, e, i => listModal('Lỗi: ' + ERR[i], cur.filter(l => l.error === ERR[i]))) } });
    const su = ['tu_lam', 'goi_y', 'xem_loi_giai'].map(k => cur.filter(l => l.support === k).length);
    mk('c6', { type: 'doughnut', data: { labels: Object.values(SUP), datasets: [{ data: su, backgroundColor: ['#34d399', '#fbbf24', '#f87171'] }] }, options: opt() });
    // Nhận xét (trung thực)
    const lines = []; const rate = x => x.n ? pct(x.dung, x.n) : null;
    if (C.n < 5) lines.push(`Trong kỳ này mới có <b>${C.n} bài</b> nên dữ liệu còn ít, xu hướng chỉ mang tính tham khảo.`);
    if (P.n && C.n) { const d = rate(C), p0 = rate(P); lines.push(C.n < 5 || P.n < 5 ? `So với kỳ trước (${P.n} bài): tỷ lệ tự làm đúng ${p0}% → ${d}% (chưa đủ cơ sở để kết luận tiến bộ hay đi xuống).` : d > p0 ? `So với kỳ trước, tỷ lệ tự làm đúng tăng từ ${p0}% lên ${d}%.` : d < p0 ? `So với kỳ trước, tỷ lệ tự làm đúng giảm từ ${p0}% xuống ${d}%. Có thể do bạn chuyển sang chủ đề khó hơn — đừng nản, hãy chia nhỏ mục tiêu nhé.` : `Tỷ lệ tự làm đúng đi ngang ở mức ${d}%.`); } else if (C.n) lines.push('Chưa có dữ liệu kỳ trước cùng độ dài để so sánh.');
    const weakT = tstat.filter(x => x.n >= 1).sort((x, y) => x.p - y.p)[0], topE = ERR.map((e, i) => [e, ec[i]]).sort((x, y) => y[1] - x[1])[0];
    if (weakT) lines.push(`Chủ đề đáng chú ý nhất: <b>${esc(weakT.t)}</b> (tự làm đúng ${weakT.p}% trong ${weakT.n} bài).`); if (topE && topE[1]) lines.push(`Loại lỗi lặp lại nhiều nhất: <b>${topE[0]}</b> (${topE[1]} lần).`);
    lines.push('Việc nên làm tiếp: làm lại các bài sai không nhìn lời giải, rồi luyện thêm chủ đề yếu nhất.');
    $('#cmt', rroot).innerHTML = `<h4>📝 Nhận xét sau biểu đồ</h4><ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul><div class="row wrap"><button class="btn primary" id="doit" ${weakT ? '' : 'disabled'}>✍️ Làm bài ngay</button><button class="btn ghost" id="redo" ${topE && topE[1] ? '' : 'disabled'}>📖 Ôn lại ngay</button></div>`;
    $('#doit', rroot).onclick = () => weakT && practice(weakT.t); $('#redo', rroot).onclick = () => topE && reviewErr(topE[0]);
    report(cur, C, tstat, ec);
  }
  const topWeak = ls => { const m = {}; ls.forEach(l => { if (l.result !== 'dung') m[l.topic] = (m[l.topic] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  function practice(topic) { const m = Modal.open({ title: 'Làm bài ngay: ' + topic, html: `<p>Chọn cách luyện chủ đề <b>${esc(topic)}</b>:</p><div class="row wrap"><button class="btn primary" data-ai>🤖 Nhờ AI Buddy ra một bài tương tự</button><button class="btn ghost" data-g>🎮 Chơi game củng cố</button></div>` }); $('[data-ai]', m.body).onclick = () => { m.close(); Chatbot.ask(`Hãy ra cho mình 1 bài tập Xác suất Thống kê mức vừa về chủ đề "${topic}" (chưa đưa lời giải, để mình tự làm rồi nhờ bạn kiểm tra).`); }; $('[data-g]', m.body).onclick = () => { m.close(); App.go('games', { topic, banner: 'Cùng luyện tập thêm chủ đề bạn đang yếu nhé!' }); }; }
  function reviewErr(e) { const m = Modal.open({ title: 'Ôn lại: lỗi “' + e + '”', html: `<p>${esc(ERRTIP[e])}</p><button class="btn primary" data-ai>🤖 Nhờ AI Buddy giải thích kỹ hơn</button>` }); $('[data-ai]', m.body).onclick = () => { m.close(); Chatbot.ask(`Mình hay mắc lỗi "${e}" khi giải bài Xác suất Thống kê. Bạn giải thích cách khắc phục kèm ví dụ nhé.`); }; }
  function listModal(title, ls) {
    const m = Modal.open({ title, wide: true, html: ls.length ? ls.map(l => `<div class="logrow"><div><b>${esc(l.topic || '—')}</b> <span class="tag ${l.result === 'dung' ? 'ok' : l.result === 'can_goi_y' ? '' : 'bad'}">${RES[l.result] || l.result}</span>${l.error ? `<span class="tag">Lỗi: ${esc(l.error)}</span>` : ''}<div class="muted small">${esc((l.problem || '').slice(0, 140))}</div></div><div class="row"><button class="btn small primary" data-redo="${l.id}">Làm lại</button><button class="btn small ghost" data-view="${l.id}">Xem lại</button></div></div>`).join('') : '<p class="muted">Không có bài nào ở mốc này.</p>' });
    $$('[data-redo]', m.body).forEach(b => b.onclick = () => { const l = ls.find(x => x.id === b.dataset.redo); if (l.demo) return toast('Đây là dữ liệu mẫu, không có đề thật để làm lại.', 'info'); m.close(); App.go('solve', { problem: l.problem }); });
    $$('[data-view]', m.body).forEach(b => b.onclick = () => { const l = ls.find(x => x.id === b.dataset.view); const v = Modal.open({ title: 'Xem lại bài', wide: true, html: `<h4>Đề bài</h4><div class="rich">${Rich.html(l.problem || '')}</div><h4>Lời giải</h4><div class="rich">${l.solution ? Rich.html(l.solution) : '<span class="muted">Không có lời giải lưu.</span>'}</div>` }); });
  }
  function cardDetail(k, base, cur) {
    if (k === 'today') return listModal('Hôm nay bạn đã học', base.filter(l => l.day === today()));
    if (k === 'wrong') return listModal('Các bài sai trong kỳ', cur.filter(l => l.result === 'sai' || l.result === 'sai_mot_phan'));
    const w = topWeak(cur); const m = Modal.open({ title: 'Bạn nên ôn tập gì?', wide: true, html: w.length ? w.map(([t, n]) => `<div class="logrow"><div><b>${esc(t)}</b><div class="muted small">${n} bài chưa tự làm đúng</div></div><div class="row"><button class="btn small primary" data-do="${esc(t)}">Làm bài ngay</button><button class="btn small ghost" data-rv="${esc(t)}">Ôn lại ngay</button></div></div>`).join('') : '<p class="muted">Chưa có nội dung cần ôn trong kỳ này.</p>' });
    $$('[data-do]', m.body).forEach(b => b.onclick = () => { m.close(); practice(b.dataset.do); }); $$('[data-rv]', m.body).forEach(b => b.onclick = () => { m.close(); Chatbot.ask(`Giúp mình ôn lại nhanh chủ đề "${b.dataset.rv}": khái niệm chính, công thức và lỗi thường gặp.`); });
  }
  function report(cur, C, tstat, ec) {
    const topics = {}; cur.forEach(l => (topics[l.topic] = topics[l.topic] || []).push(l));
    const errs = ERR.map((e, i) => [e, ec[i]]).filter(x => x[1]).sort((a, b) => b[1] - a[1]); const strong = tstat.filter(x => x.p >= 60), need = tstat.filter(x => x.p < 30), mid = tstat.filter(x => x.p >= 30 && x.p < 60);
    $('#rep', rroot).innerHTML = `<div class="glass dark panel"><h3>Báo cáo chi tiết</h3><h4>1. Hôm nay bạn đã học gì</h4><ul>${Object.entries(topics).map(([t, ls]) => `<li>${esc(t)} — ${ls.length} bài</li>`).join('') || '<li class="muted">Chưa có bài nào trong kỳ.</li>'}</ul>
      <h4>2. Kết quả tổng quan</h4><div class="tbl-wrap"><table><tr><th>Chủ đề</th><th>Số bài</th><th>Tự làm đúng</th><th>Cần gợi ý</th><th>Sai</th></tr>${Object.entries(topics).map(([t, ls]) => `<tr><td>${esc(t)}</td><td>${ls.length}</td><td>${ls.filter(l => l.result === 'dung').length}</td><td>${ls.filter(l => l.result === 'can_goi_y').length}</td><td>${ls.filter(l => /^sai/.test(l.result)).length}</td></tr>`).join('')}</table></div><p>${C.n ? `Tổng ${C.n} bài: ${C.dung} đúng, ${C.goi} cần gợi ý, ${C.sai} sai.${C.n < 3 ? ' (Dữ liệu còn ít, đánh giá chỉ mang tính tham khảo.)' : ''}` : 'Chưa có dữ liệu.'}</p>
      <h4>3. Bạn đã làm tốt</h4><ul>${strong.length ? strong.slice(0, 3).map(x => `<li>${esc(x.t)}: tự làm đúng ${x.p}% trong ${x.n} bài.</li>`).join('') : '<li class="muted">Chưa có chủ đề nào đạt từ 60% tự làm đúng — cứ kiên trì nhé.</li>'}</ul>
      <h4>4. Bạn đã sai gì</h4><ul>${errs.length ? errs.map(([e, n]) => `<li><b>${e}</b> — ${n} lần. ${ERRTIP[e]}</li>`).join('') : '<li class="muted">Chưa ghi nhận lỗi sai nào có nhãn.</li>'}</ul>
      <h4>5. Bạn nên ôn lại gì</h4><ul><li><b>Cần ôn ngay:</b> ${need.map(x => esc(x.t)).join(', ') || '—'}</li><li><b>Nên ôn:</b> ${mid.map(x => esc(x.t)).join(', ') || '—'}</li><li><b>Đã vững:</b> ${strong.map(x => esc(x.t)).join(', ') || '—'}</li></ul>
      <h4>6. Đề xuất kế hoạch ôn tập</h4><ul><li><b>Hôm nay / ngày mai (15–20 phút):</b> làm lại các bài sai, không nhìn lời giải.</li><li><b>Sau 3 ngày (20 phút):</b> làm 2–3 bài tương tự ở nhóm “cần ôn ngay”.</li><li><b>Sau 7 ngày (25 phút):</b> làm bài trộn nhiều chủ đề để kiểm tra mức nhớ.</li></ul></div>`;
  }
  App.reg('review', { render(root) { rroot = root; draw(); }, destroy() { killCharts(); } });

  // ================= BẢNG GIÁ TRỊ HÀM LAPLACE =================
  function erf(x) {
    const a = Math.abs(x); let r;
    if (a < 3) { let t = a, sum = a; for (let n = 1; n < 80; n++) { t *= -a * a / n; sum += t / (2 * n + 1); } r = 2 / Math.sqrt(Math.PI) * sum; }
    else r = 1 - Math.exp(-a * a) / (a * Math.sqrt(Math.PI)) * (1 - 1 / (2 * a * a) + 3 / (4 * a ** 4));
    return x < 0 ? -r : r;
  }
  const Phi0 = z => 0.5 * erf(Math.abs(z) / Math.SQRT2) * Math.sign(z), PhiF = z => 0.5 + Phi0(z);
  function invPhi0(v) { let lo = 0, hi = 6; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; Phi0(m) < v ? lo = m : hi = m; } return (lo + hi) / 2; }
  App.reg('laplace', {
    render(root) {
      let rows = ''; for (let i = 0; i < 40; i++) { rows += `<tr data-r="${i}"><th>${(i / 10).toFixed(1)}</th>${Array.from({ length: 10 }, (_, j) => `<td data-z="${(i / 10 + j / 100).toFixed(2)}">${Phi0(i / 10 + j / 100).toFixed(4).replace('.', ',')}</td>`).join('')}</tr>`; }
      root.innerHTML = `<div class="page-head">${backBtn()}<div><h2>Giá trị hàm Laplace</h2><p class="muted">Tra bảng \\(\\Phi_0(z)\\) hoặc nhập trực tiếp để tính.</p></div><button class="btn ghost" data-back="home">🏠 Trang chủ</button></div>
      <div class="grid2"><div class="glass dark panel"><div class="rich" id="lf"></div>
        <label>Nhập z: <input id="zin" type="number" step="0.01" value="1.96"/></label><div id="zout" class="calc-res"></div>
        <label>Tra ngược: cho \\(\\Phi_0(z)\\) = <input id="vin" type="number" step="0.0001" min="0" max="0.4999" placeholder="0.475"/></label><div id="vout" class="calc-res"></div><p class="muted small">Quy ước: \\(\\Phi_0(z)=\\frac{1}{\\sqrt{2\\pi}}\\int_0^z e^{-t^2/2}dt=\\Phi(z)-0{,}5\\). Với \\(z<0\\): \\(\\Phi_0(-z)=-\\Phi_0(z)\\). Bảng tính từ hàm sai số erf (độ chính xác ≥ 4 chữ số thập phân).</p></div>
        <div class="glass dark panel lap"><div class="tbl-wrap tall"><table class="laptbl"><tr><th>z</th>${Array.from({ length: 10 }, (_, j) => `<th>0,0${j}</th>`).join('')}</tr>${rows}</table></div></div></div>`;
      root.innerHTML = root.innerHTML.replace(/\\\((.+?)\\\)/g, (m, a) => Rich.mathOnly(a, false)); $('#lf', root).innerHTML = Rich.mathOnly(R`\Phi_0(z)=\frac{1}{\sqrt{2\pi}}\int_0^{z}e^{-t^2/2}\,dt`, true);
      const upd = () => { const z = parseFloat($('#zin', root).value); if (isNaN(z)) return; $('#zout', root).innerHTML = `Φ₀(${z}) = <b>${Phi0(z).toFixed(4)}</b> · Φ(${z}) = <b>${PhiF(z).toFixed(4)}</b>`; $$('.laptbl .hl', root).forEach(x => x.classList.remove('hl')); const a = Math.abs(z); if (a < 4) { const i = Math.floor(a * 10 + 1e-9), j = Math.round((a - i / 10) * 100), c = $(`tr[data-r="${i}"] td:nth-child(${j + 2})`, root); if (c) { c.classList.add('hl'); c.scrollIntoView({ block: 'center', behavior: 'smooth' }); } } };
      $('#zin', root).oninput = upd; $$('td[data-z]', root).forEach(td => td.onclick = () => { $('#zin', root).value = td.dataset.z; upd(); });
      $('#vin', root).oninput = () => { const v = parseFloat($('#vin', root).value); $('#vout', root).innerHTML = isNaN(v) || v < 0 || v >= .5 ? '<span class="muted">Nhập giá trị trong [0; 0,5)</span>' : `z ≈ <b>${invPhi0(v).toFixed(3)}</b>`; };
      upd();
    }
  });

  // ================= TUTOR =================
  const GUIDE = [
    ['Giới thiệu AI CLASSROOM', 'AI CLASSROOM (Learn. Play. Solve. Level Up.) là phòng thí nghiệm học Xác suất Thống kê: <b>Learn</b> học có hệ thống, <b>Play</b> chơi game mô phỏng, <b>Solve</b> giải bài từng bước, <b>Level Up</b> theo dõi tiến độ. AI chỉ hỗ trợ môn Xác suất Thống kê và nội dung liên quan; mục tiêu là giúp bạn <b>hiểu và làm được</b>, không chỉ chép đáp án.'],
    ['Bắt đầu: nhập API key', '1) Vào <b>aistudio.google.com/apikey</b> để tạo key miễn phí. 2) Dán key vào màn hình đầu tiên, bấm <b>Tải danh sách model</b>, chọn model phù hợp (flash nhanh và tiết kiệm; pro suy luận sâu hơn) rồi <b>Kiểm tra kết nối</b>. 3) Mỗi người dùng key riêng; key lưu trong trình duyệt của bạn, không gửi cho ai khác. Đổi key/model bất cứ lúc nào ở menu tài khoản → ⚙ Cài đặt AI.'],
    ['Giải bài – AI BUDDY – SOLVE (5 bước)', 'Nhập đề → chọn mức độ hiểu → chọn chế độ (Gợi ý / Hướng dẫn / Kiểm tra / Giải đầy đủ) → xem lời giải theo <b>quy trình 4 bước</b> (Tìm hiểu đề → Xây dựng chương trình giải → Trình bày lời giải → Kiểm tra & nghiên cứu) → luyện tập thêm. Có nút ← Quay lại ở mọi bước và đề của bạn luôn được giữ.'],
    ['Nhập đề: gõ, micro, chụp ảnh, tải tệp', '<b>Gõ</b> với thanh ký hiệu 9 trang. <b>Micro</b>: bấm một lần để bắt đầu nói, bấm lần nữa để dừng (micro không tự tắt). Nói “xích ma bình phương”, “xác suất của A với điều kiện B”… sẽ thành công thức. <b>Chụp ảnh</b>/<b>tải ảnh</b>/<b>Word</b>/<b>PDF</b>/dán ảnh Ctrl+V: AI nhận dạng đề ra LaTeX, hiển thị cạnh ảnh gốc để bạn xác nhận trước khi giải.'],
    ['＝ Tính nhanh', 'Chỉ muốn tính một phép tính? Mở tab “＝ Tính nhanh”, gõ ví dụ <code>nCr(10,3)</code>, <code>normcdf(1.96)</code>, <code>binompmf(2,5,0.3)</code> rồi bấm ＝.'],
    ['Chatbot AI', 'Nút tròn góc phải dưới có ở mọi trang. Hỏi bất kỳ câu Toán nào; gõ, nói bằng micro hoặc gửi ảnh. Bấm 🔊 Nghe để AI đọc tiếng Việt (công thức được đọc thành lời, thuật ngữ tiếng Anh đọc bằng giọng Anh).'],
    ['Trò chơi', 'Bản đồ vũ trụ gồm các hành tinh theo chương. Bản hiện tại chơi được: Cosmic Dice Rush, Lucky Vault, Distribution Architect. Sao thu được lưu trong Hũ sao.'],
    ['Ôn tập', 'Xem biểu đồ tiến độ theo thời gian, loại lỗi sai, chủ đề mạnh/yếu và kế hoạch ôn. Chỉ dùng dữ liệu thật của bạn (nút “Xem dữ liệu mẫu” luôn được ghi rõ là demo).'],
    ['Diễn đàn, kết bạn, chat 1-1', 'Mọi tài khoản/bài đăng/tin nhắn là của <b>người thật</b>. Mỗi người có mã dạng <code>@tên#1234</code>, liên kết cá nhân và mã QR. Gửi lời mời, chat thời gian thực, dán ảnh Ctrl+V, gõ công thức <code>\\( x^2 \\)</code>, thả cảm xúc 👍❤️😆😲🤔🆘. Chatbot AI không bao giờ chen vào khung chat giữa hai bạn.'],
    ['Quyền riêng tư & an toàn', 'Chỉ chụp bài tập, tránh chụp tên, số điện thoại, khuôn mặt. Micro/camera chỉ bật khi bạn bấm. Không dùng máy công cộng để lưu API key (bỏ tick “Ghi nhớ” khi nhập).'],
    ['Chưa có trong phiên bản này', 'Casio FX-580 và Luyện Bẫy Thi chưa được triển khai (sẽ có thông báo rõ). Các game Stat Detective, Colony Survival, Reactor Crisis, Hệ thống Gợi ý/Quyền ứng cứu và Vấn đáp lý thuyết thuộc giai đoạn phát triển tiếp theo.']
  ];
  App.reg('tutor', { render(root) { root.innerHTML = `<div class="page-head">${backBtn()}<div><h2>TUTOR – Cẩm nang hướng dẫn</h2><p class="muted">Hướng dẫn sử dụng chi tiết kèm giới thiệu AI CLASSROOM.</p></div><button class="btn ghost" data-back="home">🏠 Trang chủ</button></div><div class="guide">${GUIDE.map((g, i) => `<details class="glass dark panel" ${i < 2 ? 'open' : ''}><summary><b>${i + 1}. ${g[0]}</b></summary><p>${g[1]}</p></details>`).join('')}</div>`; } });
})();
