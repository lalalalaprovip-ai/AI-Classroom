'use strict';
/* ===== MATHSPEECH: (1) lời nói tiếng Việt -> LaTeX; (2) văn bản/LaTeX -> lời đọc tiếng Việt chuẩn ===== */
(function (root) {
  const D = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  function read3(n, full) {
    const tr = Math.floor(n / 100), ch = Math.floor(n % 100 / 10), dv = n % 10, o = [];
    if (tr > 0 || full) o.push(D[tr], 'trăm');
    if (ch > 1) { o.push(D[ch], 'mươi'); if (dv === 1) o.push('mốt'); else if (dv === 5) o.push('lăm'); else if (dv > 0) o.push(D[dv]); }
    else if (ch === 1) { o.push('mười'); if (dv === 5) o.push('lăm'); else if (dv > 0) o.push(D[dv]); }
    else if (dv > 0) { if (tr > 0 || full) o.push('lẻ'); o.push(D[dv]); }
    return o.join(' ');
  }
  function viNum(str) {
    if (!/^\d+$/.test(str)) return str;
    str = str.replace(/^0+(?=\d)/, ''); if (str === '0') return 'không';
    if (str.length > 15) return str.split('').map(d => D[d]).join(' ');
    const g = []; for (let i = str.length; i > 0; i -= 3) g.unshift(str.slice(Math.max(0, i - 3), i));
    const U = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ'], parts = [];
    g.forEach((x, i) => { const v = +x; if (!v) return; const u = U[g.length - 1 - i]; parts.push(read3(v, parts.length > 0) + (u ? ' ' + u : '')); });
    return parts.join(' ');
  }
  function viDecimal(ip, fp) {
    let z = 0; while (fp[z] === '0' && z < fp.length) z++;
    const rest = fp.slice(z); let f;
    if (!rest) f = fp.split('').map(d => D[d]).join(' ');
    else if (fp.length <= 2 || (z > 0 && rest.length <= 2)) f = Array(z).fill('không').join(' ') + (z ? ' ' : '') + viNum(rest);
    else f = fp.split('').map(d => D[d]).join(' ');
    return viNum(ip) + ' phẩy ' + f;
  }

  // ============ (2) LaTeX / văn bản -> lời đọc ============
  const P = s => '\u0001' + s + '\u0002';                  // đoạn đã là tiếng Việt, được bảo vệ
  const GREEK = { alpha: 'an-pha', beta: 'bê-ta', gamma: 'gam-ma', delta: 'đen-ta', epsilon: 'ép-xi-lon', varepsilon: 'ép-xi-lon', zeta: 'giê-ta', eta: 'ê-ta', theta: 'thê-ta', lambda: 'lam-đa', mu: 'muy', nu: 'nuy', xi: 'xi', pi: 'pi', rho: 'rô', sigma: 'xích-ma', tau: 'tau', phi: 'phi', varphi: 'phi', chi: 'khi', psi: 'xi', omega: 'ô-mê-ga', Delta: 'đen-ta', Phi: 'phi', Sigma: 'xích-ma lớn', Omega: 'ô-mê-ga lớn', Gamma: 'gam-ma lớn', Theta: 'thê-ta lớn', Lambda: 'lam-đa lớn', Pi: 'pi lớn' };
  const LETTER = { a: 'a', b: 'bê', c: 'xê', d: 'đê', e: 'e', f: 'ép', g: 'giê', h: 'hát', i: 'i', j: 'gi', k: 'ca', l: 'lờ', m: 'mờ', n: 'nờ', o: 'o', p: 'pê', q: 'quy', r: 'rờ', s: 'ét', t: 'tê', u: 'u', v: 'vê', w: 'vê kép', x: 'ích', y: 'i dài', z: 'dét' };
  const CMD = { cap: 'giao', cup: 'hợp', le: 'nhỏ hơn hoặc bằng', leq: 'nhỏ hơn hoặc bằng', ge: 'lớn hơn hoặc bằng', geq: 'lớn hơn hoặc bằng', ne: 'khác', neq: 'khác', approx: 'xấp xỉ', pm: 'cộng trừ', mp: 'trừ cộng', times: 'nhân', cdot: 'nhân', div: 'chia', infty: 'vô cùng', to: 'tiến tới', rightarrow: 'suy ra', Rightarrow: 'suy ra', in: 'thuộc', notin: 'không thuộc', subset: 'tập con của', emptyset: 'tập rỗng', sim: 'có phân phối', mid: 'với điều kiện', sum: 'tổng', prod: 'tích', int: 'tích phân', lim: 'giới hạn', ln: 'lô-ga-rít tự nhiên của', log: 'lô-ga-rít của', exp: 'e mũ', sin: 'sin', cos: 'cốt', tan: 'tang', dots: 'v.v.', ldots: 'v.v.', cdots: 'v.v.', neg: 'phủ định', forall: 'với mọi', exists: 'tồn tại', partial: 'đạo hàm riêng', nabla: 'na-bla' };
  const NAMES = { Var: 'phương sai của', Cov: 'hiệp phương sai của', Corr: 'hệ số tương quan của', E: 'kỳ vọng của', P: 'xác suất của', Std: 'độ lệch chuẩn của', SD: 'độ lệch chuẩn của', Med: 'trung vị của', Mod: 'mốt của' };
  const FUNC_PRE = /(?:\\operatorname\{\w+\}|\\Phi(?:_\{?0\}?)?|\\varphi|\\phi|\\mathcal\{[PN]\}|\\chi\^\{?2\}?|\b[PEFfgGNBHTtS]|\b[tTFz]_\{[^{}]*\}|\b[tTFz]_\w)$/;

  function texToSpeech(tex) {
    let s = ' ' + tex + ' ';
    s = s.replace(/\\(?:left|right|big|Big|bigg|Bigg|displaystyle)\b/g, ' ').replace(/\\[,;:!]|\\quad|\\qquad/g, ' ').replace(/\\\\/g, ' ');
    s = s.replace(/\\\{/g, ' MO_NHON ').replace(/\\\}/g, ' DONG_NHON ').replace(/\\%/g, '%').replace(/\\&/g, ' ');
    s = s.replace(/\{,\}/g, ',');
    // \text{...}: giữ nguyên chữ, bảo vệ khỏi việc đọc từng chữ cái
    s = s.replace(/\\(?:text|mathrm|textbf|mathbf|mathit|mathbb|mathcal)\s*\{([^{}]*)\}/g, (m, a) => /^[A-Za-z]$/.test(a) ? ' ' + a + ' ' : P(a));
    // chuẩn hóa chỉ số/mũ không ngoặc
    s = s.replace(/([_^])\s*(\\[A-Za-z]+|[A-Za-z0-9])/g, '$1{$2}');
    // ngoặc tròn: hàm (P, E, Var, Φ...) đọc "của", còn lại "mở/đóng ngoặc"
    let out = '', st = [];
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '(') { const fn = FUNC_PRE.test(out.replace(/\s+$/, '')) && !/\s$/.test(out); st.push(fn); out += fn ? '\u0005F' : '\u0005O'; }
      else if (c === ')') { const fn = st.pop(); out += fn ? ' ' : '\u0005C'; }
      else if (c === '[' ) out += '\u0005O'; else if (c === ']') out += '\u0005C';
      else out += c;
    }
    s = out;
    s = s.replace(/\\operatorname\{(\w+)\}\s*\u0005F/g, (m, n) => P(NAMES[n] || n) + ' ');
    s = s.replace(/\\(?:operatorname)\{(\w+)\}/g, (m, n) => P(NAMES[n] || n));
    s = s.replace(/\bVar\s*\u0005F/g, P(NAMES.Var) + ' ').replace(/\bCov\s*\u0005F/g, P(NAMES.Cov) + ' ')
      .replace(/(^|[^A-Za-z\\])P\s*\u0005F/g, (m, a) => a + P(NAMES.P) + ' ').replace(/(^|[^A-Za-z\\])E\s*\u0005F/g, (m, a) => a + P(NAMES.E) + ' ');
    s = s.replace(/\\mathcal\{P\}/g, ' P ').replace(/\\mathcal\{N\}/g, ' N ');
    // phân số / căn (lặp để xử lý lồng nhau từ trong ra ngoài)
    const simple = x => !/[\s+\-=/]|\u0005/.test(x.trim()) && (x.match(/\\/g) || []).length <= 1;
    for (let k = 0; k < 12; k++) {
      const before = s;
      s = s.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (m, a, b) => simple(a) && simple(b) ? ' ' + a + P('trên') + b + ' ' : P('phân số') + ' ' + a + ' ' + P('trên') + ' ' + b + ' ' + P('hết phân số') + ' ');
      s = s.replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^{}]*)\}/g, (m, n, a) => P('căn bậc ' + n + ' của') + ' ' + a + ' ' + P('hết căn') + ' ');
      s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, (m, a) => P('căn bậc hai của') + ' ' + a + ' ' + (simple(a) ? '' : P('hết căn') + ' '));
      s = s.replace(/\\(?:bar|overline)\s*\{([^{}]*)\}/g, (m, a) => ' ' + a + ' ' + P('gạch ngang') + ' ');
      s = s.replace(/\\(?:hat|widehat)\s*\{([^{}]*)\}/g, (m, a) => ' ' + a + ' ' + P('mũ') + ' ');
      s = s.replace(/\\(?:tilde|widetilde)\s*\{([^{}]*)\}/g, (m, a) => ' ' + a + ' ' + P('ngã') + ' ');
      s = s.replace(/\\vec\s*\{([^{}]*)\}/g, (m, a) => P('vectơ') + ' ' + a + ' ');
      s = s.replace(/\\binom\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (m, n, k2) => P('tổ hợp chập') + ' ' + k2 + ' ' + P('của') + ' ' + n + ' ');
      if (s === before) break;
    }
    // tổng / tích / tích phân / giới hạn có cận
    s = s.replace(/\\sum\s*_\{([^{}]*)\}\s*\^\{([^{}]*)\}/g, (m, a, b) => P('tổng từ') + ' ' + a.replace(/=/g, ' bằng ') + ' ' + P('đến') + ' ' + b + ' ' + P('của') + ' ');
    s = s.replace(/\\prod\s*_\{([^{}]*)\}\s*\^\{([^{}]*)\}/g, (m, a, b) => P('tích từ') + ' ' + a.replace(/=/g, ' bằng ') + ' ' + P('đến') + ' ' + b + ' ' + P('của') + ' ');
    s = s.replace(/\\int\s*_\{([^{}]*)\}\s*\^\{([^{}]*)\}/g, (m, a, b) => P('tích phân từ') + ' ' + a + ' ' + P('đến') + ' ' + b + ' ' + P('của') + ' ');
    s = s.replace(/\\lim\s*_\{([^{}]*)\}/g, (m, a) => P('giới hạn khi') + ' ' + a.replace(/\\to|\\rightarrow/g, ' tiến tới ') + ' ' + P('của') + ' ');
    s = s.replace(/\\sum\s*_\{([^{}]*)\}/g, (m, a) => P('tổng theo') + ' ' + a + ' ' + P('của') + ' ');
    // C_n^k, A_n^k
    s = s.replace(/\bC\s*_\{([^{}]*)\}\s*\^\{([^{}]*)\}/g, (m, n, k) => P('tổ hợp chập') + ' ' + k + ' ' + P('của') + ' ' + n + ' ');
    s = s.replace(/\bA\s*_\{([^{}]*)\}\s*\^\{([^{}]*)\}/g, (m, n, k) => P('chỉnh hợp chập') + ' ' + k + ' ' + P('của') + ' ' + n + ' ');
    // mũ và chỉ số
    s = s.replace(/\^\{\s*2\s*\}/g, ' ' + P('bình phương') + ' ').replace(/\^\{\s*3\s*\}/g, ' ' + P('lập phương') + ' ')
      .replace(/\^\{\s*-\s*1\s*\}/g, ' ' + P('mũ trừ một') + ' ').replace(/\^\{\s*\*\s*\}/g, ' ' + P('sao') + ' ');
    for (let k = 0; k < 6; k++) {
      s = s.replace(/\^\{([^{}]*)\}/g, (m, a) => ' ' + P('mũ') + ' ' + a + ' ' + (simple(a) ? '' : P('hết mũ') + ' '));
      s = s.replace(/_\{([^{}]*)\}/g, (m, a) => /^\s*\d\s*$/.test(a) ? ' ' + a + ' ' : ' ' + P('chỉ số') + ' ' + a + ' ' + (simple(a) ? '' : P('hết chỉ số') + ' '));
    }
    // chữ Hy Lạp: \Phi_0 / \Phi{0}
    s = s.replace(/\\Phi\s*0/g, ' ' + P('phi không') + ' ');
    s = s.replace(/\\([A-Za-z]+)/g, (m, n) => GREEK[n] ? ' ' + P(GREEK[n]) + ' ' : CMD[n] ? ' ' + P(CMD[n]) + ' ' : ' ' + n + ' ');
    s = s.replace(/\u0005F/g, ' ' + P('của') + ' ').replace(/\u0005O/g, ' ' + P('mở ngoặc') + ' ').replace(/\u0005C/g, ' ' + P('đóng ngoặc') + ' ');
    s = s.replace(/MO_NHON/g, P('mở ngoặc nhọn')).replace(/DONG_NHON/g, P('đóng ngoặc nhọn'));
    // toán tử (chỉ áp dụng ngoài vùng đã được bảo vệ)
    s = s.replace(/\\ /g, ' ');
    s = withHidden(s, p => p.replace(/≤/g, ' ' + P('nhỏ hơn hoặc bằng') + ' ').replace(/≥/g, ' ' + P('lớn hơn hoặc bằng') + ' ')
      .replace(/!/g, ' ' + P('giai thừa') + ' ').replace(/%/g, ' ' + P('phần trăm') + ' ')
      .replace(/=/g, ' ' + P('bằng') + ' ').replace(/</g, ' ' + P('nhỏ hơn') + ' ').replace(/>/g, ' ' + P('lớn hơn') + ' ')
      .replace(/\+/g, ' ' + P('cộng') + ' ')
      .replace(/(?<=[\w\u0003)}])\s*[-−]\s*(?=[\w\u0003(\\])/g, ' ' + P('trừ') + ' ').replace(/[-−]/g, ' ' + P('âm') + ' ')
      .replace(/\//g, ' ' + P('trên') + ' ').replace(/\|/g, ' ' + P('với điều kiện') + ' ')
      .replace(/:/g, ' ').replace(/,/g, ' ' + P('phẩy') + ' ').replace(/[{}]/g, ' '));
    return finishSegments(s);
  }
  function withHidden(s, fn) {
    const store = []; s = s.replace(/\u0001[^\u0002]*\u0002/g, m => { store.push(m); return '\u0003' + (store.length - 1) + '\u0003'; });
    return fn(s).replace(/\u0003(\d+)\u0003/g, (m, i) => store[+i]);
  }
  function mapOutside(s, fn) { return s.split(/(\u0001[^\u0002]*\u0002)/).map(p => p.startsWith('\u0001') ? p : fn(p)).join(''); }
  // Số & chữ cái trong đoạn toán (ngoài vùng được bảo vệ)
  function finishSegments(s) {
    s = s.replace(/(\d+)\s*\u0001phẩy\u0002\s*(?=\d)/g, '$1,');       // 0{,}05 -> 0,05
    const parts = s.split(/(\u0001[^\u0002]*\u0002)/);
    return parts.map(p => {
      if (p.startsWith('\u0001')) return p.slice(1, -1);
      const letters = p.replace(/(?<![\p{L}\d])[A-Za-z]+(?![\p{L}\d])/gu, w => w.length === 1 ? P(LETTER[w.toLowerCase()] || w) : /^(?:sin|cos|tan|exp|ln|log|max|min)$/i.test(w) ? P(w) : P(w.split('').map(ch => LETTER[ch.toLowerCase()] || ch).join(' ')));
      return letters.replace(/(\d+),(\d+)/g, (m, a, b) => P(viDecimal(a, b))).replace(/\d+/g, m => P(viNum(m))).replace(/[\u0001\u0002]/g, '');
    }).join(' ').replace(/\s+/g, ' ').trim();
  }

  const SYMS = { 'μ': 'muy', 'σ': 'xích-ma', 'λ': 'lam-đa', 'α': 'an-pha', 'β': 'bê-ta', 'γ': 'gam-ma', 'δ': 'đen-ta', 'ε': 'ép-xi-lon', 'θ': 'thê-ta', 'π': 'pi', 'ρ': 'rô', 'τ': 'tau', 'φ': 'phi', 'Φ': 'phi', 'ν': 'nuy', 'ω': 'ô-mê-ga', 'Σ': 'tổng', '∑': 'tổng', '∫': 'tích phân', '√': 'căn bậc hai của', '≤': 'nhỏ hơn hoặc bằng', '≥': 'lớn hơn hoặc bằng', '≠': 'khác', '≈': 'xấp xỉ', '±': 'cộng trừ', '×': 'nhân', '÷': 'chia', '∩': 'giao', '∪': 'hợp', '∈': 'thuộc', '∉': 'không thuộc', '∞': 'vô cùng', '∣': 'với điều kiện', '→': 'suy ra', '∼': 'có phân phối', '~': 'có phân phối', '−': 'trừ', '∅': 'tập rỗng', '²': ' bình phương', '³': ' lập phương' };
  const SUBS = { '₀': 'không', '₁': 'một', '₂': 'hai', '₃': 'ba', '₄': 'bốn', '₅': 'năm' };
  const ENGLISH = ['p-value', 'z-score', 't-test', 'z-test', 'chi-square', 'Bayes', 'Bayesian', 'Poisson', 'Student', 'Fisher', 'Laplace', 'Gauss', 'Gaussian', 'Bernoulli', 'Binomial', 'ANOVA', 'Excel', 'Python', 'Casio', 'median', 'mode', 'mean', 'variance', 'standard deviation', 'sample', 'random variable', 'hypothesis', 'confidence interval', 'null hypothesis', 'significance level', 'AI Buddy', 'AI CLASSROOM', 'Level Up', 'Learn', 'Play', 'Solve', 'level', 'game', 'online', 'offline', 'feedback', 'online'];

  // Chuẩn hóa văn bản hiển thị -> mảng đoạn đọc [{t, lang}]
  function speechSegments(text) {
    let s = String(text || '');
    s = s.replace(/```[\s\S]*?```/g, ' ').replace(/`([^`]*)`/g, '$1');
    s = s.replace(/\\\[([\s\S]+?)\\\]|\$\$([\s\S]+?)\$\$/g, (m, a, b) => ' ' + texToSpeech(a || b) + ' ');
    s = s.replace(/\\\(([\s\S]+?)\\\)/g, (m, a) => ' ' + texToSpeech(a) + ' ');
    s = s.replace(/(^|[^\\$\w])\$(?!\s)([^$\n]+?)(?<!\s)\$(?![\w$])/g, (m, pre, a) => /^[\d.,\s]+$/.test(a) ? m : pre + ' ' + texToSpeech(a) + ' ');
    const U2T = { 'μ': '\\mu ', 'σ': '\\sigma ', 'λ': '\\lambda ', 'α': '\\alpha ', 'β': '\\beta ', 'θ': '\\theta ', 'Φ': '\\Phi ', 'φ': '\\varphi ', 'χ': '\\chi ', '∣': '\\mid ', '∩': '\\cap ', '∪': '\\cup ', '≤': '\\le ', '≥': '\\ge ', '²': '^2', '₀': '_0', '₁': '_1' };
    s = s.replace(/(?<![\p{L}])(?:P|E|Var|Cov|Φ₀?|F|f|N|B|H)\([^()\n]{1,40}\)/gu, m => ' ' + texToSpeech(m.replace(/[μσλαβθΦφχ∣∩∪≤≥²₀₁]/g, c => U2T[c])) + ' ');
    s = s.replace(/https?:\/\/\S+/g, ' đường dẫn ').replace(/[*_#>~]+/g, ' ').replace(/\|/g, ', ');
    s = s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, ' ');
    s = s.replace(/([A-Za-zΑ-Ωα-ω])\u0304/g, (m, c) => c + ' gạch ngang');
    s = s.replace(/H([₀₁])/g, (m, c) => 'H ' + SUBS[c]).replace(/\bH([01])\b/g, (m, c) => 'H ' + D[c]);
    s = s.replace(/χ²/g, ' khi bình phương ').replace(/([a-zA-Z])²/g, '$1 bình phương');
    s = s.replace(/[μσλαβγδεθπρτφΦνωΣ∑∫√≤≥≠≈±×÷∩∪∈∉∞∣→∼−∅²³]/g, c => ' ' + SYMS[c] + ' ');
    s = s.replace(/\b(\d+)\s*\/\s*(\d+)\b/g, (m, a, b) => viNum(a) + ' trên ' + viNum(b));
    s = s.replace(/(\d+)\s*%/g, '$1 phần trăm').replace(/\s*=\s*/g, ' bằng ').replace(/\s*≠\s*/g, ' khác ');
    s = s.replace(/\b(\d{1,3}(?:\.\d{3})+)\b(?!,\d)/g, m => m.replace(/\./g, ''));
    s = s.replace(/(\d+)[,.](\d+)/g, (m, a, b) => viDecimal(a, b)).replace(/\d+/g, m => viNum(m));
    s = s.replace(/\s+/g, ' ').trim();
    // tách thuật ngữ tiếng Anh để đọc bằng giọng Anh
    const terms = Array.from(new Set(ENGLISH)).sort((a, b) => b.length - a.length).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'));
    const re = new RegExp('(?<![\\p{L}])(' + terms.join('|') + ')(?![\\p{L}])', 'giu');
    const segs = []; let last = 0, m;
    while ((m = re.exec(s))) { if (m.index > last) segs.push({ t: s.slice(last, m.index), lang: 'vi' }); segs.push({ t: m[1], lang: 'en' }); last = m.index + m[0].length; }
    if (last < s.length) segs.push({ t: s.slice(last), lang: 'vi' });
    segs.forEach(x => { x.t = x.t.replace(/\b[Xx]ác suất xác suất của/g, 'xác suất của').replace(/\b[Kk]ỳ vọng kỳ vọng của/g, 'kỳ vọng của'); });
    return segs.filter(x => x.t.trim());
  }

  // ============ (1) Lời nói tiếng Việt -> LaTeX ============
  const GR = [['\\alpha', 'an pha|anpha|an-pha|alpha|al pha'], ['\\beta', 'bê ta|bê-ta|beta|bê ta'], ['\\gamma', 'gam ma|gam-ma|gamma'], ['\\Delta', 'đen ta hoa|delta hoa|đen-ta hoa'], ['\\delta', 'đen ta|đen-ta|delta'], ['\\varepsilon', 'ép xi lon|epsilon|ép-xi-lon|epxilon'], ['\\lambda', 'lam đa|lam-đa|lambda|lăm đa|lamda'], ['\\mu', 'muy|mu|mi u|muỳ'], ['\\nu', 'nuy|nu|nuỳ'], ['\\pi', 'pi'], ['\\rho', 'rô|rho|rồ'], ['\\Sigma', 'xích ma hoa|sigma hoa|xích-ma hoa'], ['\\sigma', 'xích ma|xích-ma|sích ma|xi ma|sigma|xích mả|sích-ma'], ['\\tau', 'tau|tao'], ['\\theta', 'thê ta|thê-ta|theta|tê ta'], ['\\omega', 'ô mê ga|ô-mê-ga|omega'], ['\\Omega', 'ô mê ga hoa|omega hoa']];
  const NUMW = { 'không': 0, 'linh': 0, 'lẻ': 0, 'một': 1, 'mốt': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'tư': 4, 'năm': 5, 'lăm': 5, 'sáu': 6, 'bảy': 7, 'bẩy': 7, 'tám': 8, 'chín': 9 };
  function wordsToNum(tokens) {
    const pi = tokens.indexOf('phẩy');
    if (pi >= 0) {
      const ip = wordsToNum(tokens.slice(0, pi)), fp = tokens.slice(pi + 1);
      if (ip == null || !fp.length) return null;
      let f;
      if (fp.every(w => w in NUMW)) f = fp.map(w => NUMW[w]).join('');
      else { const n = wordsToNum(fp); if (n == null) return null; f = n; }
      return ip + ',' + f;
    }
    if (!tokens.length || !tokens.every(w => NUMSET.has(w) && w !== 'phẩy')) return null;
    return String(simpleParse(tokens));
  }
  function simpleParse(tokens) {
    let total = 0, grp = 0, num = 0, i = 0;
    while (i < tokens.length) {
      const w = tokens[i];
      if (w === 'mười') { num = 10; }
      else if (w in NUMW) { const v = NUMW[w]; if (tokens[i + 1] === 'mươi') { num = v * 10; i++; } else num += v; }
      else if (w === 'trăm') { grp += (num || 1) * 100; num = 0; }
      else if (w === 'nghìn' || w === 'ngàn') { total += (grp + num || 1) * 1000; grp = 0; num = 0; }
      else if (w === 'triệu') { total += (grp + num || 1) * 1e6; grp = 0; num = 0; }
      i++;
    }
    return total + grp + num;
  }
  const NUMSET = new Set([...Object.keys(NUMW), 'mươi', 'mười', 'trăm', 'nghìn', 'ngàn', 'triệu', 'phẩy']);
  function convertNumbers(text) {
    const toks = text.split(/(\s+)/); const out = []; let i = 0;
    while (i < toks.length) {
      const w = toks[i].toLowerCase();
      if (NUMSET.has(w)) {
        let j = i, run = [];
        while (j < toks.length && (NUMSET.has(toks[j].toLowerCase()) || /^\s+$/.test(toks[j]))) { if (!/^\s+$/.test(toks[j])) run.push(toks[j].toLowerCase()); j++; }
        while (j > i && /^\s+$/.test(toks[j - 1])) j--;
        const prev = out.join('').trim().split(/\s+/).pop() || '', nxt = (toks[j + 1] || '').toLowerCase();
        const ctx = run.length >= 2 || /^(bằng|cộng|trừ|nhân|chia|mũ|số|âm)$/.test(prev.toLowerCase()) || /^[a-zA-Zα-ω]$/.test(prev) || /^(phần|mũ|bình|trên|cộng|trừ|nhân|chia)$/.test(nxt);
        const n = ctx && !(run.length === 1 && run[0] === 'phẩy') ? wordsToNum(run) : null;
        if (n != null) { out.push(n); i = j; continue; }
      }
      out.push(toks[i]); i++;
    }
    return out.join('');
  }

  function speechToMath(raw) {
    const flags = []; const frag = [];
    let t = ' ' + String(raw || '').replace(/\s+/g, ' ').trim() + ' ';
    t = t.replace(/\b(phần trăm)\b/gi, '%');
    t = convertNumbers(t);
    const mk = l => { frag.push(l); return '⟦' + (frag.length - 1) + '⟧'; };
    const L = '(?<![\\p{L}\\d])', R = '(?![\\p{L}\\d])';
    const rx = (src, f = 'giu') => new RegExp(L + '(?:' + src + ')' + R, f);
    // --- cụm ưu tiên cao ---
    t = t.replace(rx('khi bình phương|chi bình phương|chi bình|chi-square|chi square|khi bình'), () => mk('\\chi^2'));
    t = t.replace(rx('hệ số tương quan rô\\s*([a-z])\\s*([a-z])'), (m, a, b) => mk('\\rho_{' + a.toUpperCase() + b.toUpperCase() + '}'));
    GR.forEach(([tex, words]) => { t = t.replace(rx(words), () => mk(tex)); });
    t = t.replace(rx('phi'), () => { const k = mk('\\phi'); flags.push({ tex: '\\phi', options: ['\\phi', '\\varphi'] }); return k; });
    t = t.replace(rx('dương vô cùng'), () => mk('+\\infty')).replace(rx('âm vô cùng'), () => mk('-\\infty')).replace(rx('vô cùng'), () => mk('\\infty'));
    t = t.replace(rx('tập rỗng'), () => mk('\\emptyset'));
    t = t.replace(rx('giả thuyết h\\s*(không|0)'), () => mk('H_0')).replace(rx('giả thuyết h\\s*(một|1)'), () => mk('H_1')).replace(rx('h\\s*không'), () => mk('H_0')).replace(rx('h\\s*một'), () => mk('H_1'));
    // xác suất, kỳ vọng, phương sai
    const ARG = '(?<![\\p{L}\\d])(?:⟦\\d+⟧|[a-zA-Z]\\d?(?![\\p{L}\\d]))', SETARG = ARG + '(?:\\s+(?:giao|hợp)\\s+' + ARG + ')*';
    const up = s => s.replace(/\b[a-z]\b/g, c => c.toUpperCase());
    const setx = s => up(s.replace(/\s+giao\s+/gi, ' \\cap ').replace(/\s+hợp\s+/gi, ' \\cup '));
    const ex = s => s.replace(/⟦(\d+)⟧/g, (m, i) => frag[+i]);
    t = t.replace(new RegExp('xác suất của\\s+(' + SETARG + ')\\s+(?:với điều kiện|biết|khi)\\s+(' + SETARG + ')', 'giu'), (m, a, b) => mk('P(' + setx(ex(a)) + ' \\mid ' + setx(ex(b)) + ')'));
    t = t.replace(new RegExp('xác suất của\\s+(' + SETARG + ')', 'giu'), (m, a) => mk('P(' + setx(ex(a)) + ')'));
    t = t.replace(new RegExp('kỳ vọng của\\s+(' + ARG + ')', 'giu'), (m, a) => mk('E(' + up(ex(a)) + ')'));
    t = t.replace(new RegExp('phương sai của\\s+(' + ARG + ')', 'giu'), (m, a) => mk('\\operatorname{Var}(' + up(ex(a)) + ')'));
    t = t.replace(new RegExp('hiệp phương sai của\\s+(' + ARG + ')\\s+và\\s+(' + ARG + ')', 'giu'), (m, a, b) => mk('\\operatorname{Cov}(' + up(ex(a)) + ',' + up(ex(b)) + ')'));
    t = t.replace(new RegExp('(' + ARG + ')\\s+(?:phần bù|ngang)(?![\\p{L}])', 'giu'), (m, a) => mk('\\overline{' + up(ex(a)) + '}'));
    t = t.replace(new RegExp('(' + ARG + ')\\s+(giao|hợp)\\s+(' + ARG + ')', 'giu'), (m, a, o, b) => mk(up(ex(a)) + (/giao/i.test(o) ? ' \\cap ' : ' \\cup ') + up(ex(b))));
    t = t.replace(rx('(tổ hợp|chỉnh hợp) chập\\s*(\\w+)\\s*của\\s*(\\w+)'), (m, k, a, b) => mk((/tổ/i.test(k) ? 'C' : 'A') + '_{' + b + '}^{' + a + '}'));
    t = t.replace(rx('(\\w+)\\s+giai thừa'), (m, a) => mk(a + '!'));
    // thống kê mẫu
    t = t.replace(new RegExp('([a-z])\\s+(?:gạch ngang|ngang|bar|vạch ngang)', 'giu'), (m, a) => mk('\\bar{' + a.toUpperCase() + '}'));
    t = t.replace(new RegExp('(' + ARG + ')\\s+(?:mũ|hat)(?=\\s*$|\\s*[,.;]|\\s+(?:bằng|là))', 'giu'), (m, a) => mk('\\hat{' + ex(a) + '}'));
    t = t.replace(new RegExp('(' + ARG + ')\\s+(?:ngã|tilde)', 'giu'), (m, a) => mk('\\tilde{' + ex(a) + '}'));
    // phân phối
    const dist = [['chuẩn', 'N'], ['nhị thức', 'B'], ['poisson|poa xông|poa-xông', '\\mathcal{P}'], ['student|t', 't'], ['fisher', 'F']];
    dist.forEach(([w, tex]) => {
      t = t.replace(new RegExp('(' + ARG + '\\s+)?(?:có\\s+)?phân phối\\s+(?:' + w + ')(?![\\p{L}\\d])', 'giu'), (m, v) => mk((v ? up(ex(v.trim())) + ' ' : '') + '\\sim ' + tex));
    });
    // mũ, chỉ số, căn, phân số
    t = t.replace(new RegExp('(' + ARG + ')\\s+bình phương', 'giu'), (m, a) => mk(ex(a) + '^2'));
    t = t.replace(new RegExp('(' + ARG + ')\\s+lập phương', 'giu'), (m, a) => mk(ex(a) + '^3'));
    t = t.replace(new RegExp('(' + ARG + ')\\s+mũ\\s+(âm\\s+)?(\\d+|[a-z]|⟦\\d+⟧)', 'giu'), (m, a, neg, b) => mk(ex(a) + '^{' + (neg ? '-' : '') + ex(b) + '}'));
    t = t.replace(new RegExp('(' + ARG + ')\\s+chỉ số\\s+(\\w+|⟦\\d+⟧)', 'giu'), (m, a, b) => mk(ex(a) + '_{' + ex(b) + '}'));
    t = t.replace(new RegExp('căn bậc hai của\\s+(' + ARG + '|\\d+)', 'giu'), (m, a) => mk('\\sqrt{' + ex(a) + '}'));
    t = t.replace(new RegExp('(' + ARG + '|\\d+(?:,\\d+)?)\\s+(?:trên|phần)\\s+(' + ARG + '|\\d+(?:,\\d+)?)', 'giu'), (m, a, b) => mk('\\frac{' + ex(a) + '}{' + ex(b) + '}'));
    // toán tử trong ngữ cảnh toán
    const ops = [['lớn hơn hoặc bằng', '\\ge'], ['nhỏ hơn hoặc bằng', '\\le'], ['không thuộc', '\\notin'], ['thuộc', '\\in'], ['xấp xỉ', '\\approx'], ['cộng trừ', '\\pm'], ['lớn hơn', '>'], ['nhỏ hơn', '<'], ['bằng', '='], ['cộng', '+'], ['trừ', '-'], ['nhân', '\\times'], ['chia', '\\div'], ['khác', '\\ne']];
    const CTX_L = '(⟦\\d+⟧|\\d+(?:,\\d+)?|(?<![\\p{L}\\d])[A-Za-z](?![\\p{L}\\d]))', CTX_R = '(?=\\s*(?:⟦|\\d|(?<![\\p{L}\\d])[A-Za-z](?![\\p{L}\\d])|-))';
    ops.forEach(([w, l]) => { t = t.replace(new RegExp(CTX_L + '\\s+' + w + '\\s*' + CTX_R.slice(0), 'giu'), (m, a) => a + ' ' + mk('OP' + l) + ' '); });
    // gộp các mảnh toán liền nhau (kèm toán tử, dấu phẩy, số, chữ cái đơn)
    const tokRe = '(?:⟦\\d+⟧|\\d+(?:,\\d+)?%?|(?<![\\p{L}\\d])[A-Za-z](?![\\p{L}\\d]))';
    const mergeRe = new RegExp('(?:' + tokRe + '(?:\\s*,?\\s*(?:' + tokRe + '))*)', 'gu');
    const expand = s => s.replace(/⟦(\d+)⟧/g, (m, i) => expand(frag[+i]));
    t = t.replace(mergeRe, m => {
      if (!/⟦/.test(m)) return m;                       // không có mảnh toán -> giữ nguyên chữ
      let tex = expand(m).replace(/OP/g, ' ').replace(/\s+,/g, ',').replace(/(\d),(\d)/g, '$1{,}$2').replace(/\s+/g, ' ').trim();
      tex = tex.replace(/(\\sim\s*(?:N|B|\\mathcal\{P\}|t|F))\s+(?!\()(.+)$/, (m, a, b) => a + '(' + b.replace(/(\d)\s+(?=\\[a-zA-Z])/g, '$1, ') + ')');
      return '\\(' + tex + '\\)';
    });
    t = t.replace(/\\\)\s+\\\(/g, ' ').replace(/\s+([,.;?])/g, '$1').replace(/\s+/g, ' ').trim();
    // dấu câu ngoài toán
    t = t.replace(/\bxuống dòng\b/gi, '\n');
    // kiểm tra cú pháp
    const problems = [];
    t = t.replace(/\\\(([\s\S]+?)\\\)/g, (m, a) => { if (root.katex && !Rich_valid(a)) { problems.push(a); } return m; });
    const outFlags = flags.filter(f => t.includes(f.tex));
    return { text: t, flags: outFlags, invalid: problems };
  }
  function Rich_valid(tex) { try { root.katex.renderToString(tex, { throwOnError: true, strict: 'ignore' }); return true; } catch (e) { return false; } }

  const api = { viNum, viDecimal, texToSpeech, speechSegments, speechToMath, wordsToNum };
  root.MS = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
