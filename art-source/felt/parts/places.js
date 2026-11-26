// FELT & PLUSH — places: buildings, trees, rocks (all region-tinted via R()).
(function () {
  const { P, R, mix, lt, dk, al, RNG, ell, smooth, rrect, inset, bbox, resample, trace, xf, shadowOn, shadowOff, outlineCol, outline, stitch, plush, safetyEye, buttonEye, button, cheek, thread, begin, cloud, normals } = window.PL;

  // ============ shared helpers ============
  const STONE = () => mix(mix(P.creamD, P.silver, 0.45), R('rock'), 0.25); // felt stone for built walls

  // open-polyline normals (pointing "up"/outward for a left-to-right top line)
  function upN(p) {
    const n = p.length;
    return p.map((q, i) => { const a = p[Math.max(i - 4, 0)], b = p[Math.min(i + 4, n - 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; return [ty / l, -tx / l]; });
  }
  // felt snow blanket laid along a top line (left->right). No-op unless the region has snow.
  function snowLine(ctx, line, th, o = {}) {
    const S = R('snow'); if (!S) return;
    const pts = resample(line, 5, false); pts.push(line[line.length - 1]);
    if (pts.length < 4) return;
    const N = upN(pts), n = pts.length, ph = o.ph || 0.7, k = Math.max(2, Math.round(n * 5 / 64));
    const top = pts.map((q, i) => [q[0] + N[i][0] * 5, q[1] + N[i][1] * 5]);
    const bot = [];
    for (let i = n - 1; i >= 0; i--) {
      const s = i / (n - 1), taper = Math.pow(Math.sin(Math.PI * s), 0.45);
      const d = th * taper * (0.62 + 0.5 * Math.pow(Math.abs(Math.sin(s * Math.PI * k + ph)), 1.5));
      bot.push([pts[i][0] - N[i][0] * d, pts[i][1] - N[i][1] * d]);
    }
    plush(ctx, top.concat(bot), S, { ow: o.ow || 6, si: Math.max(5, th * 0.28), thread: '#b7c4d0', dash: [5, 4], slw: 2, stitch: th > 22, lx: 0.3, ly: 0.1, cast: true });
  }
  // snow on the upward-facing part of a closed shape
  function snowTop(ctx, shape, th, o = {}) {
    if (!R('snow')) return;
    const N = normals(shape), thr = o.thr ?? -0.32, n = shape.length;
    const up = shape.map((q, i) => N[i][1] < thr);
    // longest circular run of upward-facing points
    let best = [], start = up.indexOf(false); if (start < 0) start = 0;
    let cur = [];
    for (let j = 1; j <= n; j++) { const i = (start + j) % n; if (up[i]) cur.push(shape[i]); else { if (cur.length > best.length) best = cur; cur = []; } }
    if (cur.length > best.length) best = cur;
    if (best.length < 4) return;
    if (best[0][0] > best[best.length - 1][0]) best.reverse();
    if (o.trim) { const c = Math.floor(best.length * o.trim); best = best.slice(c, best.length - c); }
    snowLine(ctx, best, th, o);
  }

  // felt leaf appliqué (as in the sample tree)
  function leaf(ctx, x, y, r, s, col) {
    const lp = xf(smooth([[0, -1], [0.55, -0.2], [0, 1], [-0.55, -0.2]], 10), x, y, r, s);
    plush(ctx, lp, col, { ow: 3.5, stitch: false, fuzz: false, cast: true });
    stitch(ctx, xf([[0, -0.8], [0, 0.8]], x, y, r, s), dk(col, 0.4), { closed: false, lw: 1.8, dash: [4, 3] });
  }
  function apple(ctx, x, y, r = 15) {
    plush(ctx, ell(x, y, r, r * 0.93, 48), R('fruit'), { stitch: false, ow: 4 });
    plush(ctx, ell(x + r * 0.53, y - r * 0.93, r * 0.47, r * 0.27, 24, -0.5), R('leafD'), { stitch: false, ow: 2.5, fuzz: false, cast: false });
  }
  // corduroy ridges between a left and right edge (arrays top->bottom)
  function corduroy(c, Ledge, Redge, n = 6, twist = 0) {
    for (let i = 1; i < n; i++) {
      const k = i / n;
      const line = Ledge.map((a, j) => { const b = Redge[j], kk = Math.min(0.97, Math.max(0.03, k + twist * Math.sin(j * 1.3 + i))); return [a[0] + (b[0] - a[0]) * kk, a[1] + (b[1] - a[1]) * kk]; });
      const sm = smooth(line, 8, false);
      c.lineCap = 'round';
      trace(c, sm, false); c.strokeStyle = 'rgba(40,20,10,0.28)'; c.lineWidth = 3.5; c.stroke();
      trace(c, sm.map(q => [q[0] + 3, q[1]]), false); c.strokeStyle = 'rgba(255,220,180,0.18)'; c.lineWidth = 2; c.stroke();
    }
  }
  // window with brown frame, glowing pane, cream mullion, optional flower box
  function win(ctx, x, y, w, h, box) {
    plush(ctx, rrect(x, y, w, h, 14), P.brown, { stitch: false, ow: 7 });
    plush(ctx, rrect(x + 8, y + 8, w - 16, h - 16, 9), P.mustard, { outline: false, stitch: false, lx: 0.5, ly: 0.5,
      inner(c) { c.fillStyle = 'rgba(255,244,200,0.55)'; c.beginPath(); c.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.26, 0, 7); c.fill(); } });
    ctx.save(); ctx.strokeStyle = P.cream; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + w / 2, y + 9); ctx.lineTo(x + w / 2, y + h - 9); ctx.moveTo(x + 9, y + h / 2); ctx.lineTo(x + w - 9, y + h / 2); ctx.stroke(); ctx.restore();
    if (box) {
      plush(ctx, rrect(x - 7, y + h - 2, w + 14, 20, 9), box, { si: 4, dash: [4, 3], slw: 1.8 });
      const nb = Math.max(3, Math.round(w / 16));
      for (let i = 0; i < nb; i++) button(ctx, x + 6 + i * (w - 12) / (nb - 1), y + h - 4, 7, i % 2 ? P.mustard : P.rust);
    }
  }
  // arched felt door
  function door(ctx, cx, w, top, col = P.blue, base = 504) {
    const x0 = cx - w / 2, x1 = cx + w / 2;
    const d = smooth([[x0, base], [x0, top + 38], [x0 + w * 0.19, top + 8], [cx, top], [x1 - w * 0.19, top + 8], [x1, top + 38], [x1, base]], 8);
    plush(ctx, d, col, { thread: P.cream, inner(c) { c.strokeStyle = 'rgba(40,50,70,0.25)'; c.lineWidth = 2.5; for (const f of [-0.17, 0.17]) { c.beginPath(); c.moveTo(cx + f * w, top + 6); c.lineTo(cx + f * w, base); c.stroke(); } } });
    button(ctx, x1 - w * 0.16, (top + base) / 2 + 12, 8, P.mustard);
  }
  // chimney with cotton smoke
  function chimney(ctx, x, y, w, h) {
    plush(ctx, rrect(x, y, w, h, 12), P.creamD, { si: 6, dash: [5, 4], slw: 2, inner(c) { c.strokeStyle = al(dk(P.creamD, 0.4), 0.55); c.lineWidth = 2; c.setLineDash([5, 4]); for (let yy = y + 26; yy < y + h; yy += 22) { c.beginPath(); c.moveTo(x, yy); c.lineTo(x + w, yy); c.stroke(); } } });
    const cap = rrect(x - 10, y - 12, w + 20, 24, 11);
    plush(ctx, cap, P.brownD, { stitch: false });
    snowTop(ctx, cap, 14, { thr: -0.5 });
    plush(ctx, cloud(x + w / 2 + 10, y - 40, 26, 18, 5, 0.25), P.cream, { stitch: false, ow: 5 });
    plush(ctx, cloud(x + w / 2 + 42, y - 68, 16, 13, 4, 0.25), P.cream, { stitch: false, ow: 5 });
  }

  // ---- puffy gable roof (the sample house roof, parameterised) ----
  const ROOF0 = [[36, 352], [110, 254], [183, 160], [256, 66], [329, 160], [402, 254], [476, 352], [462, 372], [424, 372], [340, 290], [256, 206], [172, 290], [88, 372], [50, 372]];
  function roofGeom(ax, ay, hw, ey) {
    const sx = hw / 220, sy = (ey - ay) / 286;
    const pts = smooth(ROOF0.map(([x, y]) => [ax + (x - 256) * sx, ay + (y - 66) * sy]), 8);
    // y of the roof's inner (under) edge at x — walls must stay above this
    const yin = x => ay + 140 * sy + Math.min(1, Math.abs(x - ax) / (168 * sx)) * 166 * sy;
    return { pts, sx, sy, yin };
  }
  function gableRoof(ctx, ax, ay, hw, ey, o = {}) {
    const col = R('roof'), g = roofGeom(ax, ay, hw, ey);
    const L = Math.hypot(hw, ey - ay), perp = 140 * g.sy * hw / L, nr = Math.max(2, Math.min(3, Math.round((perp - 16) / 24)));
    plush(ctx, g.pts, col, { si: 11, lx: 0.3, ly: 0.15, thread: dk(col, 0.5),
      inner(c, b) {
        for (const side of [-1, 1]) {
          const ex = ax + side * hw, ux = (ax - ex) / L, uy = (ay - ey) / L;
          const N = [-uy, ux], Nn = N[1] > 0 ? N : [-N[0], -N[1]], ang = Math.atan2(-uy, -ux);
          for (let t = L - 14; t >= 0; t -= 30) for (let r = 0; r < nr; r++) {
            const d = 16 + r * 24, tt = t + (r % 2) * 15;
            const x = ex + ux * tt + Nn[0] * d, y = ey + uy * tt + Nn[1] * d;
            c.save(); c.beginPath(); c.arc(x, y, 15, ang - Math.PI / 2, ang + Math.PI / 2); c.closePath();
            shadowOn(c, al(dk(col, 0.6), 0.5), 5, -ux * 3, -uy * 3); c.fillStyle = lt(col, 0.06 + r * 0.05); c.fill(); shadowOff(c);
            c.setLineDash([3, 3]); c.strokeStyle = al(dk(col, 0.45), 0.7); c.lineWidth = 1.6; c.beginPath(); c.arc(x, y, 10, ang - 1.2, ang + 1.2); c.stroke(); c.restore();
          }
        }
        const gr = c.createLinearGradient(b.x, b.y, b.x + b.w * 0.8, b.y + b.h); gr.addColorStop(0, 'rgba(255,240,220,0.20)'); gr.addColorStop(1, al(dk(col, 0.7), 0.25)); c.fillStyle = gr; c.fillRect(b.x, b.y, b.w, b.h);
      } });
    snowTop(ctx, g.pts, 34 * Math.min(1, g.sy * 1.1), { thr: -0.3 });
    button(ctx, ax, ay + 30 * g.sy, 14 * Math.min(1, (g.sx + 1) / 2), P.mustard);
    return g;
  }
  function gableWall(ctx, x0, x1, g, ax, col, thr) {
    const top = x => g.yin(x) - 8;
    const w = smooth([[x0, 504], [x0 - 1, 470], [x0 - 2, 450], [x0 - 2, top(x0) + 50], [x0, top(x0)], [(x0 + ax) / 2, top((x0 + ax) / 2)], [ax, top(ax)], [(x1 + ax) / 2, top((x1 + ax) / 2)], [x1, top(x1)], [x1 + 2, top(x1) + 50], [x1 + 2, 450], [x1 + 1, 470], [x1, 504], [(x1 + ax) / 2, 505], [(x0 + ax) / 2, 505]], 8);
    plush(ctx, w, col, { thread: thr || dk(col, 0.25), lx: 0.3, ly: 0.35 });
  }
  // hanging felt sign on a bracket (rod from wall x0 out to x1 at y), icon: 'mug' | 'bed'
  function hangSign(ctx, xw, xo, y, icon) {
    const sx = Math.min(xw, xo), ex = Math.max(xw, xo), bx = (xo + (xw - xo) * 0.45);
    plush(ctx, rrect(sx, y - 7, ex - sx, 14, 7), P.brownD, { stitch: false, ow: 6 });
    plush(ctx, ell(xw, y, 11, 11, 32), P.brownD, { stitch: false, ow: 5, fuzz: false });
    const w = Math.abs(xw - xo) * 0.86, h = w * 0.82, cx = bx, top = y + 22;
    ctx.save(); ctx.strokeStyle = P.cream; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - w * 0.3, y + 4); ctx.lineTo(cx - w * 0.3, top + 6); ctx.moveTo(cx + w * 0.3, y + 4); ctx.lineTo(cx + w * 0.3, top + 6); ctx.stroke(); ctx.restore();
    plush(ctx, rrect(cx - w / 2, top, w, h, 12), P.mustard, { si: 6, dash: [5, 4], slw: 2, thread: P.brownD });
    const s = w / 80, ix = cx, iy = top + h / 2 + 2;
    if (icon === 'mug') {
      ctx.save(); ctx.strokeStyle = outlineCol(P.cream); ctx.lineWidth = 10 * s; ctx.beginPath(); ctx.arc(ix + 17 * s, iy + 2 * s, 11 * s, -1.4, 1.4); ctx.stroke();
      ctx.strokeStyle = P.cream; ctx.lineWidth = 5 * s; ctx.stroke(); ctx.restore();
      plush(ctx, rrect(ix - 20 * s, iy - 12 * s, 34 * s, 34 * s, 7 * s), P.cream, { ow: 4, stitch: false, fuzz: false, cast: false });
      plush(ctx, cloud(ix - 3 * s, iy - 15 * s, 22 * s, 9 * s, 5, 0.35), P.thread, { ow: 3.5, stitch: false, fuzz: false, cast: false });
    } else {
      plush(ctx, rrect(ix - 28 * s, iy - 18 * s, 10 * s, 40 * s, 4 * s), P.brownD, { ow: 3.5, stitch: false, fuzz: false, cast: false });
      plush(ctx, rrect(ix - 20 * s, iy - 4 * s, 50 * s, 22 * s, 6 * s), P.blue, { ow: 3.5, stitch: false, fuzz: false, cast: false });
      plush(ctx, ell(ix - 9 * s, iy - 9 * s, 10 * s, 7 * s, 32), P.cream, { ow: 3, stitch: false, fuzz: false, cast: false });
    }
  }

  // ============ BUILDINGS ============
  function house(ctx, size) {
    begin(ctx, size);
    chimney(ctx, 330, 96, 52, 120);
    const g = roofGeom(256, 66, 220, 352);
    gableWall(ctx, 124, 388, g, 256, P.cream, P.creamD);
    plush(ctx, ell(256, 270, 30, 30, 64), P.brown, { stitch: false, ow: 7 });
    plush(ctx, ell(256, 270, 21, 21, 64), P.mustard, { outline: false, stitch: false, lx: 0.5, ly: 0.5 });
    ctx.save(); ctx.strokeStyle = P.cream; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(256, 250); ctx.lineTo(256, 290); ctx.moveTo(236, 270); ctx.lineTo(276, 270); ctx.stroke(); ctx.restore();
    win(ctx, 140, 372, 62, 62, P.sage); win(ctx, 310, 372, 62, 62, P.sage);
    door(ctx, 256, 84, 372);
    gableRoof(ctx, 256, 66, 220, 352);
    ctx.restore();
  }

  function houseSmall(ctx, size) {
    begin(ctx, size);
    // stove-pipe chimney
    plush(ctx, rrect(318, 120, 34, 110, 10), P.brownD, { si: 5, dash: [5, 4], slw: 2, thread: P.mustard });
    plush(ctx, rrect(310, 108, 50, 20, 9), P.brownD, { stitch: false });
    plush(ctx, cloud(345, 80, 22, 16, 5, 0.25), P.cream, { stitch: false, ow: 5 });
    plush(ctx, cloud(372, 52, 14, 11, 4, 0.25), P.cream, { stitch: false, ow: 5 });
    const ax = 256, ay = 64, hw = 168, ey = 350;
    const g = roofGeom(ax, ay, hw, ey);
    gableWall(ctx, 160, 352, g, ax, P.sage, P.sageD);
    // single round-topped window + door
    win(ctx, 176, 384, 58, 58, P.brown);
    door(ctx, 300, 76, 380, P.rust);
    // little heart appliqué in the gable
    const h = smooth([[256, 296], [272, 278], [290, 286], [284, 304], [256, 326], [228, 304], [222, 286], [240, 278]], 8);
    plush(ctx, h, P.rust, { ow: 4.5, si: 5, dash: [4, 3], slw: 1.8, thread: P.cream, fuzz: false });
    gableRoof(ctx, ax, ay, hw, ey);
    ctx.restore();
  }

  // side-gabled roof seen from the front: puffy trapezoid with horizontal scallop courses
  function longRoof(ctx, x0, x1, rx0, rx1, ry, ey, th) {
    const col = R('roof');
    const pts = smooth([[rx0 + 6, ry], [(rx0 + rx1) / 2, ry - 3], [rx1 - 6, ry], [rx1 + 10, ry + 6], [(rx1 + x1) / 2 + 14, (ry + ey) / 2], [x1 + 8, ey - 6], [x1, ey + th], [(x0 + x1) / 2, ey + th + 4], [x0, ey + th], [x0 - 8, ey - 6], [(rx0 + x0) / 2 - 14, (ry + ey) / 2], [rx0 - 10, ry + 6]], 8);
    plush(ctx, pts, col, { si: 11, lx: 0.3, ly: 0.15, thread: dk(col, 0.5), inner(c, b) {
      let row = 0;
      for (let y = ry + 22; y < ey + th - 6; y += 26, row++) {
        const t = Math.min(1, (y - ry) / (ey - ry)), xa = rx0 + (x0 - rx0) * t + 16, xb = rx1 + (x1 - rx1) * t - 16;
        for (let x = xa + (row % 2) * 15; x <= xb; x += 30) {
          c.save(); c.beginPath(); c.arc(x, y, 15, 0, Math.PI); c.closePath();
          shadowOn(c, al(dk(col, 0.6), 0.5), 5, 0, 3); c.fillStyle = lt(col, 0.04 + (row % 3) * 0.04); c.fill(); shadowOff(c);
          c.setLineDash([3, 3]); c.strokeStyle = al(dk(col, 0.45), 0.7); c.lineWidth = 1.6; c.beginPath(); c.arc(x, y, 10, 0.37, Math.PI - 0.37); c.stroke(); c.restore();
        }
      }
      const gr = c.createLinearGradient(b.x, b.y, b.x + b.w * 0.6, b.y + b.h); gr.addColorStop(0, 'rgba(255,240,220,0.22)'); gr.addColorStop(1, al(dk(col, 0.7), 0.25)); c.fillStyle = gr; c.fillRect(b.x, b.y, b.w, b.h);
    } });
    snowTop(ctx, pts, 32, { thr: -0.3 });
    return pts;
  }

  function inn(ctx, size) {
    begin(ctx, size);
    const x0 = 118, x1 = 462, cx = (x0 + x1) / 2;
    chimney(ctx, 384, 62, 50, 100);
    // two-storey cream wall with brown felt timber beams
    plush(ctx, smooth([[x0, 504], [x0 - 2, 330], [x0, 170], [x1, 170], [x1 + 2, 330], [x1, 504], [cx, 505]], 8), P.cream, { thread: P.creamD, lx: 0.3, ly: 0.3 });
    plush(ctx, rrect(x0 - 6, 334, x1 - x0 + 12, 22, 9), P.brown, { si: 5, dash: [5, 4], slw: 2, thread: P.mustard, cast: false, ow: 6 });
    for (const bx of [x0 + 4, x1 - 22]) plush(ctx, rrect(bx, 220, 18, 112, 8), P.brown, { stitch: false, ow: 5, cast: false });
    // upper storey windows
    for (const wx of [x0 + 34, cx - 30, x1 - 94]) win(ctx, wx, 236, 60, 64, null);
    // ground floor
    win(ctx, x0 + 22, 388, 62, 60, P.sage); win(ctx, x1 - 84, 388, 62, 60, P.sage);
    door(ctx, cx, 86, 394, P.blue);
    // striped awning over the door
    const aw = [], ax0 = cx - 74, ax1 = cx + 74, ay0 = 362, ay1 = 396;
    aw.push([ax0 + 10, ay0], [ax1 - 10, ay0]);
    for (let i = 0; i <= 10; i++) { const x = ax1 + 6 - i * (ax1 - ax0 + 12) / 10; aw.push([x, i % 2 ? ay1 + 14 : ay1]); }
    plush(ctx, smooth(aw, 5), P.rust, { si: 5, dash: [5, 4], slw: 2, thread: P.cream, inner(c) {
      c.fillStyle = al(P.cream, 0.95); for (let i = 0; i < 5; i++) { const x = ax0 + 6 + i * 30; c.beginPath(); c.moveTo(x + 4, ay0); c.lineTo(x + 18, ay0); c.lineTo(x + 20, ay1 + 14); c.lineTo(x + 2, ay1 + 14); c.closePath(); c.fill(); }
    } });
    // roof
    longRoof(ctx, x0 - 34, x1 + 34, x0 + 52, x1 - 52, 48, 186, 26);
    for (const bx of [cx - 70, cx, cx + 70]) button(ctx, bx, 62, 12, P.mustard);
    // hanging sign (bed = lodging)
    hangSign(ctx, x0 + 6, 18, 258, 'bed');
    ctx.restore();
  }

  function innSmall(ctx, size) {
    begin(ctx, size);
    const ax = 284, ay = 108, hw = 200, ey = 340;
    chimney(ctx, 352, 140, 46, 100);
    const g = roofGeom(ax, ay, hw, ey);
    gableWall(ctx, 142, 426, g, ax, P.blue, P.blueD);
    // round sign-window in gable
    plush(ctx, ell(ax, 290, 28, 28, 64), P.brown, { stitch: false, ow: 7 });
    plush(ctx, ell(ax, 290, 19, 19, 64), P.mustard, { outline: false, stitch: false, lx: 0.5, ly: 0.5 });
    win(ctx, 166, 384, 66, 60, P.sage);
    door(ctx, 304, 84, 380, P.brown);
    // barrel by the door
    plush(ctx, smooth([[356, 504], [350, 470], [358, 436], [402, 436], [410, 470], [404, 504]], 8), '#b8875a', { stitch: false, ow: 7, inner(c) {
      c.strokeStyle = 'rgba(60,30,20,0.25)'; c.lineWidth = 2.5; for (const x of [370, 380, 390]) { c.beginPath(); c.moveTo(x, 436); c.quadraticCurveTo(x - 2, 470, x, 504); c.stroke(); }
      c.fillStyle = P.mustardD; for (const y of [448, 484]) c.fillRect(340, y, 80, 8);
    } });
    gableRoof(ctx, ax, ay, hw, ey);
    hangSign(ctx, 146, 46, 360, 'mug');
    ctx.restore();
  }

  // ---- round stone tower body with curved felt-block courses ----
  function towerBody(ctx, cx, rad, top, flare, opts = {}) {
    const col = STONE(), sag = rad * 0.14;
    const body = smooth([[cx - rad - flare, 500], [cx - rad - flare * 0.3, 450], [cx - rad, 360], [cx - rad, top + 14], [cx, top + sag], [cx + rad, top + 14], [cx + rad, 360], [cx + rad + flare * 0.3, 450], [cx + rad + flare, 500], [cx, 506]], 10);
    plush(ctx, body, col, { stitch: false, lx: 0.3, ly: 0.3, inner(c, b) {
      const rnd = RNG(opts.seed || 5);
      c.fillStyle = al(dk(col, 0.3), 0.8); c.fillRect(b.x, b.y, b.w, b.h);
      let row = 0;
      for (let y = top + 4; y < 512; y += 34, row++) {
        const n = 7, off = (row % 2) * 0.5;
        for (let j = -1; j < n + 1; j++) {
          const p0 = -Math.PI / 2 + ((j + off) / n) * Math.PI, p1 = -Math.PI / 2 + ((j + 1 + off) / n) * Math.PI;
          const a0 = Math.max(-1.6, p0) + 0.03, a1 = Math.min(1.6, p1) - 0.03; if (a1 <= a0) continue;
          const R0 = rad + flare * Math.max(0, (y - 380) / 120);
          const pts = [];
          for (let k = 0; k <= 6; k++) { const a = a0 + (a1 - a0) * k / 6; pts.push([cx + Math.sin(a) * R0, y + 3 + sag * Math.cos(a)]); }
          for (let k = 6; k >= 0; k--) { const a = a0 + (a1 - a0) * k / 6; pts.push([cx + Math.sin(a) * R0, y + 31 + sag * Math.cos(a)]); }
          c.save(); c.lineJoin = 'round'; trace(c, pts); c.lineWidth = 2; c.strokeStyle = lt(col, 0.02 + rnd() * 0.14);
          shadowOn(c, al(dk(col, 0.7), 0.55), 5, 2, 3); c.fillStyle = c.strokeStyle; c.fill(); c.stroke(); shadowOff(c); c.restore();
          stitch(c, pts.length ? inset(pts, 0).slice(0, 7) : [], al(dk(col, 0.35), 0.6), { closed: false, lw: 1.6, dash: [4, 4] });
        }
      }
      // cylinder shading: light left, shade right
      const gr = c.createLinearGradient(cx - rad, 0, cx + rad, 0);
      gr.addColorStop(0, 'rgba(255,248,230,0.28)'); gr.addColorStop(0.35, 'rgba(255,248,230,0)'); gr.addColorStop(0.7, 'rgba(40,25,30,0)'); gr.addColorStop(1, 'rgba(40,25,30,0.38)');
      c.fillStyle = gr; c.fillRect(b.x, b.y, b.w, b.h);
    } });
    return body;
  }
  function coneRoof(ctx, cx, tip, rw, base, opts = {}) {
    const col = R('roof'), rh = base - tip;
    const pts = smooth([[cx, tip], [cx + rw * 0.16, tip + rh * 0.2], [cx + rw * 0.55, tip + rh * 0.62], [cx + rw, base - 6], [cx + rw * 0.92, base + 18], [cx, base + 34], [cx - rw * 0.92, base + 18], [cx - rw, base - 6], [cx - rw * 0.55, tip + rh * 0.62], [cx - rw * 0.16, tip + rh * 0.2]], 10);
    plush(ctx, pts, col, { si: 10, lx: 0.3, ly: 0.2, thread: dk(col, 0.5), inner(c, b) {
      for (let r = 1; r <= 7; r++) {
        const t = r / 7.2, hw = rw * 0.98 * t, yc = tip + rh * t + 4, sg = 30 * t, n = Math.max(2, Math.round(hw / 13));
        for (let k = 0; k <= n; k++) {
          const ph = -Math.PI / 2 + Math.PI * (k + (r % 2) * 0.5) / (n + 0.5);
          const x = cx + Math.sin(ph) * hw, y = yc + sg * Math.cos(ph), rr = 9 + 7 * t;
          c.save(); c.beginPath(); c.arc(x, y, rr, 0, Math.PI); c.closePath();
          shadowOn(c, al(dk(col, 0.6), 0.5), 5, 0, 3); c.fillStyle = lt(col, 0.04 + (r % 3) * 0.04); c.fill(); shadowOff(c);
          c.setLineDash([3, 3]); c.strokeStyle = al(dk(col, 0.45), 0.7); c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, rr * 0.66, 0.4, Math.PI - 0.4); c.stroke(); c.restore();
        }
      }
      const gr = c.createLinearGradient(cx - rw, 0, cx + rw, 0); gr.addColorStop(0, 'rgba(255,240,220,0.22)'); gr.addColorStop(0.45, 'rgba(0,0,0,0)'); gr.addColorStop(1, al(dk(col, 0.7), 0.35));
      c.fillStyle = gr; c.fillRect(b.x, b.y, b.w, b.h);
    } });
    if (R('snow')) {
      const y = f => tip + rh * f, sn = smooth([[cx, tip - 7], [cx + rw * 0.16 + 6, y(0.2) - 3], [cx + rw * 0.4 + 7, y(0.47)], [cx + rw * 0.6 + 8, y(0.68)],
        [cx + rw * 0.5, y(0.72) + 8], [cx + rw * 0.3, y(0.6)], [cx + rw * 0.12, y(0.7) + 6], [cx - rw * 0.1, y(0.58)], [cx - rw * 0.3, y(0.7) + 4], [cx - rw * 0.48, y(0.6)],
        [cx - rw * 0.6 - 8, y(0.68)], [cx - rw * 0.4 - 7, y(0.47)], [cx - rw * 0.16 - 6, y(0.2) - 3]], 8);
      plush(ctx, sn, R('snow'), { ow: 6, si: 8, thread: '#b7c4d0', dash: [5, 4], slw: 2, lx: 0.3, ly: 0.1 });
    }
    return pts;
  }
  function pennant(ctx, x, y0, y1, col) {
    plush(ctx, rrect(x - 5, y1, 10, y0 - y1, 5), P.brownD, { stitch: false, ow: 5, fuzz: false });
    const f = smooth([[x + 4, y1 + 4], [x + 60, y1 + 12], [x + 120, y1 + 6], [x + 94, y1 + 34], [x + 116, y1 + 60], [x + 58, y1 + 58], [x + 4, y1 + 66]], 8);
    plush(ctx, f, col, { si: 6, dash: [5, 4], slw: 2, thread: P.cream, lx: 0.2, ly: 0.3 });
    button(ctx, x, y1 - 4, 9, P.mustard);
  }

  function tower(ctx, size) {
    begin(ctx, size);
    const cx = 256, rad = 84;
    towerBody(ctx, cx, rad, 184, 16, { seed: 7 });
    // arched slit windows and door
    for (const [wy, wh] of [[226, 66], [330, 56]]) {
      const w = smooth([[cx - 18, wy + wh], [cx - 18, wy + 18], [cx, wy], [cx + 18, wy + 18], [cx + 18, wy + wh]], 8);
      plush(ctx, inset(w, -8), P.brown, { stitch: false, ow: 7 });
      plush(ctx, w, P.mustard, { outline: false, stitch: false, lx: 0.5, ly: 0.4 });
    }
    door(ctx, cx, 76, 416, P.blue);
    // hanging banner on the wall (left side)
    coneRoof(ctx, cx, 34, 128, 168);
    pennant(ctx, cx, 50, 0, P.mustard);
    ctx.restore();
  }

  function towerSmall(ctx, size) {
    begin(ctx, size);
    const cx = 256, rad = 104;
    towerBody(ctx, cx, rad, 262, 16, { seed: 11 });
    const w = smooth([[cx - 18, 340], [cx - 18, 318], [cx, 300], [cx + 18, 318], [cx + 18, 340]], 8);
    plush(ctx, inset(w, -8), P.brown, { stitch: false, ow: 7 });
    plush(ctx, w, P.mustard, { outline: false, stitch: false, lx: 0.5, ly: 0.4 });
    door(ctx, cx + 4, 80, 404, P.blue);
    coneRoof(ctx, cx, 92, 150, 248);
    pennant(ctx, cx, 108, 46, P.mustard);
    ctx.restore();
  }

  // ---- ruins ----
  function ivy(ctx, path, seed, n) {
    const rnd = RNG(seed);
    thread(ctx, path, R('leafD'), 5);
    const pts = resample(smooth(path, 10, false), 30, false);
    pts.slice(0, n || pts.length).forEach(([x, y], i) => leaf(ctx, x + (rnd() - 0.5) * 8, y + (rnd() - 0.5) * 8, rnd() * 6.28, 19 + rnd() * 6, i % 2 ? R('leaf') : R('leafL')));
  }
  function stoneSeams(c, col, segs) { c.strokeStyle = al(dk(col, 0.45), 0.8); c.lineWidth = 3; c.setLineDash([7, 5]); c.lineCap = 'round'; for (const s of segs) { trace(c, s, false); c.stroke(); } c.setLineDash([]); }

  function ruins(ctx, size) {
    begin(ctx, size);
    const col = mix(R('rock'), R('rockD'), 0.12), cx = 236, cy = 318, ro = 176, ri = 88;
    // low broken wall (back right)
    const lw = smooth([[388, 504], [388, 420], [410, 408], [426, 424], [448, 398], [470, 410], [492, 432], [494, 504]], 6);
    plush(ctx, lw, mix(col, R('rockD'), 0.25), { inner(c) { stoneSeams(c, col, [[[388, 456], [494, 456]], [[430, 420], [430, 456]], [[460, 456], [460, 504]], [[414, 456], [414, 504]]]); } });
    snowTop(ctx, lw, 16, { thr: -0.5 });
    // right broken pillar
    const rp = smooth([[cx + ri, 504], [cx + ri, 360], [cx + ri + 14, 330], [cx + ri + 30, 346], [cx + ri + 44, 318], [cx + ro, 340], [cx + ro + 2, 504]], 6);
    plush(ctx, rp, col, { inner(c) { const xa = cx + ri, xb = cx + ro; stoneSeams(c, col, [[[xa, 400], [xb, 400]], [[xa, 452], [xb, 452]], [[(xa + xb) / 2, 400], [(xa + xb) / 2, 452]], [[(xa + xb) / 2 - 12, 452], [(xa + xb) / 2 - 12, 504]], [[(xa + xb) / 2 + 6, 352], [(xa + xb) / 2 + 6, 400]]]); } });
    snowTop(ctx, rp, 16, { thr: -0.5 });
    // left pillar + broken arch as one piece
    const a0 = Math.PI, a1 = Math.PI * 1.7, arch = [[cx - ro, 504]];
    for (let k = 0; k <= 40; k++) { const a = a0 + (a1 - a0) * k / 40; arch.push([cx + Math.cos(a) * ro, cy + Math.sin(a) * ro]); }
    const ba = a1;
    arch.push([cx + Math.cos(ba + 0.05) * (ro - 24), cy + Math.sin(ba + 0.05) * (ro - 24) + 10], [cx + Math.cos(ba - 0.06) * (ro - 46), cy + Math.sin(ba - 0.06) * (ro - 46) + 2], [cx + Math.cos(ba + 0.04) * (ri + 4), cy + Math.sin(ba + 0.04) * (ri + 4) + 8]);
    for (let k = 0; k <= 30; k++) { const a = (ba - 0.04) - ((ba - 0.04) - a0) * k / 30; arch.push([cx + Math.cos(a) * ri, cy + Math.sin(a) * ri]); }
    arch.push([cx - ri, 504]);
    plush(ctx, arch, col, { inner(c) {
      const segs = [];
      for (let k = 1; k < 7; k++) { const a = a0 + (a1 - a0) * k / 7; segs.push([[cx + Math.cos(a) * ri, cy + Math.sin(a) * ri], [cx + Math.cos(a) * ro, cy + Math.sin(a) * ro]]); }
      for (const y of [380, 440]) segs.push([[cx - ro, y], [cx - ri, y]]);
      segs.push([[cx - ro, cy], [cx - ri, cy]], [[cx - 132, 380], [cx - 132, 440]], [[cx - 120, 440], [cx - 120, 504]], [[cx - 140, cy], [cx - 140, 380]]);
      stoneSeams(c, col, segs);
    } });
    snowTop(ctx, arch, 26, { thr: -0.3, trim: 0.03 });
    // fallen blocks
    const fb = xf(rrect(-34, -24, 68, 48, 12), 300, 482, 0.18);
    plush(ctx, fb, mix(col, R('rockD'), 0.2), { si: 6, dash: [5, 4], slw: 2 });
    plush(ctx, xf(rrect(-22, -16, 44, 32, 10), 254, 490, -0.3), col, { si: 5, dash: [4, 3], slw: 1.8 });
    // ivy
    ivy(ctx, [[cx - ro + 6, 330], [cx - 150, 250], [cx - 110, 190], [cx - 50, 160], [cx + 10, 158]], 3);
    ivy(ctx, [[cx - ro + 10, 270], [cx - ro + 2, 330], [cx - ro + 14, 390], [cx - ro + 4, 450]], 9);
    ivy(ctx, [[cx + ro - 8, 352], [cx + ro + 18, 400], [cx + ro + 34, 430], [cx + ro + 70, 440]], 13);
    ctx.restore();
  }

  function ruinsSmall(ctx, size) {
    begin(ctx, size);
    const col = mix(R('rock'), R('rockD'), 0.12), cx = 236;
    // fallen chunk (right)
    const fc = xf(rrect(-50, -32, 100, 64, 16), 372, 470, 0.22);
    plush(ctx, fc, mix(col, R('rockD'), 0.2), { si: 7, inner(c) { stoneSeams(c, col, [[[360, 445], [350, 500]]]); } });
    snowTop(ctx, fc, 14, { thr: -0.5 });
    // plinth
    plush(ctx, rrect(cx - 108, 452, 216, 52, 14), mix(col, R('rockD'), 0.15), { si: 7 });
    // broken pillar
    const pl = smooth([[cx - 80, 458], [cx - 78, 250], [cx - 66, 196], [cx - 32, 212], [cx - 8, 170], [cx + 20, 204], [cx + 46, 186], [cx + 80, 232], [cx + 80, 458]], 6);
    plush(ctx, pl, col, { inner(c, b) {
      // fluting + block seams
      c.lineCap = 'round';
      for (const x of [-48, -20, 8, 36, 60]) { c.strokeStyle = 'rgba(40,25,30,0.18)'; c.lineWidth = 6; c.beginPath(); c.moveTo(cx + x, 200); c.lineTo(cx + x, 460); c.stroke(); c.strokeStyle = 'rgba(255,248,230,0.22)'; c.lineWidth = 3; c.beginPath(); c.moveTo(cx + x - 5, 200); c.lineTo(cx + x - 5, 460); c.stroke(); }
      stoneSeams(c, col, [[[cx - 70, 300], [cx + 70, 300]], [[cx - 70, 384], [cx + 70, 384]]]);
      const gr = c.createLinearGradient(cx - 66, 0, cx + 66, 0); gr.addColorStop(0, 'rgba(255,248,230,0.2)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(40,25,30,0.3)'); c.fillStyle = gr; c.fillRect(b.x, b.y, b.w, b.h);
    } });
    snowTop(ctx, pl, 20, { thr: -0.3 });
    ivy(ctx, [[cx - 60, 450], [cx - 30, 400], [cx + 40, 350], [cx + 50, 290], [cx + 20, 240]], 21);
    ivy(ctx, [[cx - 92, 470], [cx - 120, 488], [cx - 150, 500]], 22);
    ctx.restore();
  }

  // ============ NATURE ============
  function canopy(ctx, can, G, pil, o = {}) {
    plush(ctx, can, G, { si: 14, ow: 10, lx: 0.3, ly: 0.22, inner(c, b) {
      for (const [x, y, r] of pil) {
        c.save(); shadowOn(c, al(dk(G, 0.6), 0.45), 18, 4, 8); c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = G; c.fill(); shadowOff(c);
        const g = c.createRadialGradient(x - r * 0.4, y - r * 0.45, 2, x, y, r * 1.05);
        g.addColorStop(0, al(lt(G, 0.38), 1)); g.addColorStop(0.55, al(G, 0.0)); g.addColorStop(1, al(dk(G, 0.3), 0.7));
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.restore();
      }
      const u = c.createLinearGradient(b.x + b.w * 0.15, b.y, b.x + b.w * 0.75, b.y + b.h);
      u.addColorStop(0, 'rgba(255,248,215,0.16)'); u.addColorStop(0.5, 'rgba(0,0,0,0)'); u.addColorStop(1, al(dk(G, 0.75), 0.32));
      c.fillStyle = u; c.fillRect(b.x, b.y, b.w, b.h);
    } });
    pil.forEach(([x, y, r], i) => stitch(ctx, ell(x, y, r - 9, r - 9, 96), dk(G, 0.45), { lw: 3, dash: [8, 6], hide: q => pil.some(([X, Y, RR], j) => j > i && Math.hypot(q[0] - X, q[1] - Y) < RR + 3) }));
  }

  function treeSmall(ctx, size) {
    begin(ctx, size);
    const trunk = smooth([[228, 330], [284, 330], [292, 440], [336, 504], [256, 498], [176, 504], [220, 440]], 10);
    plush(ctx, trunk, R('bark'), { thread: P.mustard, inner(c) {
      for (let i = -6; i <= 6; i++) { const xt = 256 + i * 6, xb = 256 + i * 14;
        c.strokeStyle = 'rgba(40,20,10,0.28)'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(xt, 320); c.quadraticCurveTo(xt + i, 450, xb, 506); c.stroke();
        c.strokeStyle = 'rgba(255,220,180,0.18)'; c.lineWidth = 2; c.beginPath(); c.moveTo(xt + 3, 320); c.quadraticCurveTo(xt + 3 + i, 450, xb + 5, 506); c.stroke(); }
    } });
    const G = R('leaf'), can = cloud(256, 214, 190, 172, 11, 0.16, 0, 0.3);
    canopy(ctx, can, G, [[196, 170, 78], [318, 168, 74], [256, 268, 92]]);
    snowTop(ctx, can, 40, { thr: -0.45 });
    leaf(ctx, 118, 238, -0.9, 22, R('leafL')); leaf(ctx, 394, 236, 0.9, 22, R('leafD'));
    if (!R('snow')) leaf(ctx, 300, 76, 0.4, 20, R('leafL'));
    leaf(ctx, 172, 340, -2.4, 18, R('leafD')); leaf(ctx, 358, 330, 2.3, 18, R('leafD'));
    for (const [x, y] of [[206, 220], [330, 214], [268, 318], [150, 170], [380, 296], [300, 140]]) apple(ctx, x, y);
    ctx.restore();
  }

  function treeLarge(ctx, size) {
    begin(ctx, size);
    const L = [[218, 330], [214, 400], [200, 456], [150, 490], [120, 504]], Rr = [[294, 330], [298, 400], [312, 456], [362, 490], [392, 504]];
    const trunk = smooth([...L, [200, 500], [256, 494], [312, 500], ...Rr.slice().reverse()], 10);
    plush(ctx, trunk, R('bark'), { thread: P.mustard, inner(c) { corduroy(c, L, Rr, 9); } });
    const G = R('leaf'), can = cloud(256, 210, 244, 168, 13, 0.14, 0, 0.2);
    canopy(ctx, can, G, [[160, 196, 84], [256, 140, 88], [352, 192, 84], [196, 284, 92], [318, 282, 94]]);
    snowTop(ctx, can, 42, { thr: -0.45 });
    leaf(ctx, 40, 230, -1.2, 22, R('leafL')); leaf(ctx, 472, 222, 1.1, 22, R('leafD'));
    leaf(ctx, 112, 330, -2.4, 18, R('leafD')); leaf(ctx, 404, 334, 2.3, 18, R('leafD'));
    if (!R('snow')) { leaf(ctx, 196, 70, -0.4, 20, R('leafL')); leaf(ctx, 330, 68, 0.5, 20, R('leafL')); }
    for (const [x, y] of [[150, 210], [244, 170], [360, 156], [420, 250], [214, 300], [320, 300], [96, 270], [280, 236]]) apple(ctx, x, y, 16);
    ctx.restore();
  }

  function pineTier(apex, base, hw, cx = 256) {
    const pts = [[cx, apex], [cx + hw * 0.3, apex + (base - apex) * 0.3], [cx + hw * 0.78, base - 22], [cx + hw, base + 4]];
    const nb = 5;
    for (let i = 1; i < nb; i++) { const x = cx + hw - (2 * hw) * i / nb; pts.push([x + hw / nb * 0.0, base + 18], [x - hw / nb * 0.5, base + 6]); }
    pts.pop(); pts.push([cx - hw, base + 4], [cx - hw * 0.78, base - 22], [cx - hw * 0.3, apex + (base - apex) * 0.3]);
    return smooth(pts, 8);
  }
  function treeConifer(ctx, size) {
    begin(ctx, size);
    const tr = smooth([[234, 420], [278, 420], [284, 480], [300, 504], [212, 504], [228, 480]], 8);
    plush(ctx, tr, R('bark'), { thread: P.mustard, inner(c) { corduroy(c, [[234, 420], [228, 504]], [[278, 420], [284, 504]], 4); } });
    const G = mix(R('leaf'), R('leafD'), 0.45);
    const tiers = [[236, 430, 196], [128, 322, 158], [22, 214, 112]];
    tiers.forEach(([a, b, hw], i) => {
      const t = pineTier(a, b, hw);
      plush(ctx, t, lt(G, i * 0.05), { si: 12, lx: 0.28, ly: 0.3, thread: dk(G, 0.5), inner(c, bb) {
        // needle chevrons
        c.strokeStyle = al(dk(G, 0.45), 0.55); c.lineWidth = 2.4; c.setLineDash([5, 4]); c.lineCap = 'round';
        for (let k = 1; k <= 2; k++) { const y = a + (b - a) * (0.35 + k * 0.25), w = hw * (0.25 + k * 0.25); c.beginPath(); c.moveTo(256 - w, y + 18); c.lineTo(256, y - 4); c.lineTo(256 + w, y + 18); c.stroke(); }
        c.setLineDash([]);
        const gr = c.createLinearGradient(256 - hw, 0, 256 + hw, 0); gr.addColorStop(0, 'rgba(255,248,215,0.16)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, al(dk(G, 0.75), 0.35));
        c.fillStyle = gr; c.fillRect(bb.x, bb.y, bb.w, bb.h);
      } });
      snowTop(ctx, t, 30 - i * 3, { thr: -0.3 });
      if (!R('snow')) { // a few felt pine-cone / berry buttons
        const pos = [[[160, 404], [348, 398]], [[200, 300], [324, 288]], [[230, 190]]][i];
        for (const [x, y] of pos) button(ctx, x, y, 9, R('fruit'));
      }
    });
    button(ctx, 256, 24, 13, P.mustard);
    ctx.restore();
  }

  function treeCrooked(ctx, size) {
    begin(ctx, size);
    // gnarled, leaning trunk with a side branch (edges top -> bottom)
    const L = [[280, 214], [262, 262], [236, 312], [222, 360], [238, 412], [226, 460], [176, 504]];
    const Rr = [[328, 226], [310, 272], [284, 320], [268, 364], [284, 414], [290, 462], [340, 504]];
    const trunk = smooth([...L, [230, 498], [262, 492], [296, 498], ...Rr.slice().reverse()], 10);
    const br = smooth([[238, 330], [196, 300], [150, 276], [110, 262], [104, 282], [146, 298], [190, 330], [232, 362]], 8);
    const bark = R('bark');
    outline(ctx, br, bark); outline(ctx, trunk, bark);
    plush(ctx, br, bark, { ow: 4, stitch: false, cast: false, inner(c) { corduroy(c, [[110, 262], [150, 276], [196, 300], [238, 330]], [[104, 282], [146, 298], [190, 330], [232, 362]], 3); } });
    plush(ctx, trunk, bark, { ow: 4, cast: false, thread: P.mustard, inner(c) {
      corduroy(c, L, Rr, 6, 0.08);
      // knot hole
      c.save(); shadowOn(c, 'rgba(0,0,0,0.4)', 6, 2, 3); c.fillStyle = dk(bark, 0.55); c.beginPath(); c.ellipse(258, 408, 14, 20, 0.2, 0, 7); c.fill(); shadowOff(c);
      c.strokeStyle = lt(bark, 0.25); c.lineWidth = 4; c.beginPath(); c.ellipse(258, 408, 18, 24, 0.2, 0, 7); c.stroke(); c.restore();
    } });
    // patchy canopy clumps
    const G = R('leaf');
    const clumps = [[108, 228, 92, 66, 9, 1.1], [410, 236, 84, 62, 9, 2.0], [292, 150, 150, 104, 11, 0.4]];
    for (const [x, y, rx, ry, n, ph] of clumps) {
      const can = cloud(x, y, rx, ry, n, 0.2, 0, ph);
      canopy(ctx, can, G, rx > 120 ? [[x - 60, y - 10, 62], [x + 54, y - 18, 60], [x, y + 36, 64]] : [[x - 24, y - 8, rx * 0.6], [x + 26, y + 14, rx * 0.6]]);
      snowTop(ctx, can, rx > 120 ? 36 : 26, { thr: -0.45 });
    }
    // a twig poking out of the big clump + leaves
    leaf(ctx, 30, 214, -1.2, 18, R('leafL')); leaf(ctx, 486, 236, 1.2, 18, R('leafD'));
    leaf(ctx, 360, 270, 2.3, 18, R('leafD')); leaf(ctx, 140, 290, -2.5, 16, R('leafD'));
    for (const [x, y] of [[250, 140], [350, 186], [96, 236], [420, 228]]) apple(ctx, x, y, 14);
    ctx.restore();
  }

  // lumpy rock shape sitting on the base line
  function rockShape(cx, rx, ry, seed, base = 504, flat = 0.0) {
    const rnd = RNG(seed), pts = [], n = 9, cy = base - ry;
    for (let i = 0; i < n; i++) {
      const a = Math.PI + i / n * Math.PI * 2, k = 1 + (rnd() - 0.5) * 0.26;
      let x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k * (Math.sin(a) < 0 ? 1 - flat : 1);
      y = Math.min(y, base); pts.push([x, y]);
    }
    return smooth(pts, 12).map(([x, y]) => [x, Math.min(y, base)]);
  }
  function rock(ctx, shape, col, o = {}) {
    plush(ctx, shape, col, { thread: dk(col, 0.4), lx: 0.3, ly: 0.22, ...o, inner(c, b) {
      // a couple of stitched cracks
      const rnd = RNG(o.seed || 3);
      c.strokeStyle = al(dk(col, 0.45), 0.6); c.lineWidth = 2.4; c.setLineDash([5, 4]); c.lineCap = 'round';
      for (let k = 0; k < (o.cracks ?? 1); k++) { const x = b.x + b.w * (0.45 + rnd() * 0.3), y = b.y + b.h * (0.3 + rnd() * 0.2); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 10, y + b.h * 0.15); c.lineTo(x + 2, y + b.h * 0.3); c.stroke(); }
      c.setLineDash([]);
    } });
    snowTop(ctx, shape, o.snow || 26, { thr: -0.4 });
  }

  function rockSmall(ctx, size) {
    begin(ctx, size);
    const A = R('rock'), D = mix(R('rock'), R('rockD'), 0.55);
    rock(ctx, rockShape(196, 120, 96, 4), A, { seed: 4, moss: true, snow: 28 });
    rock(ctx, rockShape(350, 104, 74, 9), D, { seed: 9, snow: 22 });
    rock(ctx, rockShape(270, 70, 44, 12), lt(A, 0.08), { seed: 12, cracks: 0, snow: 16 });
    ctx.restore();
  }

  function rockLarge(ctx, size) {
    begin(ctx, size);
    const A = R('rock'), D = mix(R('rock'), R('rockD'), 0.55);
    rock(ctx, rockShape(262, 172, 156, 21), A, { seed: 21, cracks: 2, moss: true, snow: 40 });
    rock(ctx, rockShape(96, 86, 76, 23), D, { seed: 23, snow: 24 });
    rock(ctx, rockShape(420, 84, 64, 25), D, { seed: 25, snow: 22 });
    rock(ctx, rockShape(330, 60, 40, 27), lt(A, 0.08), { seed: 27, cracks: 0, snow: 14 });
    ctx.restore();
  }

  function slab(cx, y, w, h, seed, tilt = 0) {
    const rnd = RNG(seed), top = [], botm = [], n = 7;
    for (let i = 0; i <= n; i++) { const e = Math.sin(Math.PI * i / n); top.push([cx - w / 2 + w * i / n, y + (1 - e) * h * 0.22 + (rnd() - 0.5) * 16]); }
    for (let i = n; i >= 0; i--) { const e = Math.sin(Math.PI * i / n); botm.push([cx - w / 2 + w * i / n + (rnd() - 0.5) * 8, y + h - (1 - e) * h * 0.12 + (rnd() - 0.5) * 6]); }
    const pts = [...top, [cx + w / 2 + 12 + rnd() * 8, y + h * 0.5], ...botm, [cx - w / 2 - 12 - rnd() * 8, y + h * 0.55]];
    return xf(smooth(pts, 8).map(([x, yy]) => [x - cx, yy - y - h]), cx, y + h, tilt);
  }
  function rockLayered(ctx, size) {
    begin(ctx, size);
    const A = R('rock'), D = mix(R('rock'), R('rockD'), 0.6);
    const L = [[256, 418, 476, 86, D, 0], [230, 344, 390, 90, A, -0.03], [286, 272, 290, 84, D, 0.04], [226, 214, 170, 70, A, -0.06]];
    L.forEach(([cx, y, w, h, col, tl], i) => {
      const s = slab(cx, y, w, h, 31 + i * 7, tl);
      plush(ctx, s, col, { thread: dk(col, 0.42), si: 10, lx: 0.25, ly: 0.2, inner(c, b) {
        c.strokeStyle = al(dk(col, 0.45), 0.55); c.lineWidth = 2.4; c.setLineDash([7, 5]); c.lineCap = 'round';
        c.beginPath(); c.moveTo(b.x + 30, y + h * 0.58); c.quadraticCurveTo(cx, y + h * 0.5 + 8, b.x + b.w - 40, y + h * 0.6); c.stroke(); c.setLineDash([]);
      } });
      snowTop(ctx, s, 20, { thr: -0.6 });
    });
    ctx.restore();
  }

  window.SPRITES = Object.assign(window.SPRITES || {}, {
    house, 'house-small': houseSmall, inn, 'inn-small': innSmall, tower, 'tower-small': towerSmall, ruins, 'ruins-small': ruinsSmall,
    'tree-small': treeSmall, 'tree-large': treeLarge, 'tree-conifer-large': treeConifer, 'tree-crooked-large': treeCrooked,
    'rock-small': rockSmall, 'rock-large': rockLarge, 'rock-layered-large': rockLayered
  });
})();
