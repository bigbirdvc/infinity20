(function () {
  const { P, R, mix, lt, dk, al, RNG, ell, smooth, rrect, inset, bbox, resample, trace, xf, shadowOn, shadowOff, outlineCol, outline, stitch, plush, safetyEye, buttonEye, button, cheek, thread, begin, cloud } = window.PL;

  const small = { stitch: false, ow: 4, cast: false, fuzz: false };
  // monster eye: cream felt eye-white + glossy safety eye
  function mEye(ctx, x, y, rw, rh, er, dx = 4, dy = 5) {
    plush(ctx, ell(x, y, rw, rh, 64), P.cream, { ow: 5, si: 5, dash: [4, 3], slw: 1.8, fuzz: false });
    safetyEye(ctx, x + dx, y + dy, er);
  }
  function brow(ctx, pts, col) { plush(ctx, smooth(pts, 6), col, small); }
  function fang(ctx, pts) { plush(ctx, smooth(pts, 6), P.cream, { stitch: false, ow: 3, cast: false, fuzz: false }); }
  // corduroy ridges (dark + light pairs) clipped to the current shape
  function cord(c, x0, x1, y0, y1, step, fan = 0) {
    for (let x = x0; x <= x1; x += step) {
      const xb = 256 + (x - 256) * (1 + fan);
      c.strokeStyle = 'rgba(40,20,10,0.30)'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(x, y0); c.quadraticCurveTo(x + (x - 256) * 0.05, (y0 + y1) / 2, xb, y1); c.stroke();
      c.strokeStyle = 'rgba(255,220,180,0.18)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 3, y0); c.quadraticCurveTo(x + 3 + (x - 256) * 0.05, (y0 + y1) / 2, xb + 4, y1); c.stroke();
    }
  }

  // ---------- ORC ----------
  const ORC = '#4c7448', ORCD = dk(ORC, 0.3);
  function orc(ctx, size) {
    begin(ctx, size);
    // boots
    plush(ctx, smooth([[170, 462], [236, 456], [252, 484], [244, 504], [168, 504], [156, 486]]), P.brownD);
    plush(ctx, smooth([[276, 456], [342, 462], [356, 486], [344, 504], [268, 504], [260, 484]]), P.brownD);
    // bulky torso
    const torso = smooth([[160, 292], [256, 280], [352, 292], [384, 360], [366, 448], [256, 472], [146, 448], [128, 360]]);
    plush(ctx, torso, ORC, { lx: 0.3, ly: 0.2, inner(c) { // pec / belly seam
      c.strokeStyle = al(dk(ORC, 0.4), 0.45); c.lineWidth = 3; c.beginPath(); c.moveTo(256, 312); c.quadraticCurveTo(256, 350, 256, 380); c.stroke();
    } });
    // leather kilt with pinked hem
    const kilt = [[150, 412], [256, 424], [362, 412], [370, 448]];
    for (let i = 0; i <= 8; i++) { const x = 370 - i * (220 / 8); kilt.push([x, i % 2 ? 488 : 470]); }
    kilt.push([142, 448]);
    plush(ctx, smooth(kilt, 6), P.brown, { thread: P.mustard, si: 8 });
    plush(ctx, smooth([[146, 404], [256, 416], [366, 404], [368, 428], [256, 440], [144, 428]], 10), P.rustD, { si: 5, dash: [5, 4], slw: 2, thread: P.cream });
    button(ctx, 256, 426, 13, P.mustard);
    // leather shoulder strap (viewer-right shoulder to left hip)
    plush(ctx, smooth([[318, 288], [352, 300], [212, 420], [180, 408]], 4), P.rust, { si: 5, dash: [5, 4], slw: 2, thread: P.cream, ow: 6 });
    button(ctx, 300, 330, 12, P.silver);
    // club (raised in viewer-left hand)
    ctx.save(); ctx.translate(118, 392); ctx.rotate(-0.42);
    plush(ctx, smooth([[-13, 50], [-15, -40], [-34, -110], [-44, -180], [-26, -230], [16, -236], [42, -200], [34, -120], [15, -40], [13, 50]], 10), '#b07a4c', {
      thread: P.cream, inner(c) {
        c.lineWidth = 3; for (let x = -44; x < 44; x += 11) { c.strokeStyle = 'rgba(60,30,20,0.2)'; c.beginPath(); c.moveTo(x * 0.3, 50); c.quadraticCurveTo(x * 0.6, -100, x * 0.95, -240); c.stroke(); }
      } });
    // knots
    plush(ctx, ell(-20, -170, 9, 7, 32), '#8a5a36', { stitch: false, ow: 3, fuzz: false, cast: false });
    plush(ctx, ell(18, -205, 8, 7, 32), '#8a5a36', { stitch: false, ow: 3, fuzz: false, cast: false });
    button(ctx, 22, -150, 8, P.silver); button(ctx, -12, -210, 8, P.silver);
    ctx.restore();
    // far arm raised to the club
    plush(ctx, smooth([[176, 308], [196, 342], [148, 412], [112, 396], [140, 330]], 10), ORC, { stitch: false });
    plush(ctx, ell(118, 400, 30, 27, 64), ORC, { stitch: false, ow: 7 });
    // near arm hanging, big fist
    plush(ctx, smooth([[336, 300], [370, 316], [404, 404], [370, 424], [334, 360]], 10), ORC, { stitch: false });
    plush(ctx, ell(390, 420, 32, 29, 64), ORC, { stitch: false, ow: 7 });
    // ears (short, swept sideways)
    plush(ctx, smooth([[150, 206], [108, 196], [86, 198], [104, 230], [150, 246]], 10), ORC, { si: 6 });
    plush(ctx, smooth([[362, 206], [404, 196], [426, 198], [408, 230], [362, 246]], 10), ORC, { si: 6 });
    plush(ctx, smooth([[140, 214], [110, 206], [112, 224], [140, 234]], 8), mix(P.blush, ORC, 0.45), { outline: false, stitch: false, fuzz: false });
    plush(ctx, smooth([[372, 214], [402, 206], [400, 224], [372, 234]], 8), mix(P.blush, ORC, 0.45), { outline: false, stitch: false, fuzz: false });
    // topknot
    plush(ctx, smooth([[236, 120], [230, 84], [256, 62], [282, 84], [276, 120]], 8), P.brownD, { stitch: false });
    plush(ctx, rrect(238, 108, 36, 16, 7), P.rust, { stitch: false, ow: 4 });
    // head: broad, flat-topped
    const head = smooth([[256, 112], [334, 122], [372, 178], [370, 246], [338, 300], [256, 314], [174, 300], [142, 246], [140, 178], [178, 122]], 12);
    plush(ctx, head, ORC);
    // heavy brows
    brow(ctx, [[168, 182], [242, 204], [240, 222], [170, 204]], ORCD);
    brow(ctx, [[344, 182], [270, 204], [272, 222], [342, 204]], ORCD);
    mEye(ctx, 210, 236, 24, 22, 13);
    mEye(ctx, 302, 236, 24, 22, 13, 2, 5);
    // nose
    plush(ctx, smooth([[240, 248], [272, 248], [280, 268], [256, 276], [232, 268]], 8), lt(ORC, 0.1), { stitch: false, ow: 4, fuzz: false });
    // underbite: wide dark mouth, jutting lower jaw, short upward tusks
    plush(ctx, smooth([[196, 280], [256, 288], [316, 280], [306, 298], [256, 304], [206, 298]], 8), '#5b2a28', small);
    plush(ctx, smooth([[188, 290], [256, 298], [324, 290], [316, 312], [256, 322], [196, 312]], 10), lt(ORC, 0.08), { stitch: false, ow: 4, fuzz: false });
    fang(ctx, [[204, 298], [222, 298], [220, 276], [212, 262], [204, 278]]);
    fang(ctx, [[290, 298], [308, 298], [308, 278], [300, 262], [292, 276]]);
    cheek(ctx, 168, 266, 12); cheek(ctx, 344, 266, 12);
    ctx.restore();
  }

  // ---------- OGRE ----------
  const OG = '#c8ac72';
  function ogre(ctx, size) {
    begin(ctx, size);
    // feet
    plush(ctx, smooth([[150, 470], [226, 462], [240, 488], [232, 504], [144, 504], [132, 488]]), dk(OG, 0.12));
    plush(ctx, smooth([[286, 462], [362, 470], [380, 488], [368, 504], [280, 504], [272, 488]]), dk(OG, 0.12));
    // arms (behind belly sides)
    plush(ctx, smooth([[118, 270], [146, 250], [130, 380], [96, 400], [86, 330]], 10), OG, { stitch: false });
    plush(ctx, smooth([[394, 270], [366, 250], [382, 380], [416, 400], [426, 330]], 10), OG, { stitch: false });
    // huge pot belly body
    const body = smooth([[256, 196], [356, 214], [418, 290], [424, 380], [384, 460], [256, 490], [128, 460], [88, 380], [94, 290], [156, 214]], 14);
    plush(ctx, body, OG, { lx: 0.32, ly: 0.24 });
    // belly patch
    plush(ctx, ell(262, 372, 104, 86, 96), lt(OG, 0.32), { ow: 5, cast: false, si: 9, thread: dk(OG, 0.3), fuzz: false });
    // belly button
    ctx.save(); ctx.strokeStyle = al(dk(OG, 0.5), 0.8); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(266, 384, 8, 0.3, 2.9); ctx.stroke(); ctx.restore();
    // loincloth (brown, tied rope)
    plush(ctx, smooth([[128, 436], [256, 452], [384, 436], [372, 462], [326, 470], [300, 500], [256, 496], [214, 500], [190, 470], [140, 462]], 8), P.brown, { thread: P.mustard, si: 7 });
    plush(ctx, smooth([[124, 428], [256, 446], [388, 428], [388, 446], [256, 464], [124, 446]], 10), P.mustard, { si: 4, dash: [4, 4], slw: 2, ow: 6 });
    // mitten hands
    plush(ctx, ell(98, 400, 32, 30, 64), OG, { stitch: false, ow: 7 });
    plush(ctx, ell(414, 400, 32, 30, 64), OG, { stitch: false, ow: 7 });
    // little ears
    plush(ctx, ell(184, 156, 20, 24, 48), OG, { stitch: false, ow: 6 });
    plush(ctx, ell(184, 156, 10, 13, 32), mix(P.blush, OG, 0.4), { outline: false, stitch: false, fuzz: false });
    plush(ctx, ell(334, 156, 20, 24, 48), OG, { stitch: false, ow: 6 });
    plush(ctx, ell(334, 156, 10, 13, 32), mix(P.blush, OG, 0.4), { outline: false, stitch: false, fuzz: false });
    // small head on huge body
    plush(ctx, ell(259, 150, 78, 74, 96), OG, { si: 8 });
    // hair wisp
    thread(ctx, [[248, 78], [244, 60], [258, 48], [270, 58]], P.brownD, 6);
    // face
    brow(ctx, [[214, 124], [248, 132], [246, 142], [214, 136]], dk(OG, 0.35));
    brow(ctx, [[304, 124], [270, 132], [272, 142], [304, 136]], dk(OG, 0.35));
    safetyEye(ctx, 236, 152, 12); safetyEye(ctx, 286, 152, 12);
    // potato nose
    plush(ctx, ell(262, 176, 18, 14, 48), lt(OG, 0.1), { stitch: false, ow: 4, fuzz: false });
    cheek(ctx, 212, 182, 11); cheek(ctx, 312, 182, 11);
    // wide grin with one tooth
    plush(ctx, smooth([[228, 196], [262, 204], [296, 196], [286, 214], [262, 220], [238, 214]], 8), '#5b2a28', small);
    plush(ctx, rrect(266, 198, 15, 14, 4), P.cream, { stitch: false, ow: 2.5, cast: false, fuzz: false });
    ctx.restore();
  }

  // ---------- TROLL ----------
  const TR = '#6f8aa0', TRD = dk(TR, 0.3), MOSS = '#8fae5a';
  function moss(ctx, x, y, r, seed) {
    plush(ctx, cloud(x, y, r, r * 0.7, 6, 0.35, 0, seed), MOSS, { stitch: false, ow: 4, fuzz: false, seed });
  }
  function troll(ctx, size) {
    begin(ctx, size);
    // feet
    plush(ctx, smooth([[180, 472], [240, 466], [254, 490], [246, 504], [176, 504], [166, 490]]), TRD);
    plush(ctx, smooth([[272, 466], [332, 472], [346, 490], [336, 504], [266, 504], [258, 490]]), TRD);
    // long arms (behind body), hands near the ground
    // tall hunched body
    const body = smooth([[204, 232], [256, 224], [308, 232], [336, 320], [338, 430], [256, 478], [174, 430], [176, 320]], 12);
    plush(ctx, body, TR);
    // ragged hide loincloth
    const lc = [[172, 400], [256, 412], [340, 400], [342, 430]];
    for (let i = 0; i <= 6; i++) { const x = 342 - i * (172 / 6); lc.push([x, i % 2 ? 478 : 458]); }
    lc.push([170, 430]);
    plush(ctx, smooth(lc, 6), P.brown, { thread: P.cream, si: 7 });
    // long dangling arms (in front), knuckles near the ground
    plush(ctx, smooth([[176, 240], [214, 262], [190, 330], [150, 452], [112, 444], [140, 320]], 10), TR, { si: 6 });
    plush(ctx, smooth([[336, 240], [298, 262], [322, 330], [362, 452], [400, 444], [372, 320]], 10), TR, { si: 6 });
    plush(ctx, ell(128, 462, 36, 32, 64), TR, { stitch: false, ow: 7 });
    plush(ctx, ell(384, 462, 36, 32, 64), TR, { stitch: false, ow: 7 });
    // shoulder moss
    moss(ctx, 186, 248, 32, 1.1); moss(ctx, 328, 246, 28, 2.3); moss(ctx, 150, 360, 16, 0.7);
    // droopy ears
    plush(ctx, smooth([[166, 150], [116, 166], [92, 206], [130, 200], [168, 186]], 10), TR, { si: 6 });
    plush(ctx, smooth([[346, 150], [396, 166], [420, 206], [382, 200], [344, 186]], 10), TR, { si: 6 });
    // head
    plush(ctx, ell(256, 150, 98, 90, 96), TR);
    // moss tufts on top
    moss(ctx, 214, 70, 30, 0.4); moss(ctx, 268, 58, 36, 1.7); moss(ctx, 312, 78, 24, 2.9);
    // face
    brow(ctx, [[192, 126], [242, 136], [240, 150], [194, 140]], TRD);
    brow(ctx, [[320, 126], [270, 136], [272, 150], [318, 140]], TRD);
    mEye(ctx, 220, 160, 21, 21, 12, 3, 4);
    mEye(ctx, 292, 160, 21, 21, 12, 1, 4);
    cheek(ctx, 190, 200, 11); cheek(ctx, 322, 200, 11);
    // mouth with one fang
    plush(ctx, smooth([[222, 214], [256, 222], [290, 214], [282, 232], [256, 238], [230, 232]], 8), '#5b2a28', small);
    fang(ctx, [[236, 216], [250, 219], [244, 232]]);
    // big nose
    plush(ctx, smooth([[248, 164], [276, 160], [298, 192], [282, 214], [252, 214], [236, 196]], 10), lt(TR, 0.18), { stitch: false, ow: 5 });
    ctx.restore();
  }

  // ---------- GOLEM ----------
  const ST = '#a29e98', STD = dk(ST, 0.25), GLOW = '#f0c24a';
  function boulder(cx, cy, rx, ry, seed) { return cloud(cx, cy, rx, ry, 5, 0.12, 0, seed); }
  function xstitch(ctx, x, y, r = 7) {
    ctx.save(); ctx.lineCap = 'round';
    for (const [o, col, w] of [[1.4, 'rgba(40,24,22,0.35)', 4], [0, P.thread, 3]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
      ctx.moveTo(x - r + o, y - r + o); ctx.lineTo(x + r + o, y + r + o); ctx.moveTo(x + r + o, y - r + o); ctx.lineTo(x - r + o, y + r + o); ctx.stroke();
    }
    ctx.restore();
  }
  function glow(ctx, x, y, r) {
    ctx.save(); const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, al(GLOW, 0.65)); g.addColorStop(1, al(GLOW, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  function golem(ctx, size) {
    begin(ctx, size);
    // stumpy boulder legs
    plush(ctx, boulder(196, 466, 54, 40, 0.3), STD, { seed: 11 });
    plush(ctx, boulder(316, 466, 54, 40, 1.4), STD, { seed: 12 });
    // body boulder
    const body = boulder(256, 340, 150, 122, 0.9);
    plush(ctx, body, ST, { seed: 13, si: 12 });
    // glowing chest rune
    glow(ctx, 256, 344, 96); glow(ctx, 256, 344, 60);
    const rune = smooth([[256, 284], [298, 344], [256, 404], [214, 344]], 3);
    plush(ctx, rune, P.mustard, { ow: 5, si: 6, dash: [4, 3], slw: 1.8, thread: lt(P.mustard, 0.5), fuzz: false, lx: 0.5, ly: 0.5 });
    ctx.save(); ctx.strokeStyle = lt(GLOW, 0.4); ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(256, 308); ctx.lineTo(256, 380); ctx.moveTo(232, 340); ctx.lineTo(280, 340); ctx.moveTo(240, 316); ctx.lineTo(256, 330); ctx.lineTo(272, 316); ctx.stroke(); ctx.restore();
    // shoulders + boulder arms + fists
    plush(ctx, boulder(128, 300, 54, 50, 0.2), ST, { seed: 21 });
    plush(ctx, boulder(384, 300, 54, 50, 2.2), ST, { seed: 22 });
    plush(ctx, boulder(108, 374, 40, 36, 1.0), STD, { seed: 23 });
    plush(ctx, boulder(404, 374, 40, 36, 1.8), STD, { seed: 24 });
    plush(ctx, boulder(100, 440, 56, 50, 0.6), ST, { seed: 25 });
    plush(ctx, boulder(412, 440, 56, 50, 2.6), ST, { seed: 26 });
    // cross-stitches joining the boulders
    for (const [x, y] of [[164, 270], [348, 270], [112, 340], [400, 340], [104, 404], [408, 404], [212, 438], [300, 438]]) xstitch(ctx, x, y);
    // moss patch
    plush(ctx, cloud(360, 420, 22, 14, 5, 0.35, 0, 0.5), '#8fae5a', { stitch: false, ow: 4, fuzz: false });
    // head boulder
    plush(ctx, boulder(256, 166, 96, 82, 0.4), ST, { seed: 31 });
    xstitch(ctx, 222, 246, 8); xstitch(ctx, 290, 246, 8);
    // glowing eyes
    for (const x of [222, 292]) {
      glow(ctx, x, 172, 36);
      plush(ctx, ell(x, 172, 19, 16, 48), GLOW, { ow: 5, stitch: false, fuzz: false, lx: 0.5, ly: 0.5 });
      ctx.save(); ctx.fillStyle = 'rgba(255,253,235,0.9)'; ctx.beginPath(); ctx.ellipse(x - 6, 166, 6, 4.5, -0.5, 0, 7); ctx.fill(); ctx.restore();
    }
    // brow ridge + small stitched mouth
    brow(ctx, [[192, 140], [250, 150], [250, 160], [192, 152]], STD);
    brow(ctx, [[320, 140], [262, 150], [262, 160], [320, 152]], STD);
    thread(ctx, [[238, 212], [256, 206], [274, 212]], dk(ST, 0.55), 5);
    cheek(ctx, 196, 202, 10); cheek(ctx, 318, 202, 10);
    // pebble chip on head
    plush(ctx, boulder(300, 100, 18, 13, 1), STD, { stitch: false, ow: 4, fuzz: false });
    ctx.restore();
  }

  // ---------- TREANT ----------
  const BARK = '#8c5e40', LEAF = '#8ab955', LEAFL = '#b2d27e', LEAFD = '#5f8a3c';
  function treant(ctx, size) {
    begin(ctx, size);
    // root feet
    for (const s of [-1, 1]) {
      plush(ctx, smooth([[256 + s * 40, 440], [256 + s * 100, 468], [256 + s * 140, 498], [256 + s * 126, 504], [256 + s * 40, 504]].map(([x, y]) => [x, y]), 8), P.brownD, { thread: P.mustard, si: 6 });
    }
    plush(ctx, smooth([[236, 470], [276, 470], [282, 504], [230, 504]], 6), P.brownD, { stitch: false });
    // branch arms (behind trunk)
    plush(ctx, smooth([[200, 290], [140, 300], [84, 262], [70, 230], [92, 236], [130, 268], [204, 262]], 8), BARK, { thread: P.mustard, si: 6 });
    plush(ctx, smooth([[312, 290], [372, 300], [428, 262], [442, 230], [420, 236], [382, 268], [308, 262]], 8), BARK, { thread: P.mustard, si: 6 });
    // leaf tufts on the branch tips
    plush(ctx, cloud(76, 222, 34, 28, 6, 0.3, 0, 0.6), LEAF, { stitch: false, ow: 6 });
    plush(ctx, cloud(436, 222, 34, 28, 6, 0.3, 0, 1.6), LEAF, { stitch: false, ow: 6 });
    // corduroy trunk body
    const trunk = smooth([[192, 170], [320, 170], [340, 300], [344, 420], [310, 480], [256, 488], [202, 480], [168, 420], [172, 300]], 10);
    plush(ctx, trunk, BARK, { thread: P.mustard, inner(c) { cord(c, 180, 332, 160, 490, 13, 0.1); } });
    // leafy crown
    const can = cloud(256, 140, 168, 112, 9, 0.2, 0, 0.3);
    plush(ctx, can, LEAF, { si: 13, ow: 10, lx: 0.3, ly: 0.22, inner(c) {
      for (const [x, y, r] of [[186, 128, 66], [318, 124, 64], [256, 168, 72]]) {
        c.save(); shadowOn(c, 'rgba(40,60,25,0.45)', 16, 4, 8); c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = LEAF; c.fill(); shadowOff(c);
        const g = c.createRadialGradient(x - r * 0.4, y - r * 0.45, 2, x, y, r * 1.05);
        g.addColorStop(0, al(lt(LEAF, 0.38), 1)); g.addColorStop(0.55, al(LEAF, 0)); g.addColorStop(1, al(dk(LEAF, 0.3), 0.7));
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.restore();
      }
      const u = c.createLinearGradient(160, 30, 340, 260);
      u.addColorStop(0, 'rgba(255,248,215,0.16)'); u.addColorStop(0.5, 'rgba(0,0,0,0)'); u.addColorStop(1, 'rgba(30,45,25,0.30)');
      c.fillStyle = u; c.fillRect(60, 20, 400, 260);
    } });
    const pil = [[186, 128, 66], [318, 124, 64], [256, 168, 72]];
    pil.forEach(([x, y, r], i) => stitch(ctx, ell(x, y, r - 9, r - 9, 96), dk(LEAF, 0.45), { lw: 3, dash: [8, 6], hide: q => pil.some(([X, Y, R], j) => j > i && Math.hypot(q[0] - X, q[1] - Y) < R + 3) }));
    const leaf = (x, y, r, s, col) => {
      plush(ctx, xf(smooth([[0, -1], [0.55, -0.2], [0, 1], [-0.55, -0.2]], 10), x, y, r, s), col, { ow: 3.5, stitch: false, fuzz: false });
      stitch(ctx, xf([[0, -0.8], [0, 0.8]], x, y, r, s), dk(col, 0.4), { closed: false, lw: 1.8, dash: [4, 3] });
    };
    leaf(112, 140, -0.9, 22, LEAFL); leaf(400, 136, 0.9, 22, LEAFD); leaf(250, 50, 0.3, 20, LEAFL); leaf(330, 210, 2.4, 18, LEAFD);
    // face in the bark (knot-hole eye sockets)
    plush(ctx, ell(222, 300, 30, 28, 64), P.brownD, { stitch: false, ow: 4, cast: false, fuzz: false, lx: 0.6, ly: 0.7 });
    plush(ctx, ell(296, 300, 30, 28, 64), P.brownD, { stitch: false, ow: 4, cast: false, fuzz: false, lx: 0.6, ly: 0.7 });
    safetyEye(ctx, 226, 302, 16); safetyEye(ctx, 292, 302, 16);
    brow(ctx, [[188, 262], [246, 272], [244, 284], [190, 274]], '#5a3a26');
    brow(ctx, [[330, 262], [272, 272], [274, 284], [328, 274]], '#5a3a26');
    cheek(ctx, 194, 342, 12); cheek(ctx, 326, 342, 12);
    plush(ctx, smooth([[226, 352], [260, 362], [292, 352], [282, 374], [258, 380], [234, 374]], 8), '#4e2a22', small);
    // knothole nose
    plush(ctx, ell(260, 330, 10, 8, 32), lt(BARK, 0.12), { stitch: false, ow: 3, cast: false, fuzz: false });
    // little mushroom on the trunk
    plush(ctx, rrect(316, 420, 12, 22, 5), P.cream, { stitch: false, ow: 3, fuzz: false });
    plush(ctx, smooth([[302, 424], [322, 404], [342, 424]], 8), P.rust, { stitch: false, ow: 3, fuzz: false });
    ctx.restore();
  }

  window.SPRITES = Object.assign(window.SPRITES || {}, { orc, ogre, troll, golem, treant });
})();
