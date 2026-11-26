(function () {
  const { P, R, mix, lt, dk, al, RNG, ell, smooth, rrect, inset, bbox, resample, trace, xf, shadowOn, shadowOff, outlineCol, outline, stitch, plush, safetyEye, buttonEye, button, cheek, thread, begin, cloud } = window.PL;
  const WOOD = '#b8875a', WOODL = '#c99a68', STONE = '#bdb6a6', STONED = '#948c7d';

  // corduroy / plank grain lines inside a clip
  function grain(c, x0, y0, x1, y1, horiz, step, rnd) {
    c.save(); c.lineCap = 'round';
    if (horiz) for (let y = y0 + step / 2; y < y1; y += step) {
      const w = (rnd() - 0.5) * 6;
      c.strokeStyle = 'rgba(60,30,20,0.22)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, y); c.quadraticCurveTo((x0 + x1) / 2, y + w, x1, y); c.stroke();
      c.strokeStyle = 'rgba(255,225,190,0.16)'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x0, y + 3); c.quadraticCurveTo((x0 + x1) / 2, y + 3 + w, x1, y + 3); c.stroke();
    } else for (let x = x0 + step / 2; x < x1; x += step) {
      const w = (rnd() - 0.5) * 6;
      c.strokeStyle = 'rgba(60,30,20,0.22)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y0); c.quadraticCurveTo(x + w, (y0 + y1) / 2, x, y1); c.stroke();
      c.strokeStyle = 'rgba(255,225,190,0.16)'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x + 3, y0); c.quadraticCurveTo(x + 3 + w, (y0 + y1) / 2, x + 3, y1); c.stroke();
    }
    c.restore();
  }
  function sat(c, k, l = 0) { // HSL saturation/lightness tweak
    const h = c.replace('#', ''); let [r, g, b] = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let H = 0, S = 0, L = (mx + mn) / 2; const d = mx - mn;
    if (d) { S = d / (1 - Math.abs(2 * L - 1)); H = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; H *= 60; if (H < 0) H += 360; }
    S = Math.min(1, S * k); L = Math.min(0.92, Math.max(0.1, L + l));
    const C = (1 - Math.abs(2 * L - 1)) * S, X = C * (1 - Math.abs((H / 60) % 2 - 1)), m = L - C / 2;
    const [a, bb, cc] = H < 60 ? [C, X, 0] : H < 120 ? [X, C, 0] : H < 180 ? [0, C, X] : H < 240 ? [0, X, C] : H < 300 ? [X, 0, C] : [C, 0, X];
    return '#' + [a, bb, cc].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
  }
  function glow(ctx, x, y, r, col, a) {
    ctx.save(); const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, al(col, a)); g.addColorStop(0.5, al(col, a * 0.4)); g.addColorStop(1, al(col, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  function flame(ctx, x, y, s) { // felt flame, base at (x,y)
    const f = (k) => smooth([[0, 0], [0.5, -0.1], [0.62, -0.5], [0.3, -0.85], [0.18, -1.25], [0, -1.05], [-0.25, -1.4], [-0.5, -0.8], [-0.6, -0.4], [-0.45, -0.08]].map(([a, b]) => [x + a * s * k, y + b * s * k]), 10);
    plush(ctx, f(1), P.rust, { si: 6, dash: [5, 4], slw: 2, thread: P.mustard, ow: 6 });
    plush(ctx, f(0.68).map(([a, b]) => [a, b - 0.02 * s]), P.mustard, { stitch: false, ow: 3, fuzz: false, cast: true });
    plush(ctx, f(0.36).map(([a, b]) => [a + 0.02 * s, b - 0.02 * s]), P.cream, { stitch: false, outline: false, fuzz: false });
  }

  // ---------- chest ----------
  function chest(ctx, size) {
    begin(ctx, size);
    const B = '#8c5a38';
    // body
    plush(ctx, rrect(110, 318, 292, 186, 26), B, { thread: P.mustard, inner(c) { grain(c, 100, 330, 420, 504, true, 34, RNG(3)); } });
    // lid (domed)
    const lid = smooth([[104, 330], [108, 258], [150, 206], [256, 190], [362, 206], [404, 258], [408, 330], [256, 338]], 10);
    plush(ctx, lid, lt(B, 0.06), { thread: P.mustard, lx: 0.3, ly: 0.2, inner(c) { grain(c, 100, 190, 420, 340, true, 34, RNG(4)); } });
    // mustard trim: lid rim band + corner straps
    plush(ctx, smooth([[96, 312], [256, 322], [416, 312], [418, 346], [256, 356], [94, 346]], 8), P.mustard, { si: 6, dash: [5, 4], slw: 2, thread: P.mustardD });
    for (const x of [150, 362]) {
      plush(ctx, rrect(x - 17, 356, 34, 148, 10), P.mustard, { si: 6, dash: [5, 4], slw: 2, thread: P.mustardD });
      ctx.save(); trace(ctx, lid); ctx.clip();
      plush(ctx, rrect(x - 17, 180, 34, 140, 10), P.mustard, { si: 6, dash: [5, 4], slw: 2, thread: P.mustardD, cast: false, ow: 5 });
      ctx.restore();
      button(ctx, x, 380, 8, P.mustardD); button(ctx, x, 476, 8, P.mustardD);
    }
    // lock plate + button lock
    plush(ctx, smooth([[220, 318], [292, 318], [298, 372], [256, 400], [214, 372]], 8), P.mustard, { si: 6, dash: [4, 3], slw: 1.8, thread: P.mustardD });
    button(ctx, 256, 352, 17, P.rust);
    plush(ctx, rrect(250, 366, 12, 18, 5), dk(P.rust, 0.5), { outline: false, stitch: false, fuzz: false });
    ctx.restore();
  }

  // ---------- sign ----------
  function sign(ctx, size) {
    begin(ctx, size);
    // post
    plush(ctx, smooth([[232, 504], [234, 160], [256, 140], [280, 160], [282, 504]], 6), P.brown, { thread: P.mustard, inner(c) { grain(c, 228, 140, 290, 504, false, 14, RNG(5)); } });
    // grass tuft at base
    // arrow board (points right)
    const arrow = smooth([[90, 168], [356, 160], [372, 152], [440, 214], [372, 280], [356, 270], [92, 264], [80, 216]], 6);
    plush(ctx, arrow, WOODL, { thread: P.brownD, inner(c) { grain(c, 70, 160, 450, 280, true, 26, RNG(6)); } });
    // second smaller board pointing left
    const arrow2 = smooth([[400, 316], [168, 322], [152, 314], [96, 364], [152, 414], [168, 406], [398, 410], [410, 362]], 6);
    plush(ctx, arrow2, WOOD, { thread: P.brownD, inner(c) { grain(c, 90, 310, 420, 420, true, 24, RNG(7)); } });
    // nails
    button(ctx, 256, 214, 11, P.silver); button(ctx, 256, 364, 10, P.silver);
    // painted thread marks on boards
    thread(ctx, [[130, 214], [200, 210], [230, 214]], P.cream, 5);
    thread(ctx, [[300, 364], [340, 360], [370, 364]], P.cream, 4.5);
    ctx.restore();
  }

  // ---------- bench ----------
  function bench(ctx, size) {
    begin(ctx, size);
    // back legs / posts
    for (const x of [118, 394]) plush(ctx, rrect(x - 16, 236, 32, 210, 12), P.brownD, { stitch: false, ow: 8 });
    // backrest boards
    plush(ctx, rrect(80, 250, 352, 50, 20), WOOD, { thread: P.brownD, inner(c) { grain(c, 80, 250, 432, 300, true, 16, RNG(8)); } });
    plush(ctx, rrect(92, 310, 328, 34, 16), lt(WOOD, 0.04), { thread: P.brownD, si: 6, dash: [5, 4], slw: 2 });
    // front legs
    for (const x of [132, 380]) plush(ctx, smooth([[x - 22, 380], [x + 22, 380], [x + 24, 498], [x + 28, 504], [x - 28, 504], [x - 24, 498]], 4), P.brown, { thread: P.mustard, si: 6, dash: [5, 4], slw: 2 });
    // seat
    plush(ctx, rrect(60, 360, 392, 54, 22), WOODL, { thread: P.brownD, inner(c) { grain(c, 60, 360, 452, 414, true, 18, RNG(9)); } });
    button(ctx, 118, 274, 9, P.mustard); button(ctx, 394, 274, 9, P.mustard);
    button(ctx, 100, 386, 9, P.mustard); button(ctx, 412, 386, 9, P.mustard);
    ctx.restore();
  }

  // ---------- log ----------
  function log(ctx, size) {
    begin(ctx, size);
    const top = 344, bot = 504, cx = 408, ry = (bot - top) / 2, cy = (top + bot) / 2;
    const body = smooth([[40, top + 18], [70, top + 2], [200, top - 4], [cx, top], [cx, bot], [200, bot + 1], [70, bot - 2], [36, bot - 30], [30, cy]], 10);
    plush(ctx, body, P.brown, { thread: P.mustard, inner(c) { grain(c, 20, top - 6, cx + 10, bot + 4, true, 15, RNG(10)); } });
    // cut end
    plush(ctx, ell(cx, cy, 56, ry, 96), '#d9b27c', { thread: P.brown, si: 9, lx: 0.4, ly: 0.35, inner(c) {
      c.strokeStyle = al(dk('#d9b27c', 0.35), 0.8); c.lineWidth = 3; c.setLineDash([6, 5]);
      for (const k of [0.62, 0.36]) { c.beginPath(); c.ellipse(cx, cy, 56 * k, ry * k, 0, 0, 7); c.stroke(); }
      c.setLineDash([]);
    } });
    button(ctx, cx, cy, 9, P.brown);
    // moss patch + sprout
    plush(ctx, cloud(170, top + 6, 54, 18, 6, 0.3), P.sage, { stitch: false, ow: 5, fuzz: false });
    const leaf = (x, y, r, s, col) => { plush(ctx, xf(smooth([[0, -1], [0.55, -0.2], [0, 1], [-0.55, -0.2]], 10), x, y, r, s), col, { ow: 3.5, stitch: false, fuzz: false }); stitch(ctx, xf([[0, -0.8], [0, 0.8]], x, y, r, s), dk(col, 0.4), { closed: false, lw: 1.8, dash: [4, 3] }); };
    leaf(196, top - 26, 0.6, 22, P.sageL); leaf(168, top - 22, -0.6, 18, P.sageD);
    ctx.restore();
  }

  // ---------- well ----------
  function well(ctx, size) {
    begin(ctx, size);
    // posts
    for (const x of [132, 380]) plush(ctx, rrect(x - 15, 140, 30, 250, 12), P.brown, { stitch: false, ow: 8, inner(c) { grain(c, x - 16, 140, x + 16, 390, false, 10, RNG(x)); } });
    // roof
    const roof = smooth([[82, 196], [170, 120], [256, 74], [342, 120], [430, 196], [418, 214], [342, 166], [256, 126], [170, 166], [94, 214]], 8);
    plush(ctx, roof, P.rust, { si: 9, thread: dk(P.rust, 0.5), inner(c, b) {
      c.strokeStyle = al(dk(P.rust, 0.35), 0.5); c.lineWidth = 3;
      for (const t of [0.33, 0.66]) { c.beginPath(); c.moveTo(256, 80 + t * 40); c.lineTo(86 + t * 30, 204); c.moveTo(256, 80 + t * 40); c.lineTo(426 - t * 30, 204); c.stroke(); }
    } });
    button(ctx, 256, 98, 12, P.mustard);
    // crank bar + rope + bucket
    plush(ctx, rrect(132, 206, 248, 18, 9), P.brownD, { stitch: false, ow: 6 });
    ctx.save(); ctx.strokeStyle = P.creamD; ctx.lineWidth = 5; ctx.setLineDash([6, 3]); ctx.beginPath(); ctx.moveTo(256, 222); ctx.lineTo(256, 268); ctx.stroke(); ctx.restore();
    // water opening + stone base
    const rimY = 330;
    plush(ctx, ell(256, rimY, 168, 46, 96), STONE, { stitch: false });
    plush(ctx, ell(256, rimY + 4, 132, 30, 96), P.blueD, { outline: false, stitch: false, fuzz: false, lx: 0.6, ly: 0.7 });
    // bucket over water
    plush(ctx, smooth([[226, 268], [286, 268], [280, 322], [232, 322]], 4), WOOD, { si: 5, dash: [4, 3], slw: 1.8, thread: P.brownD, ow: 6 });
    plush(ctx, rrect(222, 262, 68, 14, 6), P.silver, { stitch: false, ow: 4, fuzz: false });
    // front stone wall
    const wall = smooth([[88, 332], [90, 470], [140, 498], [256, 506], [372, 498], [422, 470], [424, 332], [380, 360], [256, 376], [132, 360]], 6);
    plush(ctx, wall, STONED, { stitch: false, inner(c) {
      const rnd = RNG(21);
      for (let row = 0; row < 3; row++) {
        const y0 = 360 + row * 46 + (row === 0 ? 0 : 0);
        for (let i = 0; i < 6; i++) {
          const x = 88 + (row % 2) * 28 + i * 60 - 14, yy = y0 + (row === 0 ? 12 : 0) + Math.abs(x + 30 - 256) * -0.0 + 6;
          const st = rrect(x + 2, yy, 54, 40, 14); const col = mix(STONE, P.cream, 0.15 + rnd() * 0.25);
          c.save(); shadowOn(c, 'rgba(50,40,35,0.45)', 6, 2, 4); trace(c, st); c.fillStyle = col; c.fill(); shadowOff(c);
          const g = c.createRadialGradient(x + 18, yy + 10, 2, x + 28, yy + 20, 40); g.addColorStop(0, al(lt(col, 0.4), 0.9)); g.addColorStop(1, al(dk(col, 0.25), 0.8));
          c.fillStyle = g; c.fill(); c.restore();
          stitch(c, inset(st, 6), dk(col, 0.35), { lw: 1.8, dash: [4, 3] });
        }
      }
    } });
    ctx.restore();
  }

  // ---------- shrine ----------
  function shrine(ctx, size) {
    begin(ctx, size);
    // plinth
    plush(ctx, rrect(118, 444, 276, 60, 18), STONED, { thread: dk(STONED, 0.4) });
    // stone body with rounded top
    const body = smooth([[150, 450], [148, 230], [172, 150], [256, 112], [340, 150], [364, 230], [362, 450]], 10);
    plush(ctx, body, STONE, { thread: dk(STONE, 0.38) });
    // niche
    const niche = smooth([[200, 420], [198, 262], [222, 214], [256, 200], [290, 214], [314, 262], [312, 420]], 10);
    plush(ctx, niche, '#4f4250', { outline: false, stitch: false, fuzz: false, lx: 0.7, ly: 0.8 });
    ctx.save(); trace(ctx, niche); ctx.clip(); glow(ctx, 256, 330, 130, '#ffd77a', 0.75); ctx.restore();
    ctx.save(); ctx.lineWidth = 6; ctx.strokeStyle = outlineCol(STONE); trace(ctx, niche); ctx.stroke(); ctx.restore();
    // candle
    plush(ctx, rrect(236, 340, 40, 78, 12), P.cream, { si: 5, dash: [4, 3], slw: 1.8, thread: P.creamD, ow: 6 });
    plush(ctx, smooth([[236, 350], [246, 342], [256, 356], [266, 342], [276, 350], [276, 344], [236, 344]], 6), lt(P.cream, 0.3), { outline: false, stitch: false, fuzz: false });
    glow(ctx, 256, 300, 70, '#ffe08a', 0.7);
    flame(ctx, 256, 340, 52);
    // moss tufts + mustard button "offering"
    plush(ctx, cloud(170, 446, 36, 14, 5, 0.3), P.sage, { stitch: false, ow: 5, fuzz: false });
    plush(ctx, cloud(354, 448, 28, 12, 5, 0.3), P.sageD, { stitch: false, ow: 5, fuzz: false });
    button(ctx, 256, 160, 13, P.mustard);
    ctx.restore();
  }

  // ---------- grave ----------
  function grave(ctx, size) {
    begin(ctx, size);
    const stone = smooth([[128, 494], [126, 250], [150, 158], [256, 116], [362, 158], [386, 250], [384, 494]], 10);
    plush(ctx, stone, STONE, { thread: dk(STONE, 0.38), inner(c) {
      // weathered darker bottom
      const g = c.createLinearGradient(0, 380, 0, 500); g.addColorStop(0, 'rgba(60,70,50,0)'); g.addColorStop(1, 'rgba(60,70,50,0.3)'); c.fillStyle = g; c.fillRect(100, 380, 300, 130);
    } });
    // felt cross appliqué
    const cr = smooth([[240, 196], [272, 196], [272, 250], [318, 250], [318, 282], [272, 282], [272, 390], [240, 390], [240, 282], [194, 282], [194, 250], [240, 250]].map(p => p), 2);
    plush(ctx, cr, '#8d8678', { ow: 5, cast: true, fuzz: false, si: 5, dash: [5, 4], slw: 2, thread: P.cream });
    // grass at the base
    for (const [x, s, col] of [[150, 1, P.sageD], [196, 0.8, P.sage], [330, 0.9, P.sage], [370, 1, P.sageD]]) {
      plush(ctx, smooth([[x - 26 * s, 506], [x - 18 * s, 470], [x - 8 * s, 488], [x, 450], [x + 8 * s, 486], [x + 20 * s, 462], [x + 26 * s, 506]], 6), col, { stitch: false, ow: 4, fuzz: false });
    }
    ctx.restore();
  }

  // ---------- campfire ----------
  function fireTongue(ctx, x, y, w, h, lean) {
    return smooth([[x - w, y], [x - w * 1.05, y - h * 0.35], [x - w * 0.55, y - h * 0.7], [x + lean, y - h], [x + w * 0.35, y - h * 0.62], [x + w * 0.95, y - h * 0.38], [x + w, y]], 10);
  }
  function campfire(ctx, size) {
    begin(ctx, size);
    const st = (x, y, rx, ry, col) => plush(ctx, cloud(x, y, rx, ry, 3, 0.12, 0.2), col, { si: 6, dash: [5, 4], slw: 2, thread: dk(col, 0.4) });
    for (const [x, y] of [[142, 418], [204, 398], [308, 398], [370, 418]]) st(x, y, 36, 26, mix(STONE, STONED, 0.5));
    glow(ctx, 256, 330, 210, '#ffb347', 0.5);
    // flames: three tongues, rust outer / mustard / cream core
    const tongues = [[196, 450, 52, 170, -26], [318, 450, 50, 160, 24], [256, 456, 70, 290, 6]];
    for (const [x, y, w, h, l] of tongues) plush(ctx, fireTongue(ctx, x, y, w, h, l), P.rust, { si: 7, dash: [5, 4], slw: 2, thread: P.mustard, ow: 7 });
    for (const [x, y, w, h, l] of tongues) plush(ctx, fireTongue(ctx, x, y - 6, w * 0.66, h * 0.7, l * 0.7), P.mustard, { stitch: false, ow: 3, fuzz: false });
    plush(ctx, fireTongue(ctx, 256, 446, 32, 130, 4), P.cream, { stitch: false, outline: false, fuzz: false });
    // crossed logs in front
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(256, 452); ctx.rotate(s * 0.3);
      plush(ctx, rrect(-140, -24, 280, 48, 22), s < 0 ? P.brown : lt(P.brown, 0.08), { thread: P.mustard, si: 7, dash: [5, 4], slw: 2, inner(c) { grain(c, -140, -24, 140, 24, true, 12, RNG(30 + s)); } });
      plush(ctx, ell(s * 132, 0, 15, 23, 40), '#d9b27c', { stitch: false, ow: 5, fuzz: false });
      ctx.restore();
    }
    for (const [x, y] of [[104, 474], [176, 484], [256, 486], [336, 484], [408, 474]]) st(x, y, 40, 18, STONE);
    ctx.restore();
  }

  // ---------- pebble ----------
  function pebble(ctx, size) {
    begin(ctx, size);
    plush(ctx, cloud(200, 466, 66, 42, 3, 0.1, 0.1), mix(STONE, STONED, 0.3), { si: 7 });
    plush(ctx, cloud(306, 480, 48, 28, 3, 0.1, -0.1, 1), STONED, { si: 5, dash: [5, 4], slw: 2 });
    plush(ctx, cloud(256, 488, 30, 18, 3, 0.1, 0.2, 2), lt(STONE, 0.1), { si: 4, dash: [4, 3], slw: 1.8 });
    ctx.restore();
  }

  // ---------- exit (stone archway) ----------
  function exit(ctx, size) {
    begin(ctx, size);
    const cx = 256, cy = 236, Ro = 214, Ri = 120, base = 504;
    const cols = [STONE, mix(STONE, STONED, 0.45), lt(STONE, 0.1)];
    const block = (pts, i) => plush(ctx, smooth(pts, 4), cols[i % 3], { si: 8, thread: dk(STONE, 0.42), seed: i + 3 });
    // pillars (stacked blocks)
    let i = 0;
    for (const side of [-1, 1]) {
      for (let y = base; y > cy + 4; y -= 66, i++) {
        const y0 = Math.max(cy, y - 64);
        const x0 = side < 0 ? cx - Ro : cx + Ri, x1 = side < 0 ? cx - Ri : cx + Ro;
        block([[x0 + 4, y0 + 4], [x1 - 4, y0 + 4], [x1 - 2, y - 4], [x0 + 2, y - 4]], i + (side > 0 ? 1 : 0));
      }
    }
    // arch voussoirs
    const N = 7;
    for (let k = 0; k < N; k++) {
      if (k === 3) continue;
      const a0 = Math.PI + k / N * Math.PI + 0.025, a1 = Math.PI + (k + 1) / N * Math.PI - 0.025;
      const pts = [];
      for (let t = 0; t <= 3; t++) { const a = a0 + (a1 - a0) * t / 3; pts.push([cx + Math.cos(a) * Ro, cy + Math.sin(a) * Ro]); }
      for (let t = 3; t >= 0; t--) { const a = a0 + (a1 - a0) * t / 3; pts.push([cx + Math.cos(a) * (Ri + 4), cy + Math.sin(a) * (Ri + 4)]); }
      block(pts, k + 2);
    }
    // keystone
    const a0 = Math.PI * 1.5 - Math.PI / N / 2 - 0.02, a1 = Math.PI * 1.5 + Math.PI / N / 2 + 0.02;
    const kp = [[cx + Math.cos(a0) * (Ro + 18), cy + Math.sin(a0) * (Ro + 18)], [cx + Math.cos(a1) * (Ro + 18), cy + Math.sin(a1) * (Ro + 18)], [cx + Math.cos(a1) * (Ri - 10), cy + Math.sin(a1) * (Ri - 10)], [cx + Math.cos(a0) * (Ri - 10), cy + Math.sin(a0) * (Ri - 10)]];
    plush(ctx, smooth(kp, 4), P.mustard, { si: 8, thread: P.mustardD });
    // up-arrow button
    const by = cy - (Ro + Ri) / 2 - 2;
    button(ctx, cx, by, 30, P.rust);
    ctx.save(); trace(ctx, ell(cx, by, 24, 24, 40)); ctx.fillStyle = P.rust; ctx.fill(); ctx.restore();
    thread(ctx, [[cx, by + 15], [cx, by - 14]], P.cream, 6);
    thread(ctx, [[cx - 13, by - 1], [cx, by - 15], [cx + 13, by - 1]], P.cream, 6);
    ctx.restore();
  }

  // ---------- mushroom ----------
  function mushroom(ctx, size) {
    begin(ctx, size);
    const stem = smooth([[204, 504], [212, 420], [218, 330], [294, 330], [300, 420], [308, 504]], 8);
    plush(ctx, stem, P.cream, { thread: P.creamD });
    // face on the stem
    safetyEye(ctx, 236, 428, 12); safetyEye(ctx, 282, 428, 12);
    cheek(ctx, 222, 452, 10); cheek(ctx, 296, 452, 10);
    thread(ctx, [[250, 450], [259, 457], [268, 450]], '#6b3a32', 4);
    // cap
    const cap = smooth([[84, 352], [100, 270], [160, 196], [256, 168], [352, 196], [412, 270], [428, 352], [380, 368], [256, 360], [132, 368]], 10);
    plush(ctx, cap, P.rust, { si: 11, thread: dk(P.rust, 0.5), lx: 0.32, ly: 0.2 });
    if (R('snow')) plush(ctx, smooth([[118, 262], [170, 200], [256, 174], [342, 200], [394, 262], [360, 270], [330, 250], [300, 268], [256, 246], [212, 266], [180, 250], [150, 272]], 8), R('snow'), { stitch: false, ow: 5, cast: true });
    // cream spots
    for (const [x, y, r] of [[166, 286, 24], [256, 230, 28], [350, 290, 22], [214, 330, 14], [306, 334, 15], [384, 324, 10], [130, 326, 10]]) {
      if (R('snow') && y < 260) continue;
      plush(ctx, ell(x, y, r, r * 0.85, 48), P.cream, { stitch: r > 18, ow: 3.5, fuzz: false, si: 5, dash: [4, 3], slw: 1.6, thread: P.creamD });
    }
    ctx.restore();
  }

  // ---------- flower ----------
  function flower(ctx, size) {
    begin(ctx, size);
    const L = R('leaf'), LD = R('leafD'), F = R('fruit');
    const ctr = F === P.mustard || F === '#e0a050' ? P.rust : P.mustard;
    // leaves
    const leaf = (x, y, r, s, col) => { plush(ctx, xf(smooth([[0, -1], [0.5, -0.2], [0, 1], [-0.5, -0.2]], 10), x, y, r, s), col, { ow: 5, stitch: false, fuzz: false }); stitch(ctx, xf([[0, -0.75], [0, 0.75]], x, y, r, s), dk(col, 0.4), { closed: false, lw: 2, dash: [4, 3] }); };
    leaf(150, 452, -1.0, 62, LD); leaf(362, 452, 1.0, 62, LD);
    // stems
    ctx.save(); ctx.lineCap = 'round';
    for (const [x0, x1, y1] of [[236, 172, 300], [256, 262, 218], [276, 346, 316]]) {
      ctx.strokeStyle = outlineCol(L); ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(x0, 504); ctx.quadraticCurveTo(x0, (504 + y1) / 2, x1, y1); ctx.stroke();
      ctx.strokeStyle = L; ctx.lineWidth = 9; ctx.stroke();
    }
    ctx.restore();
    leaf(208, 470, -0.6, 48, L); leaf(306, 472, 0.6, 46, L);
    const bloom = (x, y, r, col, n) => {
      const pts = []; for (let i = 0; i < 160; i++) { const a = i / 160 * Math.PI * 2; const k = 0.72 + 0.28 * Math.abs(Math.cos(a * n / 2)); pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k]); }
      plush(ctx, pts, col, { si: r * 0.16, dash: [5, 4], slw: 2, thread: dk(col, 0.35) });
      ctx.save(); ctx.strokeStyle = al(dk(col, 0.4), 0.6); ctx.lineWidth = 2.5;
      for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3); ctx.lineTo(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72); ctx.stroke(); }
      ctx.restore();
      button(ctx, x, y, r * 0.3, ctr);
    };
    bloom(170, 300, 66, lt(F, 0.12), 5);
    bloom(346, 314, 60, dk(F, 0.06), 5);
    bloom(262, 214, 78, F, 6);
    ctx.restore();
  }

  // ---------- bush ----------
  function bush(ctx, size) {
    begin(ctx, size);
    const G = R('leaf'), cx = 256, cy = 362;
    const can = cloud(cx, cy, 196, 136, 9, 0.18, 0, 0.35).map(([x, y]) => [x, Math.min(y, 500)]);
    plush(ctx, can, G, { si: 13, ow: 10, lx: 0.3, ly: 0.22, inner(c, b) {
      for (const [x, y, r] of [[186, 330, 80], [330, 326, 76], [256, 410, 92]]) {
        c.save(); shadowOn(c, al(dk(G, 0.6), 0.5), 18, 4, 8); c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = G; c.fill(); shadowOff(c);
        const g = c.createRadialGradient(x - r * 0.4, y - r * 0.45, 2, x, y, r * 1.05);
        g.addColorStop(0, al(lt(G, 0.38), 1)); g.addColorStop(0.55, al(G, 0)); g.addColorStop(1, al(dk(G, 0.3), 0.7));
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.restore();
      }
      const u = c.createLinearGradient(160, 220, 340, 500); u.addColorStop(0, 'rgba(255,248,215,0.16)'); u.addColorStop(0.5, 'rgba(0,0,0,0)'); u.addColorStop(1, 'rgba(30,25,25,0.30)');
      c.fillStyle = u; c.fillRect(b.x, b.y, b.w, b.h);
    } });
    const pil = [[186, 330, 80], [330, 326, 76], [256, 410, 92]];
    pil.forEach(([x, y, r], i) => stitch(ctx, ell(x, y, r - 9, r - 9, 96), dk(G, 0.45), { lw: 3, dash: [8, 6], hide: q => q[1] > 498 || pil.some(([X, Y, Rr], j) => j > i && Math.hypot(q[0] - X, q[1] - Y) < Rr + 3) }));
    if (R('snow')) {
      const sn = smooth([[90, 312], [120, 262], [180, 234], [256, 222], [332, 234], [392, 262], [422, 312], [392, 300], [360, 316], [320, 290], [280, 308], [240, 286], [200, 308], [160, 290], [124, 314]], 8);
      plush(ctx, sn, R('snow'), { stitch: false, ow: 6, lx: 0.3, ly: 0.2 });
    }
    const leaf = (x, y, r, s, col) => { plush(ctx, xf(smooth([[0, -1], [0.55, -0.2], [0, 1], [-0.55, -0.2]], 10), x, y, r, s), col, { ow: 3.5, stitch: false, fuzz: false }); stitch(ctx, xf([[0, -0.8], [0, 0.8]], x, y, r, s), dk(col, 0.4), { closed: false, lw: 1.8, dash: [4, 3] }); };
    leaf(86, 380, -1.1, 24, R('leafL')); leaf(428, 372, 1.1, 24, R('leafD')); leaf(150, 460, -2.3, 20, R('leafD')); leaf(372, 462, 2.3, 20, R('leafD'));
    if (!R('snow')) leaf(290, 236, 0.4, 22, R('leafL'));
    for (const [x, y] of [[196, 340], [318, 330], [252, 404], [150, 408], [362, 412], [272, 300]]) {
      button(ctx, x, y, 14, R('fruit'));
    }
    ctx.restore();
  }

  // ---------- crystal ----------
  function crystal(ctx, size) {
    begin(ctx, size);
    const f = R('fruit'), C = (f === '#c0613f' || f === '#e07a5a') ? '#6fb3d6' : sat(mix(f, '#9fd0e8', 0.25), 1.5, 0.04);
    glow(ctx, 256, 330, 230, lt(C, 0.4), 0.5);
    // base rock
    plush(ctx, cloud(256, 478, 170, 40, 5, 0.12, 0, 0.5), R('rock'), { si: 8, thread: dk(R('rock'), 0.4) });
    const shard = (bx, w, h, lean, col) => {
      const tipx = bx + lean, tipy = 470 - h;
      const pts = [[bx - w, 482], [bx - w * 1.05, 470 - h * 0.62], [tipx, tipy], [bx + w * 1.05, 470 - h * 0.62], [bx + w, 482]];
      const sp = smooth(pts, 6).length ? resample(pts, 3) : pts;
      plush(ctx, sp, col, { si: Math.min(9, w * 0.18), dash: [5, 4], slw: 2, thread: lt(col, 0.55), lx: 0.25, ly: 0.2, inner(c) {
        // facets: right half shaded, top-left face lit, ridge line
        const mx = bx + lean * 0.4;
        c.fillStyle = al(dk(col, 0.35), 0.55); c.beginPath(); c.moveTo(mx, 490); c.lineTo(mx + lean * 0.3, 470 - h * 0.62); c.lineTo(tipx, tipy); c.lineTo(bx + w * 1.2, 470 - h * 0.62); c.lineTo(bx + w * 1.2, 490); c.closePath(); c.fill();
        c.fillStyle = al(lt(col, 0.55), 0.55); c.beginPath(); c.moveTo(bx - w * 1.2, 470 - h * 0.62); c.lineTo(tipx, tipy); c.lineTo(mx + lean * 0.3, 470 - h * 0.62); c.closePath(); c.fill();
        c.strokeStyle = al(lt(col, 0.8), 0.7); c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(bx - w * 0.6, 460); c.lineTo(bx - w * 0.55 + lean * 0.3, 470 - h * 0.55); c.stroke();
      } });
    };
    shard(150, 38, 190, -44, dk(C, 0.08));
    shard(366, 36, 170, 40, dk(C, 0.12));
    shard(300, 40, 250, 22, lt(C, 0.02));
    shard(220, 50, 360, -10, C);
    // sparkles
    ctx.save(); ctx.fillStyle = 'rgba(255,253,240,0.95)';
    for (const [x, y, r] of [[196, 160, 10], [330, 250, 7], [124, 320, 6]]) { ctx.beginPath(); ctx.moveTo(x, y - r * 2); ctx.lineTo(x + r * 0.5, y - r * 0.5); ctx.lineTo(x + r * 2, y); ctx.lineTo(x + r * 0.5, y + r * 0.5); ctx.lineTo(x, y + r * 2); ctx.lineTo(x - r * 0.5, y + r * 0.5); ctx.lineTo(x - r * 2, y); ctx.lineTo(x - r * 0.5, y - r * 0.5); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.restore();
  }

  // ---------- bridge (top-down, centred) ----------
  function bridge(ctx, size) {
    begin(ctx, size);
    const x0 = 36, x1 = 476, cy = 256, hh = 112; // ~1.8:1
    const rnd = RNG(77);
    // planks
    const n = 9, pw = (x1 - x0 - 40) / n;
    for (let i = 0; i < n; i++) {
      const x = x0 + 20 + i * pw, j = (rnd() - 0.5) * 8;
      const col = [WOODL, dk(WOOD, 0.06), lt(WOODL, 0.08)][i % 3];
      plush(ctx, rrect(x + 3, cy - hh + 10 + j, pw - 6, hh * 2 - 20, 10), col, { si: 6, dash: [5, 4], slw: 2, thread: P.brownD, ow: 7, seed: i + 1, inner(c) { grain(c, x + 2, cy - hh, x + pw - 2, cy + hh, false, 14, RNG(i + 50)); } });
      button(ctx, x + pw / 2, cy - hh + 46 + j, 5, P.silver); button(ctx, x + pw / 2, cy + hh - 46 + j, 5, P.silver);
    }
    // side rails
    for (const y of [cy - hh + 14, cy + hh - 14]) plush(ctx, rrect(x0 + 6, y - 16, x1 - x0 - 12, 32, 14), P.brown, { thread: P.mustard, si: 7, dash: [6, 5], slw: 2.2, inner(c) { grain(c, x0, y - 16, x1, y + 16, true, 10, RNG(y)); } });
    // rope wraps + corner posts (seen from above)
    for (const x of [x0 + 24, x1 - 24]) for (const y of [cy - hh + 14, cy + hh - 14]) {
      plush(ctx, ell(x, y, 28, 28, 64), P.brownD, { si: 6, dash: [5, 4], slw: 2, thread: P.mustard });
      ctx.save(); ctx.strokeStyle = al(dk(P.brownD, 0.4), 0.7); ctx.lineWidth = 2.5; for (const k of [0.55, 0.28]) { ctx.beginPath(); ctx.arc(x, y, 28 * k, 0, 7); ctx.stroke(); } ctx.restore();
    }
    ctx.restore();
  }

  window.SPRITES = Object.assign(window.SPRITES || {}, { chest, sign, bench, log, well, shrine, grave, campfire, pebble, exit, mushroom, flower, bush, crystal, bridge });
})();
