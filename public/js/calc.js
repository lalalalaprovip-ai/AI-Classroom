'use strict';
/* ===== CALC: máy tính "＝" cho AI BUDDY — chỉ nhập phép tính là ra kết quả (có hàm xác suất thống kê) ===== */
(function () {
  const m = window.math; if (!m) return;
  const fact = n => m.factorial(n);
  const Phi = z => 0.5 * (1 + m.erf(z / Math.SQRT2));
  const normpdf = (x, mu = 0, s = 1) => Math.exp(-0.5 * ((x - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
  const nCr = (n, k) => (k < 0 || k > n) ? 0 : m.combinations(n, k);
  const lnC = (n, k) => { let r = 0; for (let i = 1; i <= k; i++) r += Math.log(n - k + i) - Math.log(i); return r; };
  const binompmf = (k, n, p) => (k < 0 || k > n) ? 0 : Math.exp(lnC(n, k) + (k ? k * Math.log(p) : 0) + ((n - k) ? (n - k) * Math.log(1 - p) : 0));
  const poissonpmf = (k, l) => { if (k < 0) return 0; let lg = 0; for (let i = 2; i <= k; i++) lg += Math.log(i); return Math.exp(-l + k * Math.log(l) - lg); };
  const sumTo = (f, k) => { let s = 0; for (let i = 0; i <= Math.floor(k); i++) s += f(i); return s; };
  function invnorm(p) { // Acklam
    if (p <= 0 || p >= 1) throw new Error('p phải nằm trong (0,1)');
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239], b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572],
      c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783], d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    let q, r, x; if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else { q = p - 0.5; r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    return x;
  }
  m.import({
    Phi, Phi0: z => Phi(z) - 0.5, phi: normpdf, normpdf, normcdf: (x, mu = 0, s = 1) => Phi((x - mu) / s), invnorm, nCr, nPr: (n, k) => m.permutations(n, k),
    binompmf, binomcdf: (k, n, p) => sumTo(i => binompmf(i, n, p), k), poissonpmf, poissoncdf: (k, l) => sumTo(i => poissonpmf(i, l), k),
    expcdf: (x, l) => x < 0 ? 0 : 1 - Math.exp(-l * x), C: nCr, giaithua: fact
  }, { override: true, silent: true });

  window.Calc = {
    help: 'Ví dụ: 3/8+0.25 · sqrt(2)*5 · nCr(10,3) · binompmf(2,5,0.3) · normcdf(1.96) · Phi0(1.5) · invnorm(0.975) · mean(2,4,6) · std(2,4,6,8)',
    run(src) {
      let s = String(src || '').trim(); if (!s) return { ok: false, error: 'Hãy nhập một phép tính.' };
      s = s.replace(/^=+/, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/√/g, 'sqrt').replace(/π/g, 'pi').replace(/−/g, '-').replace(/\^\{([^}]*)\}/g, '^($1)').replace(/\\cdot|\\times/g, '*').replace(/\\left|\\right/g, '').replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))').replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)');
      if (/\d,\d/.test(s) && !/[a-zA-Z]\(/.test(s)) s = s.replace(/(\d),(\d)/g, '$1.$2');
      s = s.replace(/(\d)\s*%/g, '($1/100)').replace(/(\d+)!/g, 'factorial($1)');
      try {
        const node = m.parse(s), val = node.evaluate(); let tex = ''; try { tex = node.toTex({ parenthesis: 'keep' }); } catch (e) { }
        let txt, exact = '';
        if (typeof val === 'number') { txt = m.format(val, { precision: 12 }); if (Number.isFinite(val) && !Number.isInteger(val)) { try { const fr = m.fraction(val); if (fr.d <= 1000) exact = '\\frac{' + fr.n * fr.s + '}{' + fr.d + '}'; } catch (e) { } } }
        else txt = m.format(val, { precision: 12 });
        if (/NaN|undefined/.test(txt)) return { ok: false, error: 'Không tính được (kết quả không xác định). Kiểm tra lại biểu thức.' };
        return { ok: true, tex, result: txt, exact, round4: typeof val === 'number' && Number.isFinite(val) ? m.round(val, 4) : null };
      } catch (e) { return { ok: false, error: 'Chưa hiểu biểu thức: ' + e.message }; }
    }
  };
})();
