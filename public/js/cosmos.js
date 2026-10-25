'use strict';
/* ===== COSMOS: nền vũ trụ (canvas), avatar hoạt hình (SVG), xúc xắc 3D thật (CSS 3D) ===== */
(function () {
  // ---------- Nền vũ trụ ----------
  const canvas = $('#bg'), ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = Math.min(innerWidth, innerHeight) < 700;
  let w, h, dpr, stars = [], shooters = [], layer, mx = 0, my = 0, sy = 0, running = true, t0 = performance.now(), galaxy = [], nextShoot = 1500;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const COLORS = ['#ffffff', '#cfe3ff', '#b9a7ff', '#ffe9a8', '#9be7ff'];

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2); w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round((w * h) / 2600 * (mobile ? .4 : 1));
    stars = Array.from({ length: Math.min(n, 900) }, () => ({ x: Math.random() * w, y: Math.random() * h, z: [.15, .35, .7, 1][Math.floor(Math.random() * 4)], r: rnd(.4, 1.6), c: COLORS[Math.floor(Math.random() * COLORS.length)], p: rnd(0, 6.28), s: rnd(.6, 3.2), flare: Math.random() < .03 }));
    galaxy = Array.from({ length: mobile ? 160 : 380 }, (_, i) => { const a = i / 28 + (i % 2) * Math.PI, r = 4 + i * .45; return { a, r, s: rnd(.5, 1.6) }; });
    // lớp tĩnh: tinh vân + dải Ngân Hà + hành tinh có vành (vẽ một lần)
    layer = document.createElement('canvas'); layer.width = w * dpr; layer.height = h * dpr;
    const g = layer.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#070b23'); bg.addColorStop(.5, '#0b1030'); bg.addColorStop(1, '#10083a'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    [[.15, .2, .45, 'rgba(124,58,237,.28)'], [.85, .25, .4, 'rgba(34,211,238,.18)'], [.5, .75, .5, 'rgba(217,70,239,.2)'], [.2, .85, .35, 'rgba(37,99,235,.25)'], [.8, .8, .3, 'rgba(250,204,21,.09)']].forEach(([x, y, r, c]) => {
      const rg = g.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * Math.max(w, h)); rg.addColorStop(0, c); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, w, h);
    });
    g.save(); g.translate(w * .5, h * .5); g.rotate(-.5); const mw = g.createLinearGradient(0, -h * .18, 0, h * .18);
    mw.addColorStop(0, 'rgba(180,170,255,0)'); mw.addColorStop(.5, 'rgba(200,190,255,.12)'); mw.addColorStop(1, 'rgba(180,170,255,0)'); g.fillStyle = mw; g.fillRect(-w, -h * .18, w * 2, h * .36);
    for (let i = 0; i < (mobile ? 250 : 700); i++) { g.fillStyle = `rgba(255,255,255,${rnd(.05, .4)})`; g.fillRect(rnd(-w, w), rnd(-h * .18, h * .18) * Math.random(), 1, 1); }
    g.restore();
    // hành tinh có vành (góc phải trên)
    const px = w * .86, py = h * .16, pr = Math.min(w, h) * .07;
    g.save(); g.translate(px, py); g.rotate(-.35);
    g.strokeStyle = 'rgba(190,170,255,.45)'; g.lineWidth = pr * .14; g.beginPath(); g.ellipse(0, 0, pr * 1.9, pr * .5, 0, Math.PI, 2 * Math.PI); g.stroke();
    const pg = g.createRadialGradient(-pr * .35, -pr * .35, pr * .1, 0, 0, pr); pg.addColorStop(0, '#d8b4fe'); pg.addColorStop(.6, '#7c3aed'); pg.addColorStop(1, '#2e1065');
    g.fillStyle = pg; g.beginPath(); g.arc(0, 0, pr, 0, 6.283); g.fill();
    g.beginPath(); g.ellipse(0, 0, pr * 1.9, pr * .5, 0, 0, Math.PI); g.stroke(); g.restore();
  }
  function frame(now) {
    if (!running) return;
    const t = (now - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.drawImage(layer, 0, 0, w, h);
    const ox = reduce ? 0 : (mx - w / 2) / w, oy = reduce ? 0 : (my - h / 2) / h, sc = reduce ? 0 : sy;
    // thiên hà xoắn ốc quay chậm (xa -> thị sai nhỏ)
    const gx = w * .16 - ox * 8, gy = h * .3 - oy * 8 - sc * .02; ctx.save(); ctx.translate(gx, gy); ctx.rotate(reduce ? 0 : t * .02); ctx.scale(1, .55);
    for (const p of galaxy) { ctx.fillStyle = 'rgba(190,200,255,' + (.5 - p.r / 400) + ')'; ctx.fillRect(Math.cos(p.a) * p.r, Math.sin(p.a) * p.r, p.s, p.s); } ctx.restore();
    // hành tinh xanh tự quay (góc trái dưới)
    const bx = w * .08 - ox * 20, by = h * .95 - sc * .03, br = Math.min(w, h) * .16;
    ctx.save(); ctx.beginPath(); ctx.arc(bx, by, br, 0, 6.283); ctx.clip();
    const og = ctx.createRadialGradient(bx - br * .3, by - br * .3, br * .1, bx, by, br); og.addColorStop(0, '#60a5fa'); og.addColorStop(.6, '#1d4ed8'); og.addColorStop(1, '#0b1e5c'); ctx.fillStyle = og; ctx.fillRect(bx - br, by - br, br * 2, br * 2);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 5; i++) { const cx = bx - br + ((t * 8 * (1 + i * .2) + i * br * .7) % (br * 2.4)); ctx.beginPath(); ctx.ellipse(cx, by - br * .6 + i * br * .3, br * .35, br * .06, 0, 0, 6.283); ctx.fill(); }
    ctx.restore(); ctx.strokeStyle = 'rgba(120,190,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, br, 0, 6.283); ctx.stroke();
    // sao nhấp nháy nhịp không đều + thị sai nhiều tầng
    for (const s of stars) {
      const tw = reduce ? .8 : .45 + .55 * Math.abs(Math.sin(t / s.s + s.p)); const x = ((s.x - ox * 60 * s.z) % w + w) % w, y = ((s.y - oy * 60 * s.z - sc * s.z * .06) % h + h) % h;
      ctx.globalAlpha = s.flare ? Math.min(1, tw * 1.4) : tw * (.4 + s.z * .6); ctx.fillStyle = s.c; const r = s.r * (s.flare ? 1.8 : 1) * (.7 + s.z * .5); ctx.fillRect(x, y, r, r);
    }
    ctx.globalAlpha = 1;
    // sao băng
    if (!reduce) {
      if (now > nextShoot) { nextShoot = now + rnd(1800, 5200); const a = rnd(.3, 1.1) * (Math.random() < .5 ? 1 : -1) + (Math.random() < .5 ? 0 : Math.PI); shooters.push({ x: rnd(0, w), y: rnd(0, h * .6), v: rnd(5, 11), a, l: rnd(60, 140), life: 1, c: ['#9be7ff', '#c4b5fd', '#ffffff'][Math.floor(Math.random() * 3)] }); }
      shooters = shooters.filter(s => s.life > 0);
      for (const s of shooters) { s.x += Math.cos(s.a) * s.v; s.y += Math.sin(s.a) * s.v; s.life -= .012; const g = ctx.createLinearGradient(s.x, s.y, s.x - Math.cos(s.a) * s.l, s.y - Math.sin(s.a) * s.l); g.addColorStop(0, s.c); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.globalAlpha = Math.max(0, s.life); ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - Math.cos(s.a) * s.l, s.y - Math.sin(s.a) * s.l); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    if (!reduce) requestAnimationFrame(frame);
  }
  function start() { build(); running = true; requestAnimationFrame(frame); }
  addEventListener('resize', () => { build(); if (reduce) requestAnimationFrame(frame); });
  addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
  addEventListener('scroll', () => { sy = scrollY; }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else if (!reduce) { running = true; requestAnimationFrame(frame); } });
  start();

  // ---------- Avatar hoạt hình ----------
  const eye = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="5.2" ry="6.4" fill="#1b1230"/><circle cx="${x + 1.8}" cy="${y - 2.2}" r="2" fill="#fff"/>`;
  const cheeks = '<circle cx="28" cy="62" r="6" fill="#ff8fab" opacity=".45"/><circle cx="72" cy="62" r="6" fill="#ff8fab" opacity=".45"/>';
  const smile = '<path d="M44 66 Q50 72 56 66" stroke="#1b1230" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
  const FACES = {
    cat: `<polygon points="18,44 22,10 46,28" fill="#f59e42"/><polygon points="82,44 78,10 54,28" fill="#f59e42"/><polygon points="24,38 25,19 38,30" fill="#ffb6c1"/><polygon points="76,38 75,19 62,30" fill="#ffb6c1"/><circle cx="50" cy="56" r="34" fill="#f59e42"/><path d="M50 22 v10 M40 24 l2 8 M60 24 l-2 8" stroke="#d97706" stroke-width="3" stroke-linecap="round"/><ellipse cx="50" cy="66" rx="14" ry="10" fill="#fff3e0"/>${eye(36, 52)}${eye(64, 52)}<polygon points="46,60 54,60 50,65" fill="#ff7a93"/>${smile.replace('44 66 Q50 72 56 66', '44 68 Q50 74 56 68')}<path d="M20 62h-12M20 67l-11 4M80 62h12M80 67l11 4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>${cheeks}`,
    bear: `<circle cx="22" cy="26" r="13" fill="#8b5a2b"/><circle cx="78" cy="26" r="13" fill="#8b5a2b"/><circle cx="22" cy="26" r="7" fill="#d9a066"/><circle cx="78" cy="26" r="7" fill="#d9a066"/><circle cx="50" cy="55" r="34" fill="#a86b36"/><ellipse cx="50" cy="66" rx="16" ry="12" fill="#f1d1a5"/>${eye(36, 49)}${eye(64, 49)}<ellipse cx="50" cy="60" rx="6" ry="4.5" fill="#2b1608"/>${smile.replace('44 66 Q50 72 56 66', '43 69 Q50 75 57 69')}${cheeks}`,
    fox: `<polygon points="14,48 16,6 46,30" fill="#ef6c1a"/><polygon points="86,48 84,6 54,30" fill="#ef6c1a"/><polygon points="20,40 21,16 36,30" fill="#2b1608"/><polygon points="80,40 79,16 64,30" fill="#2b1608"/><path d="M50 90 C14 84 12 50 14 46 L50 28 L86 46 C88 50 86 84 50 90Z" fill="#f2761f"/><path d="M50 90 C30 88 18 70 22 60 L50 70 L78 60 C82 70 70 88 50 90Z" fill="#fff"/>${eye(36, 52)}${eye(64, 52)}<ellipse cx="50" cy="68" rx="5" ry="4" fill="#1b1230"/>${cheeks}`,
    rabbit: `<ellipse cx="34" cy="22" rx="10" ry="26" fill="#f4f1ff"/><ellipse cx="66" cy="22" rx="10" ry="26" fill="#f4f1ff"/><ellipse cx="34" cy="24" rx="5" ry="18" fill="#ffb6c1"/><ellipse cx="66" cy="24" rx="5" ry="18" fill="#ffb6c1"/><circle cx="50" cy="60" r="32" fill="#f8f5ff"/>${eye(37, 56)}${eye(63, 56)}<ellipse cx="50" cy="66" rx="4.5" ry="3.5" fill="#ff7a93"/><path d="M50 69 v4 M44 75 Q50 79 50 73 Q50 79 56 75" stroke="#1b1230" stroke-width="2" fill="none" stroke-linecap="round"/>${cheeks.replace(/#ff8fab/g, '#ffb3c6')}`,
    penguin: `<ellipse cx="50" cy="56" rx="34" ry="38" fill="#1f2a4d"/><ellipse cx="50" cy="64" rx="22" ry="27" fill="#f4f7ff"/><circle cx="38" cy="44" r="9" fill="#fff"/><circle cx="62" cy="44" r="9" fill="#fff"/><circle cx="39" cy="45" r="4.6" fill="#1b1230"/><circle cx="61" cy="45" r="4.6" fill="#1b1230"/><circle cx="40.6" cy="43.4" r="1.5" fill="#fff"/><circle cx="62.6" cy="43.4" r="1.5" fill="#fff"/><polygon points="43,54 57,54 50,63" fill="#ffb020"/><ellipse cx="30" cy="94" rx="10" ry="4" fill="#ffb020"/><ellipse cx="70" cy="94" rx="10" ry="4" fill="#ffb020"/>${cheeks.replace('cx="28" cy="62"', 'cx="27" cy="56"').replace('cx="72" cy="62"', 'cx="73" cy="56"')}`,
    otter: `<circle cx="24" cy="30" r="9" fill="#7a5230"/><circle cx="76" cy="30" r="9" fill="#7a5230"/><circle cx="50" cy="56" r="34" fill="#8b5e3c"/><ellipse cx="50" cy="66" rx="22" ry="17" fill="#e9d2b0"/>${eye(36, 50)}${eye(64, 50)}<ellipse cx="50" cy="60" rx="6" ry="4.5" fill="#2b1608"/><path d="M50 64 v4 M43 70 Q50 76 57 70" stroke="#2b1608" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M34 66h-14M34 70l-12 4M66 66h14M66 70l12 4" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>${cheeks}`
  };
  window.Avatars = {
    list: Object.keys(FACES),
    label: { cat: 'Mèo', bear: 'Gấu', fox: 'Cáo', rabbit: 'Thỏ', penguin: 'Cánh cụt', otter: 'Rái cá' },
    html(name, size = 44, ring = true) {
      const n = FACES[name] ? name : 'cat';
      return `<span class="av ${ring ? 'ring' : ''}" style="width:${size}px;height:${size}px"><svg viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="Avatar ${esc(this.label[n])}"><defs><radialGradient id="avbg${n}" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#3b2d8f"/><stop offset="1" stop-color="#120a3d"/></radialGradient></defs><circle cx="50" cy="50" r="50" fill="url(#avbg${n})"/><g transform="translate(5,5) scale(.9)">${FACES[n]}</g></svg></span>`;
    }
  };

  // ---------- Xúc xắc 3D thật ----------
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const faceHtml = n => `<div class="pips">${Array.from({ length: 9 }, (_, i) => `<i class="${PIPS[n].includes(i) ? 'pip' + (n === 1 ? ' red' : '') : ''}"></i>`).join('')}</div>`;
  const ROT = { 1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 2: [-90, 0], 5: [90, 0] };
  window.Dice = {
    cube(value = 1, size = 76) {
      return `<div class="die-wrap" style="--s:${size}px"><div class="die3d" data-v="${value}" style="transform:rotateX(${ROT[value][0]}deg) rotateY(${ROT[value][1]}deg)">
        <div class="face f1">${faceHtml(1)}</div><div class="face f6">${faceHtml(6)}</div><div class="face f3">${faceHtml(3)}</div><div class="face f4">${faceHtml(4)}</div><div class="face f2">${faceHtml(2)}</div><div class="face f5">${faceHtml(5)}</div></div><div class="die-shadow"></div></div>`;
    },
    roll(wrap, value, ms = 1300) {
      const d = $('.die3d', wrap); if (!d) return Promise.resolve();
      const [rx, ry] = ROT[value], sp = 2 + Math.floor(Math.random() * 2);
      d.style.transition = `transform ${ms}ms cubic-bezier(.15,.7,.2,1)`;
      d.style.transform = `rotateX(${rx + 360 * sp * (Math.random() < .5 ? 1 : -1)}deg) rotateY(${ry + 360 * sp}deg)`;
      d.dataset.v = value; wrap.classList.add('rolling');
      return new Promise(r => setTimeout(() => { d.style.transition = 'none'; d.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; wrap.classList.remove('rolling'); r(); }, ms + 40));
    },
    flat(n, size = 28) { return `<span class="die-flat" style="--s:${size}px">${faceHtml(n)}</span>`; }
  };
})();
