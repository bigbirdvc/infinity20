// FELT & PLUSH — stuffed-toy sprite style for Infinite Adventure.
// Plain Canvas2D only. All drawing is authored in a 512-unit space and scaled.
(function () {
  // ---------- palette ----------
  const P = {
    out: '#4a3226',      // warm cocoa outline
    cream: '#f0e2c4', creamD: '#d8c09a',
    sage: '#93ad76', sageD: '#6f8c5c', sageL: '#a9c08a',
    rust: '#c0613f', rustD: '#933f2b',
    blue: '#7f9cb6', blueD: '#5d7891',
    mustard: '#d8a73c', mustardD: '#a97b25',
    brown: '#8c5e40', brownD: '#6a432d',
    silver: '#bcc5cc',
    skin: '#f4cfb1', blush: '#e99485',
    gob: '#a8b862', gobD: '#7f9145',
    ink: '#2c2024', thread: '#fbf1dc'
  };
  let K = 1; // device px per unit (for shadow params which ignore transforms)

  // ---------- colour utils ----------
  function hex(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
  function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
  const lt = (c, t) => mix(c, '#fff7e8', t), dk = (c, t) => mix(c, '#2a1c24', t);
  function al(c, a) { const v = hex(c); return `rgba(${v[0]},${v[1]},${v[2]},${a})`; }
  function RNG(seed) { let s = (seed * 2654435761) >>> 0 || 7; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  // ---------- geometry (shapes are closed point lists) ----------
  function ell(cx, cy, rx, ry, n = 128, rot = 0) {
    const p = [], c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; p.push([cx + x * c - y * s, cy + x * s + y * c]); }
    return p;
  }
  function smooth(c, per = 14, closed = true) { // Catmull-Rom
    const p = [], n = c.length, m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const p0 = c[closed ? (i - 1 + n) % n : Math.max(i - 1, 0)], p1 = c[i], p2 = c[(i + 1) % n], p3 = c[closed ? (i + 2) % n : Math.min(i + 2, n - 1)];
      for (let j = 0; j < per; j++) {
        const t = j / per, t2 = t * t, t3 = t2 * t;
        p.push([0, 1].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
      }
    }
    if (!closed) p.push(c[n - 1]);
    return p;
  }
  function rrect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2); const p = [], q = 10;
    const cs = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
    for (const [cx, cy, a0] of cs) for (let i = 0; i <= q; i++) { const a = a0 + i / q * Math.PI / 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return p;
  }
  function area(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; }
  function normals(p) {
    const s = area(p) > 0 ? 1 : -1, n = p.length;
    return p.map((q, i) => { const a = p[(i - 1 + n) % n], b = p[(i + 1) % n]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; return [s * ty / l, -s * tx / l]; });
  }
  function inset(p, d) { const N = normals(p); return p.map((q, i) => [q[0] - N[i][0] * d, q[1] - N[i][1] * d]); }
  function bbox(p) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }
  function resample(p, step, closed = true) {
    const o = [], n = p.length, m = closed ? n : n - 1; let carry = 0;
    for (let i = 0; i < m; i++) {
      const a = p[i], b = p[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]); let t = carry;
      while (t < L) { o.push([a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L]); t += step; }
      carry = t - L;
    }
    return o;
  }
  function trace(ctx, p, closed = true) { ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); if (closed) ctx.closePath(); }
  function xf(p, tx, ty, rot = 0, sx = 1, sy = sx) { const c = Math.cos(rot), s = Math.sin(rot); return p.map(([x, y]) => { x *= sx; y *= sy; return [tx + x * c - y * s, ty + x * s + y * c]; }); }

  // ---------- material: felt / plush ----------
  function shadowOn(ctx, col, blur, ox, oy) { ctx.shadowColor = col; ctx.shadowBlur = blur * K; ctx.shadowOffsetX = ox * K; ctx.shadowOffsetY = oy * K; }
  function shadowOff(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }
  function outlineCol(col) { return mix(dk(col, 0.55), P.out, 0.55); }

  // outline pass only (lets several lobes share one silhouette)
  function outline(ctx, p, col, ow = 9, cast = true) {
    ctx.save(); trace(ctx, p); ctx.lineJoin = 'round'; ctx.lineWidth = ow; ctx.strokeStyle = outlineCol(col);
    if (cast) shadowOn(ctx, 'rgba(52,32,28,0.32)', 14, 4, 7);
    ctx.stroke(); ctx.restore();
  }

  // stitched running seam along a (closed or open) point list
  function stitch(ctx, p, col, o = {}) {
    if (o.hide && p.some(o.hide)) { // split into visible runs
      const runs = []; let cur = [];
      for (const q of p) { if (o.hide(q)) { if (cur.length > 1) runs.push(cur); cur = []; } else cur.push(q); }
      if (cur.length > 1) { if (o.closed !== false && runs.length && !o.hide(p[0])) runs[0] = cur.concat(runs[0]); else runs.push(cur); }
      for (const r of runs) stitch(ctx, r, col, { ...o, hide: null, closed: false });
      return;
    }
    const lw = o.lw || 3, dash = o.dash || [8, 6], closed = o.closed !== false;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash(dash);
    trace(ctx, p, closed); ctx.translate(0.8, 1.4); ctx.lineWidth = lw + 0.6; ctx.strokeStyle = 'rgba(40,24,22,0.30)'; ctx.stroke();
    ctx.setTransform(ctx.getTransform().translate(-0.8, -1.4));
    trace(ctx, p, closed); ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.stroke();
    ctx.restore();
  }

  function plush(ctx, p, col, o = {}) {
    const b = bbox(p), m = Math.min(b.w, b.h), M = Math.max(b.w, b.h);
    const rnd = RNG(o.seed || Math.round(b.x * 31 + b.y * 17 + b.w));
    if (o.outline !== false) outline(ctx, p, col, o.ow || 9, o.cast !== false);
    ctx.save(); trace(ctx, p); ctx.fillStyle = col; ctx.fill(); ctx.clip();
    // soft puffy body light (top-left)
    const lx = b.x + b.w * (o.lx ?? 0.32), ly = b.y + b.h * (o.ly ?? 0.26);
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, M * 0.95);
    g.addColorStop(0, al(lt(col, 0.42), 0.95)); g.addColorStop(0.42, al(col, 0)); g.addColorStop(1, al(dk(col, 0.42), 0.85));
    ctx.fillStyle = g; ctx.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
    // inner shadows via an outer frame casting shadow inward
    const frame = () => { ctx.beginPath(); ctx.rect(b.x - 600, b.y - 600, b.w + 1200, b.h + 1200); ctx.moveTo(p[0][0], p[0][1]); for (let i = p.length - 1; i > 0; i--) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath(); };
    ctx.fillStyle = '#000';
    shadowOn(ctx, al(dk(col, 0.65), 0.55), m * 0.2, -m * 0.05, -m * 0.07); frame(); ctx.fill('evenodd');      // bottom-right tuck
    shadowOn(ctx, al(dk(col, 0.5), 0.35), m * 0.07, 0, 0); frame(); ctx.fill('evenodd');                      // pillow rim
    shadowOn(ctx, al(lt(col, 0.7), 0.55), m * 0.12, m * 0.05, m * 0.06); frame(); ctx.fill('evenodd');        // top-left sheen
    shadowOff(ctx);
    // felt fibres
    const nf = Math.min(1600, b.w * b.h / 70);
    ctx.lineWidth = 1; ctx.lineCap = 'round';
    for (let i = 0; i < nf; i++) {
      const x = b.x + rnd() * b.w, y = b.y + rnd() * b.h, a = rnd() * Math.PI, l = 2 + rnd() * 4;
      ctx.strokeStyle = rnd() < 0.5 ? al(lt(col, 0.6), 0.10) : al(dk(col, 0.6), 0.08);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
    }
    if (o.inner) o.inner(ctx, b);
    ctx.restore();
    // running stitch seam
    if (o.stitch !== false) {
      const si = o.si ?? Math.max(5, Math.min(13, m * 0.1));
      const dl = o.dash || (m < 60 ? [5, 4] : [8, 6]);
      stitch(ctx, inset(p, si), o.thread || dk(col, 0.42), { lw: o.slw || (m < 60 ? 2.2 : 3), dash: dl, hide: o.hide });
    }
    // fuzzy edge hairs: short soft fibres breaking the outline (subtle; vanishes when small)
    if (o.fuzz !== false) {
      const pts = resample(p, 2.2), N = normals(pts), oc = outlineCol(col), ow = (o.ow || 9) / 2;
      ctx.save(); ctx.lineCap = 'round';
      for (let i = 0; i < pts.length; i++) {
        const [x, y] = pts[i], [nx, ny] = N[i], j = (rnd() - 0.5) * 1.2;
        const lit = (-nx - ny) > 0.3;
        // outward fibre in outline tone
        if (rnd() < 0.5) { const len = ow + 0.3 + rnd() * 1.6; ctx.lineWidth = 0.8; ctx.strokeStyle = al(oc, 0.24);
          ctx.beginPath(); ctx.moveTo(x + nx * ow * 0.5, y + ny * ow * 0.5); ctx.lineTo(x + (nx - ny * j) * len, y + (ny + nx * j) * len); ctx.stroke(); }
        // fibre of fabric colour poking over the outline
        if (rnd() < 0.45) { const len = ow * (0.4 + rnd() * 0.7); ctx.lineWidth = 1.1; ctx.strokeStyle = al(lit ? lt(col, 0.3) : col, 0.55);
          ctx.beginPath(); ctx.moveTo(x - nx * 2, y - ny * 2); ctx.lineTo(x + (nx + ny * j) * len, y + (ny - nx * j) * len); ctx.stroke(); }
      }
      ctx.restore();
    }
  }

  // ---------- face parts ----------
  function safetyEye(ctx, x, y, r, o = {}) {
    ctx.save();
    shadowOn(ctx, 'rgba(40,20,20,0.35)', r * 0.5, r * 0.1, r * 0.2);
    ctx.beginPath(); ctx.ellipse(x, y, r * (o.sx || 1), r, 0, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 1.1);
    g.addColorStop(0, '#5a4650'); g.addColorStop(0.5, '#241a1f'); g.addColorStop(1, '#0e0a0c');
    ctx.fillStyle = g; ctx.fill(); shadowOff(ctx);
    ctx.fillStyle = 'rgba(255,253,245,0.95)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.32, y - r * 0.36, r * 0.34, r * 0.28, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.34, y + r * 0.34, r * 0.13, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function buttonEye(ctx, x, y, r, col) {
    plush(ctx, ell(x, y, r, r, 48), col, { ow: 3, stitch: false, fuzz: false, cast: true });
    ctx.save(); ctx.fillStyle = al(dk(col, 0.7), 0.9);
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.arc(x + dx * r * 0.28, y + dy * r * 0.28, r * 0.12, 0, 7); ctx.fill(); }
    ctx.strokeStyle = P.thread; ctx.lineWidth = r * 0.09; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - r * 0.28, y - r * 0.28); ctx.lineTo(x + r * 0.28, y + r * 0.28); ctx.moveTo(x + r * 0.28, y - r * 0.28); ctx.lineTo(x - r * 0.28, y + r * 0.28); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(x - r * 0.45, y - r * 0.5, r * 0.25, r * 0.15, -0.6, 0, 7); ctx.fill();
    ctx.restore();
  }
  function button(ctx, x, y, r, col) {
    plush(ctx, ell(x, y, r, r, 40), col, { ow: 3, stitch: false, fuzz: false });
    ctx.save(); ctx.fillStyle = al(dk(col, 0.6), 0.85);
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.arc(x + dx * r * 0.27, y + dy * r * 0.27, r * 0.13, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function cheek(ctx, x, y, r) {
    ctx.save();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.6);
    g.addColorStop(0, al(P.blush, 0.55)); g.addColorStop(1, al(P.blush, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4); ctx.restore();
    plush(ctx, ell(x, y, r, r * 0.8, 48), P.blush, { ow: 0.01, outline: false, fuzz: false, si: r * 0.28, thread: lt(P.blush, 0.6), dash: [3, 3], slw: 1.6 });
  }
  function thread(ctx, pts, col, lw) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const pp = smooth(pts, 12, false);
    trace(ctx, pp, false); ctx.strokeStyle = 'rgba(40,20,20,0.25)'; ctx.lineWidth = lw + 1.5; ctx.translate(0.8, 1.4); ctx.stroke();
    ctx.translate(-0.8, -1.4); trace(ctx, pp, false); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
    // satin-stitch strands
    ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.lineWidth = 1;
    const rs = resample(pp, 3.5, false);
    for (let i = 0; i < rs.length; i++) { const [x, y] = rs[i]; ctx.beginPath(); ctx.moveTo(x - lw * 0.35, y - lw * 0.35); ctx.lineTo(x + lw * 0.25, y + lw * 0.3); ctx.stroke(); }
    ctx.restore();
  }

  // common frame: 512-unit art space, base line at y=504 -> lands ~8px above the canvas bottom.
  // Clipping just below the base keeps part drop-shadows from forming a ground shadow.
  function begin(ctx, size) {
    const s = size / 512, f = 0.97; K = s * f;
    ctx.save(); ctx.scale(s, s); ctx.translate(256, 500); ctx.scale(f, f); ctx.translate(-256, -504);
    ctx.beginPath(); ctx.rect(-60, -60, 632, 569); ctx.clip();
  }

  // ---------- HERO: knight ----------
  function hero(ctx, size) {
    begin(ctx, size);
    // cape
    plush(ctx, smooth([[196, 318], [316, 318], [344, 410], [342, 486], [256, 494], [170, 486], [168, 410]]), P.rust, { si: 9 });
    // boots
    plush(ctx, smooth([[196, 462], [240, 458], [252, 484], [246, 504], [196, 504], [186, 486]]), P.brown);
    plush(ctx, smooth([[270, 460], [314, 462], [326, 486], [318, 504], [266, 504], [260, 484]]), P.brown);
    // body / tunic
    plush(ctx, smooth([[200, 322], [256, 312], [314, 322], [336, 392], [330, 466], [256, 480], [182, 466], [176, 392]]), P.blue, {
      inner(c) { // chest heart appliqué
        const h = smooth([[248, 372], [262, 360], [276, 372], [262, 392], [248, 392], [236, 376], [242, 364]]);
      }
    });
    // belt
    plush(ctx, smooth([[180, 418], [256, 428], [332, 418], [333, 444], [256, 454], [179, 444]], 10), P.mustard, { si: 6, dash: [5, 4], slw: 2 });
    button(ctx, 246, 440, 13, P.cream);
    // sword (in viewer-left hand)
    ctx.save(); ctx.translate(156, 424); ctx.rotate(-0.45);
    plush(ctx, smooth([[-16, -30], [-17, -160], [-10, -210], [0, -232], [10, -210], [17, -160], [16, -30]], 10), P.silver, { si: 7, thread: '#8e98a2', dash: [6, 5], slw: 2.2,
      inner(c) { c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(-6, -40); c.lineTo(-6, -190); c.stroke(); } });
    plush(ctx, rrect(-11, -14, 22, 52, 9), P.brownD, { stitch: false, ow: 7 });
    plush(ctx, rrect(-46, -34, 92, 24, 12), P.mustard, { si: 5, dash: [5, 4], slw: 2 });
    button(ctx, 0, 46, 14, P.rust);
    ctx.restore();
    // near arm + mitten
    plush(ctx, smooth([[196, 340], [214, 360], [186, 420], [160, 410], [176, 356]], 10), P.blue, { si: 6, stitch: false });
    plush(ctx, ell(160, 420, 24, 22, 64), P.skin, { stitch: false, ow: 7 });
    // plume (back to front)
    const plume = smooth([[300, 118], [296, 62], [262, 22], [208, 6], [150, 16], [180, 34], [194, 60], [204, 92], [210, 122]], 12);
    plush(ctx, plume, P.rust, { si: 10, lx: 0.4, ly: 0.2, inner(c) { // feather barbs
      c.strokeStyle = al(dk(P.rust, 0.35), 0.55); c.lineWidth = 3; c.lineCap = 'round';
      for (const [x0, y0, x1, y1, cx, cy] of [[250, 112, 182, 30, 230, 50], [266, 110, 230, 34, 262, 62]]) { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); c.stroke(); }
    } });
    // helmet
    plush(ctx, ell(254, 218, 130, 118), P.silver, { thread: '#8a96a2' });
    // mustard crest band over helmet top
    ctx.save(); trace(ctx, ell(254, 218, 130, 118)); ctx.clip();
    plush(ctx, smooth([[256, 92], [276, 96], [286, 170], [282, 190], [254, 192], [244, 170], [244, 98]], 10), P.mustard, { si: 6, dash: [5, 4], slw: 2, cast: false, ow: 5 });
    ctx.restore();
    // side rivet (3/4 view)
    button(ctx, 150, 250, 15, P.mustard);
    // face opening
    plush(ctx, smooth([[204, 200], [266, 188], [332, 200], [352, 250], [326, 300], [266, 312], [208, 300], [186, 250]]), P.skin, { thread: lt(P.skin, 0.0) , stitch: false, ow: 8, lx: 0.35, ly: 0.3 });
    stitch(ctx, inset(smooth([[204, 200], [266, 188], [332, 200], [352, 250], [326, 300], [266, 312], [208, 300], [186, 250]]), -13), '#8a96a2', { lw: 3, dash: [8, 6] });
    // face
    cheek(ctx, 216, 278, 14); cheek(ctx, 320, 278, 14);
    safetyEye(ctx, 236, 248, 17); safetyEye(ctx, 302, 248, 17);
    thread(ctx, [[258, 279], [268, 287], [279, 279]], '#6b3a32', 4.5);
    // shield (front, viewer-right)
    plush(ctx, ell(354, 404, 74, 74, 128), P.mustard, { si: 7 });
    plush(ctx, ell(354, 404, 56, 56, 128), P.rust, { ow: 5, cast: false, thread: P.thread, si: 9 });
    stitch(ctx, [[354, 358], [354, 450]], P.thread, { closed: false, lw: 3.4, dash: [8, 6] });
    stitch(ctx, [[308, 404], [400, 404]], P.thread, { closed: false, lw: 3.4, dash: [8, 6] });
    button(ctx, 354, 404, 17, P.cream);
    ctx.restore();
  }

  // ---------- ENEMY: goblin ----------
  function enemy(ctx, size) {
    begin(ctx, size);
    // feet
    plush(ctx, smooth([[186, 476], [236, 466], [252, 488], [244, 504], [180, 504], [172, 490]]), P.gob, { si: 6 });
    plush(ctx, smooth([[270, 466], [320, 476], [332, 490], [326, 504], [262, 504], [258, 488]]), P.gob, { si: 6 });
    // tunic with pinked hem
    const tun = [[206, 326], [306, 326], [326, 380], [334, 448]];
    for (let i = 0; i <= 8; i++) { const x = 334 - i * (168 / 8); tun.push([x, i % 2 ? 486 : 466]); }
    tun.push([178, 448], [186, 380]);
    plush(ctx, smooth(tun, 6), P.brown, { thread: P.mustard });
    // rope belt
    plush(ctx, smooth([[184, 400], [256, 410], [328, 400], [330, 420], [256, 430], [182, 420]], 10), P.mustard, { si: 5, dash: [4, 4], slw: 2 });
    // far arm
    plush(ctx, smooth([[208, 346], [222, 362], [196, 430], [172, 422], [188, 360]], 10), P.gob, { stitch: false });
    plush(ctx, ell(180, 430, 22, 20, 64), P.gob, { stitch: false, ow: 7 });
    // club
    ctx.save(); ctx.translate(352, 414); ctx.rotate(0.5);
    plush(ctx, smooth([[-12, 40], [-14, -60], [-30, -130], [-38, -190], [-22, -232], [12, -238], [34, -206], [30, -140], [14, -60], [12, 40]], 10), '#b8875a', {
      thread: P.cream, inner(c, b) { // corduroy-ish grain
        c.lineWidth = 3; for (let x = -40; x < 40; x += 10) { c.strokeStyle = 'rgba(60,30,20,0.18)'; c.beginPath(); c.moveTo(x * 0.3, 40); c.quadraticCurveTo(x * 0.6, -100, x * 0.9, -240); c.stroke(); }
        // wrapped leather band
        c.save(); shadowOn(c, 'rgba(50,20,10,0.45)', 6, 2, 4); c.fillStyle = P.rust; c.beginPath(); c.moveTo(-50, -168); c.quadraticCurveTo(0, -156, 50, -168); c.lineTo(50, -144); c.quadraticCurveTo(0, -132, -50, -144); c.closePath(); c.fill(); shadowOff(c);
        c.fillStyle = 'rgba(255,230,200,0.25)'; c.fillRect(-50, -166, 100, 5); c.restore();
        stitch(c, [[-40, -151], [0, -141], [40, -151]].map((q, i, a) => q), P.thread, { closed: false, lw: 2, dash: [4, 4] });
      } });
    button(ctx, -12, -200, 7, P.silver); button(ctx, 14, -215, 7, P.silver);
    ctx.restore();
    // near arm + hand over club
    plush(ctx, smooth([[300, 344], [318, 352], [352, 400], [334, 420], [292, 370]], 10), P.gob, { stitch: false });
    plush(ctx, ell(344, 414, 24, 22, 64), P.gob, { stitch: false, ow: 7 });
    // ears
    const earL = smooth([[168, 196], [100, 172], [26, 132], [60, 206], [148, 262]], 12);
    const earR = smooth([[340, 196], [412, 172], [486, 132], [452, 206], [362, 262]], 12);
    plush(ctx, earL, P.gob, { si: 8 }); plush(ctx, earR, P.gob, { si: 8 });
    plush(ctx, smooth([[150, 208], [96, 186], [58, 162], [82, 208], [140, 240]], 10), mix(P.blush, P.gob, 0.35), { outline: false, stitch: false, fuzz: false });
    plush(ctx, smooth([[358, 208], [416, 186], [454, 162], [430, 208], [372, 240]], 10), mix(P.blush, P.gob, 0.35), { outline: false, stitch: false, fuzz: false });
    // hair tufts
    plush(ctx, smooth([[236, 140], [226, 92], [254, 128], [270, 86], [276, 138]], 8), P.rustD, { stitch: false, si: 5 });
    // head
    plush(ctx, ell(256, 232, 120, 104), P.gob);
    // brows
    plush(ctx, smooth([[176, 186], [236, 200], [234, 214], [178, 202]], 6), P.gobD, { stitch: false, ow: 4, cast: false, fuzz: false });
    plush(ctx, smooth([[336, 186], [276, 200], [278, 214], [334, 202]], 6), P.gobD, { stitch: false, ow: 4, cast: false, fuzz: false });
    // eyes
    plush(ctx, ell(214, 240, 30, 32, 64), P.cream, { ow: 5, si: 5, dash: [4, 3], slw: 1.8, fuzz: false });
    plush(ctx, ell(298, 240, 30, 32, 64), P.cream, { ow: 5, si: 5, dash: [4, 3], slw: 1.8, fuzz: false });
    safetyEye(ctx, 220, 246, 16); safetyEye(ctx, 292, 246, 16);
    cheek(ctx, 180, 284, 13); cheek(ctx, 332, 284, 13);
    // mouth
    plush(ctx, smooth([[214, 286], [256, 294], [298, 286], [286, 312], [256, 320], [226, 312]], 8), '#6b2f2b', { stitch: false, ow: 4, cast: false, fuzz: false });
    plush(ctx, smooth([[226, 292], [238, 293], [233, 306]], 6), P.cream, { stitch: false, ow: 2.5, cast: false, fuzz: false });
    plush(ctx, smooth([[274, 293], [286, 292], [279, 306]], 6), P.cream, { stitch: false, ow: 2.5, cast: false, fuzz: false });
    // nose
    plush(ctx, smooth([[248, 256], [266, 256], [270, 276], [256, 282], [244, 274]], 8), P.gob, { stitch: false, ow: 4, fuzz: false });
    ctx.restore();
  }

  // puffy "cloud" outline: ellipse whose rim swells into n soft bumps
  function cloud(cx, cy, rx, ry, n, amp, rot = 0, phase = 0) {
    const p = [], N = 220, c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2, k = 1 + amp * (Math.abs(Math.sin((a + phase) * n / 2)) - 0.6);
      const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k; p.push([cx + x * c - y * s, cy + x * s + y * c]);
    }
    return p;
  }

  // ---------- HOUSE: felt playhouse ----------
  function house(ctx, size) {
    begin(ctx, size);
    // chimney (behind roof)
    plush(ctx, rrect(330, 96, 52, 120, 12), P.creamD, { si: 6, dash: [5, 4], slw: 2, inner(c) { c.strokeStyle = al(dk(P.creamD, 0.4), 0.55); c.lineWidth = 2; c.setLineDash([5, 4]); for (let y = 122; y < 214; y += 22) { c.beginPath(); c.moveTo(330, y); c.lineTo(382, y); c.stroke(); } } });
    plush(ctx, rrect(320, 84, 72, 24, 11), P.brownD, { stitch: false });
    plush(ctx, cloud(366, 56, 26, 18, 5, 0.25), P.cream, { stitch: false, ow: 5 });
    plush(ctx, cloud(398, 28, 16, 13, 4, 0.25), P.cream, { stitch: false, ow: 5 });
    // gable wall
    const wall = smooth([[124, 504], [123, 470], [122, 450], [122, 390], [124, 330], [190, 266], [256, 206], [322, 266], [388, 330], [390, 390], [390, 450], [389, 470], [388, 504], [320, 505], [192, 505]], 8);
    plush(ctx, wall, P.cream, { thread: P.creamD, lx: 0.3, ly: 0.35 });
    // attic round window
    plush(ctx, ell(256, 270, 30, 30, 64), P.brown, { stitch: false, ow: 7 });
    plush(ctx, ell(256, 270, 21, 21, 64), P.mustard, { outline: false, stitch: false, lx: 0.5, ly: 0.5 });
    ctx.save(); ctx.strokeStyle = P.cream; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(256, 250); ctx.lineTo(256, 290); ctx.moveTo(236, 270); ctx.lineTo(276, 270); ctx.stroke(); ctx.restore();
    // windows
    for (const wx of [140, 310]) {
      plush(ctx, rrect(wx, 372, 62, 62, 14), P.brown, { stitch: false, ow: 7 });
      plush(ctx, rrect(wx + 8, 380, 46, 46, 9), P.mustard, { outline: false, stitch: false, lx: 0.5, ly: 0.5,
        inner(c) { c.fillStyle = 'rgba(255,244,200,0.55)'; c.beginPath(); c.arc(wx + 31, 403, 16, 0, 7); c.fill(); } });
      ctx.save(); ctx.strokeStyle = P.cream; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(wx + 31, 381); ctx.lineTo(wx + 31, 425); ctx.moveTo(wx + 9, 403); ctx.lineTo(wx + 53, 403); ctx.stroke(); ctx.restore();
      plush(ctx, rrect(wx - 7, 432, 76, 20, 9), P.sage, { si: 4, dash: [4, 3], slw: 1.8 });
      for (let i = 0; i < 4; i++) button(ctx, wx + 6 + i * 17, 430, 7, i % 2 ? P.mustard : P.rust);
    }
    // door
    const door = smooth([[214, 504], [214, 410], [230, 380], [256, 372], [282, 380], [298, 410], [298, 504]], 8);
    plush(ctx, door, P.blue, { thread: P.cream, inner(c) { c.strokeStyle = 'rgba(40,50,70,0.25)'; c.lineWidth = 2.5; for (const x of [242, 270]) { c.beginPath(); c.moveTo(x, 378); c.lineTo(x, 504); c.stroke(); } } });
    button(ctx, 284, 446, 8, P.mustard);
    // roof: thick puffy inverted-V, seen slightly from above
    const roof = smooth([[36, 352], [110, 254], [183, 160], [256, 66], [329, 160], [402, 254], [476, 352], [462, 372], [424, 372], [340, 290], [256, 206], [172, 290], [88, 372], [50, 372]], 8);
    plush(ctx, roof, P.rust, { si: 11, lx: 0.3, ly: 0.15, thread: dk(P.rust, 0.5),
      inner(c, b) { // scalloped felt shingles in courses running down each slope
        for (const side of [-1, 1]) {
          const ex = 256 + side * 220, ey = 352, ux = (256 - ex) / 354, uy = (66 - ey) / 354;
          const N = (uy * -1 > 0 ? [-uy, ux] : [uy, -ux]); const Nn = N[1] > 0 ? N : [-N[0], -N[1]];
          const ang = Math.atan2(-uy, -ux);
          for (let t = 340; t >= 0; t -= 30) for (let r = 0; r < 3; r++) {
            const d = 16 + r * 24, tt = t + (r % 2) * 15;
            const x = ex + ux * tt + Nn[0] * d, y = ey + uy * tt + Nn[1] * d;
            c.save(); c.beginPath(); c.arc(x, y, 15, ang - Math.PI / 2, ang + Math.PI / 2); c.closePath();
            shadowOn(c, 'rgba(70,25,15,0.5)', 5, -ux * 3, -uy * 3); c.fillStyle = al(lt(P.rust, 0.06 + r * 0.05), 1); c.fill(); shadowOff(c);
            c.setLineDash([3, 3]); c.strokeStyle = al(dk(P.rust, 0.45), 0.7); c.lineWidth = 1.6; c.beginPath(); c.arc(x, y, 10, ang - 1.2, ang + 1.2); c.stroke(); c.restore();
          }
        }
        const g = c.createLinearGradient(b.x, b.y, b.x + b.w * 0.8, b.y + b.h); g.addColorStop(0, 'rgba(255,240,220,0.20)'); g.addColorStop(1, 'rgba(40,10,10,0.25)'); c.fillStyle = g; c.fillRect(b.x, b.y, b.w, b.h);
      } });
    button(ctx, 256, 96, 14, P.mustard);
    ctx.restore();
  }

  // ---------- TREE: stuffed canopy on corduroy trunk ----------
  function tree(ctx, size) {
    begin(ctx, size);
    const trunk = smooth([[228, 330], [284, 330], [292, 440], [336, 504], [256, 498], [176, 504], [220, 440]], 10);
    plush(ctx, trunk, P.brown, { thread: P.mustard, inner(c) {
      for (let i = -6; i <= 6; i++) { const xt = 256 + i * 6, xb = 256 + i * 14;
        c.strokeStyle = 'rgba(40,20,10,0.28)'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(xt, 320); c.quadraticCurveTo(xt + i, 450, xb, 506); c.stroke();
        c.strokeStyle = 'rgba(255,220,180,0.18)'; c.lineWidth = 2; c.beginPath(); c.moveTo(xt + 3, 320); c.quadraticCurveTo(xt + 3 + i, 450, xb + 5, 506); c.stroke(); }
    } });
    const G = '#7fa656';
    const can = cloud(256, 214, 190, 172, 11, 0.16, 0, 0.3);
    plush(ctx, can, G, { si: 14, ow: 10, lx: 0.3, ly: 0.22, inner(c, b) {
      // each bump gets its own soft pillow light, plus seams between panels
      for (let i = 0; i < 11; i++) {
        const a = (i + 0.5) / 11 * Math.PI * 2 - 0.3, x = 256 + Math.cos(a) * 150, y = 214 + Math.sin(a) * 136;
        const g = c.createRadialGradient(x - 14, y - 16, 2, x, y, 62);
        g.addColorStop(0, 'rgba(240,250,210,0.30)'); g.addColorStop(0.6, 'rgba(240,250,210,0)'); g.addColorStop(1, 'rgba(30,50,20,0.0)');
        c.fillStyle = g; c.fillRect(x - 70, y - 70, 140, 140);
      }
      // inner stuffed panels: three overlapping pillows (shadows only)
      for (const [x, y, r] of [[196, 170, 78], [318, 168, 74], [256, 268, 92]]) {
        c.save(); shadowOn(c, 'rgba(40,60,25,0.45)', 18, 4, 8); c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = al(G, 1); c.fill(); shadowOff(c);
        const g = c.createRadialGradient(x - r * 0.4, y - r * 0.45, 2, x, y, r * 1.05);
        g.addColorStop(0, al(lt(G, 0.38), 1)); g.addColorStop(0.55, al(G, 0.0)); g.addColorStop(1, al(dk(G, 0.3), 0.7));
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.restore();
      }
      // unify under one top-left light: warm sheen above, cool shade beneath the canopy
      const u = c.createLinearGradient(160, 60, 340, 400);
      u.addColorStop(0, 'rgba(255,248,215,0.16)'); u.addColorStop(0.5, 'rgba(0,0,0,0)'); u.addColorStop(1, 'rgba(30,45,25,0.30)');
      c.fillStyle = u; c.fillRect(b.x, b.y, b.w, b.h);
    } });
    // seams on the inner pillows (hidden where a later pillow overlaps)
    const pil = [[196, 170, 78], [318, 168, 74], [256, 268, 92]];
    pil.forEach(([x, y, r], i) => stitch(ctx, ell(x, y, r - 9, r - 9, 96), dk(G, 0.45), { lw: 3, dash: [8, 6], hide: q => pil.some(([X, Y, R], j) => j > i && Math.hypot(q[0] - X, q[1] - Y) < R + 3) }));
    // felt leaf appliqués
    const leaf = (x, y, r, s, col) => {
      const lp = xf(smooth([[0, -1], [0.55, -0.2], [0, 1], [-0.55, -0.2]], 10), x, y, r, s);
      plush(ctx, lp, col, { ow: 3.5, stitch: false, fuzz: false, cast: true });
      stitch(ctx, xf([[0, -0.8], [0, 0.8]], x, y, r, s), dk(col, 0.4), { closed: false, lw: 1.8, dash: [4, 3] });
    };
    leaf(118, 238, -0.9, 22, '#9cbc74'); leaf(394, 236, 0.9, 22, '#6f904f'); leaf(300, 76, 0.4, 20, '#9cbc74');
    leaf(172, 340, -2.4, 18, '#6f904f'); leaf(358, 330, 2.3, 18, '#6f904f');
    // felt apples
    for (const [x, y] of [[206, 220], [330, 214], [268, 318], [150, 160], [380, 296], [300, 128]]) {
      plush(ctx, ell(x, y, 15, 14, 48), P.rust, { stitch: false, ow: 4 });
      plush(ctx, ell(x + 8, y - 14, 7, 4, 24, -0.5), P.sageD, { stitch: false, ow: 2.5, fuzz: false, cast: false });
    }
    ctx.restore();
  }

  // ---------- regional palettes (nature + accents) ----------
  const REGIONS = {
    fresh:    { leaf: '#7fa656', leafD: '#5f8442', leafL: '#a3c477', fruit: '#c0613f', rock: '#b9b3a6', rockD: '#8f887b', bark: '#8c5e40', roof: '#c0613f', snow: null },
    dry:      { leaf: '#a9a45a', leafD: '#837f3f', leafL: '#c9c27a', fruit: '#d8a73c', rock: '#c9a27a', rockD: '#9c7754', bark: '#8c5e40', roof: '#c77a3f', snow: null },
    cool:     { leaf: '#6f9a8c', leafD: '#4f7568', leafL: '#97bdb0', fruit: '#c0613f', rock: '#b4bcc4', rockD: '#87919c', bark: '#7a5a46', roof: '#7f9cb6', snow: '#f4f1ea' },
    lush:     { leaf: '#5e9a4c', leafD: '#437636', leafL: '#86bd6b', fruit: '#e07a5a', rock: '#a9ad98', rockD: '#7e836d', bark: '#7d533a', roof: '#c0613f', snow: null },
    desert:   { leaf: '#9ba86a', leafD: '#76824b', leafL: '#bcc78c', fruit: '#e0a050', rock: '#d6ad7a', rockD: '#a98051', bark: '#a0714a', roof: '#d39a52', snow: null },
    volcanic: { leaf: '#6b5a5e', leafD: '#4a3c40', leafL: '#8e7b7c', fruit: '#e8743a', rock: '#6e6468', rockD: '#4c4347', bark: '#5a4038', roof: '#a84a3a', snow: null },
    twilight: { leaf: '#7e7bb8', leafD: '#5b5890', leafL: '#a4a1d6', fruit: '#e7b6e0', rock: '#9b9fb8', rockD: '#717592', bark: '#6a5070', roof: '#6d6fb0', snow: null },
  };
  let region = 'fresh';
  const R = key => REGIONS[region][key];

  window.PL = { P, REGIONS, R, setRegion: r => { region = r; }, getRegion: () => region,
    hex, mix, lt, dk, al, RNG, ell, smooth, rrect, area, normals, inset, bbox, resample, trace, xf,
    shadowOn, shadowOff, outlineCol, outline, stitch, plush, safetyEye, buttonEye, button, cheek, thread, begin, cloud };
  // The four approved samples, under their game names.
  window.SPRITES = Object.assign(window.SPRITES || {}, { knight: hero, goblin: enemy, house, 'tree-small': tree });
})();
