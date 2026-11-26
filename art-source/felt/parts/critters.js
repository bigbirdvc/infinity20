// Felt & Plush critters: goblin (reworked), slime, bat, wolf, spider, wraith, drake.
(function () {
  const { P, R, mix, lt, dk, al, RNG, ell, smooth, rrect, inset, bbox, resample, trace, xf, shadowOn, shadowOff, outlineCol, outline, stitch, plush, safetyEye, buttonEye, button, cheek, thread, begin, cloud } = window.PL;

  // ---------- small helpers ----------
  const mir = p => p.map(([x, y]) => [512 - x, y]);
  function capsule(a, b, r) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    return xf(rrect(-r, -r, L + 2 * r, 2 * r, r), a[0], a[1], ang);
  }
  // soft tapered tube with round caps along a smoothed centre line
  function tube(pts, r0, r1) {
    const c = smooth(pts, 10, false), n = c.length, L = [], Rt = [];
    for (let i = 0; i < n; i++) {
      const a = c[Math.max(i - 1, 0)], b = c[Math.min(i + 1, n - 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l, r = r0 + (r1 - r0) * i / (n - 1);
      L.push([c[i][0] + nx * r, c[i][1] + ny * r]); Rt.push([c[i][0] - nx * r, c[i][1] - ny * r]);
    }
    const cap = (ctr, from, r, steps = 8) => { const out = [], a0 = Math.atan2(from[1] - ctr[1], from[0] - ctr[0]);
      for (let k = 1; k < steps; k++) { const a = a0 - Math.PI * k / steps; out.push([ctr[0] + Math.cos(a) * r, ctr[1] + Math.sin(a) * r]); } return out; };
    return L.concat(cap(c[n - 1], L[n - 1], r1), Rt.reverse(), cap(c[0], Rt[Rt.length - 1], r0));
  }
  const flat = (o = {}) => Object.assign({ stitch: false, fuzz: false, cast: false, ow: 4 }, o);
  function fang(ctx, pts) { plush(ctx, smooth(pts, 6), P.cream, { stitch: false, ow: 2.5, cast: false, fuzz: false }); }
  function gloss(c, x, y, rx, ry, rot, a = 0.55) {
    c.save(); c.fillStyle = `rgba(255,252,244,${a})`; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 7); c.fill(); c.restore();
  }

  // =====================================================================
  // GOBLIN — brighter lime skin, strong purple tunic, silver-tipped spear
  // =====================================================================
  function goblin(ctx, size) {
    begin(ctx, size);
    const G = '#bccf4c', GD = '#879a34', TUN = '#7a4790';
    // feet (dark brown felt boots so they don't sink into the grass)
    plush(ctx, smooth([[186, 476], [236, 466], [252, 488], [244, 504], [180, 504], [172, 490]]), P.brown, { si: 6 });
    plush(ctx, smooth([[270, 466], [320, 476], [332, 490], [326, 504], [262, 504], [258, 488]]), P.brown, { si: 6 });
    // tunic with pinked hem — a big purple mass
    const tun = [[204, 322], [308, 322], [330, 380], [338, 448]];
    for (let i = 0; i <= 8; i++) { const x = 338 - i * (176 / 8); tun.push([x, i % 2 ? 488 : 466]); }
    tun.push([174, 448], [182, 380]);
    plush(ctx, smooth(tun, 6), TUN, { thread: P.mustard });
    // rope belt + buckle
    plush(ctx, smooth([[180, 400], [256, 410], [332, 400], [334, 422], [256, 432], [178, 422]], 10), P.mustard, { si: 5, dash: [4, 4], slw: 2 });
    button(ctx, 256, 418, 12, P.rust);
    // far arm
    plush(ctx, smooth([[208, 346], [222, 362], [196, 430], [172, 422], [188, 360]], 10), G, { stitch: false });
    plush(ctx, ell(180, 430, 22, 20, 64), G, { stitch: false, ow: 7 });
    // ears
    const earL = smooth([[168, 196], [100, 172], [26, 132], [60, 206], [148, 262]], 12);
    plush(ctx, earL, G, { si: 8 }); plush(ctx, mir(earL), G, { si: 8 });
    const inL = smooth([[150, 208], [96, 186], [58, 162], [82, 208], [140, 240]], 10);
    plush(ctx, inL, mix(P.blush, G, 0.3), { outline: false, stitch: false, fuzz: false });
    plush(ctx, mir(inL), mix(P.blush, G, 0.3), { outline: false, stitch: false, fuzz: false });
    // hair tufts
    plush(ctx, smooth([[234, 142], [222, 90], [252, 126], [270, 82], [280, 140]], 8), P.rustD, { stitch: false, si: 5 });
    // head
    plush(ctx, ell(256, 232, 120, 104), G);
    // brows
    plush(ctx, smooth([[176, 184], [238, 200], [236, 216], [178, 202]], 6), GD, flat());
    plush(ctx, smooth([[336, 184], [274, 200], [276, 216], [334, 202]], 6), GD, flat());
    // eyes
    plush(ctx, ell(214, 242, 30, 32, 64), P.cream, { ow: 5, si: 5, dash: [4, 3], slw: 1.8, fuzz: false });
    plush(ctx, ell(298, 242, 30, 32, 64), P.cream, { ow: 5, si: 5, dash: [4, 3], slw: 1.8, fuzz: false });
    safetyEye(ctx, 220, 248, 17); safetyEye(ctx, 292, 248, 17);
    cheek(ctx, 180, 286, 13); cheek(ctx, 332, 286, 13);
    // mouth + fangs
    plush(ctx, smooth([[214, 288], [256, 296], [298, 288], [286, 314], [256, 322], [226, 314]], 8), '#6b2f2b', flat());
    fang(ctx, [[226, 294], [238, 295], [233, 308]]); fang(ctx, [[274, 295], [286, 294], [279, 308]]);
    // nose
    plush(ctx, smooth([[248, 258], [266, 258], [270, 278], [256, 284], [244, 276]], 8), G, { stitch: false, ow: 4, fuzz: false });
    // spear (held in near hand, raised to the viewer's right)
    ctx.save(); ctx.translate(348, 418); ctx.rotate(0.27);
    plush(ctx, rrect(-10, -300, 20, 380, 10), P.brown, { thread: P.mustard, si: 5, dash: [5, 4], slw: 2 });
    const blade = smooth([[0, -392], [30, -340], [20, -304], [0, -292], [-20, -304], [-30, -340]], 10);
    plush(ctx, blade, P.silver, { si: 7, thread: '#8a96a2', dash: [5, 4], slw: 2,
      inner(c) { c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(-8, -366); c.lineTo(-8, -310); c.stroke(); } });
    // rust tassel wrap + ribbons
    plush(ctx, smooth([[22, -286], [36, -236], [26, -214], [14, -246]], 8), P.rust, { stitch: false, ow: 5 });
    plush(ctx, smooth([[18, -286], [8, -230], [-4, -212], [0, -250]], 8), P.rustD, { stitch: false, ow: 5 });
    plush(ctx, rrect(-16, -296, 32, 26, 9), P.rust, { si: 4, dash: [4, 3], slw: 1.8, thread: P.thread });
    ctx.restore();
    // near arm + hand over spear
    plush(ctx, smooth([[300, 344], [318, 352], [356, 400], [338, 422], [292, 370]], 10), G, { stitch: false });
    plush(ctx, ell(348, 416, 24, 22, 64), G, { stitch: false, ow: 7 });
    ctx.restore();
  }

  // =====================================================================
  // SLIME — raspberry-pink jelly blob, glossy felt highlights
  // =====================================================================
  function slime(ctx, size) {
    begin(ctx, size);
    const S = '#e2769f';
    const body = smooth([[256, 507], [150, 505], [84, 498], [56, 464], [64, 392], [96, 316], [148, 250], [204, 206], [236, 184], [262, 150], [292, 128], [296, 160], [292, 190], [334, 208], [390, 254], [430, 322], [452, 400], [454, 466], [426, 498], [362, 505]], 12);
    plush(ctx, body, S, { si: 13, lx: 0.3, ly: 0.3, inner(c, b) {
      // jelly bubbles inside
      for (const [x, y, r] of [[360, 440, 15], [396, 380, 9], [128, 446, 11], [340, 270, 8], [414, 456, 7]]) {
        c.save(); c.strokeStyle = al(lt(S, 0.6), 0.7); c.lineWidth = 3; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke();
        c.fillStyle = al(lt(S, 0.4), 0.35); c.fill(); c.restore();
        gloss(c, x - r * 0.35, y - r * 0.35, r * 0.3, r * 0.22, -0.6, 0.8);
      }
      // translucent darker core near the base
      const g = c.createRadialGradient(280, 490, 10, 280, 490, 220); g.addColorStop(0, al(dk(S, 0.35), 0.45)); g.addColorStop(1, al(dk(S, 0.35), 0));
      c.fillStyle = g; c.fillRect(b.x, b.y, b.w, b.h);
      // big shiny felt highlights (top-left)
      gloss(c, 142, 330, 36, 17, -0.9, 0.6);
      gloss(c, 194, 256, 17, 9, -0.75, 0.65);
      gloss(c, 104, 404, 9, 7, 0, 0.5);
      gloss(c, 272, 160, 7, 5, -0.6, 0.6);
    } });
    // squishy base lip: a stitched seam just above the floor
    stitch(ctx, smooth([[78, 470], [160, 488], [256, 492], [352, 488], [436, 470]], 8, false), lt(S, 0.5), { closed: false, lw: 2.6, dash: [7, 5] });
    // face
    cheek(ctx, 160, 404, 17); cheek(ctx, 356, 404, 17);
    safetyEye(ctx, 202, 368, 26); safetyEye(ctx, 314, 368, 26);
    plush(ctx, smooth([[234, 400], [258, 406], [282, 400], [274, 422], [258, 428], [242, 422]], 8), '#7a2f3e', flat({ inner(c) { c.fillStyle = al(P.blush, 0.9); c.beginPath(); c.ellipse(258, 424, 12, 6, 0, 0, 7); c.fill(); } }));
    ctx.restore();
  }

  // =====================================================================
  // BAT — wide scalloped felt wings, purple, cream fangs
  // =====================================================================
  function bat(ctx, size) {
    begin(ctx, size);
    ctx.translate(0, 70);
    const B = '#7d5aa0', BW = '#5e4486', BL = '#b49ad0';
    // wings (left built, right mirrored)
    const wing = smooth([[230, 262], [186, 212], [124, 178], [60, 170], [10, 196], [22, 250], [34, 306], [64, 274], [92, 280], [112, 340], [140, 306], [168, 316], [196, 374], [234, 352]], 9);
    const ribs = [[[214, 256], [30, 296]], [[218, 270], [108, 332]], [[226, 290], [194, 366]]];
    for (const w of [wing, mir(wing)]) outline(ctx, w, BW);
    for (const [w, flip] of [[wing, false], [mir(wing), true]]) {
      plush(ctx, w, BW, { ow: 9, cast: false, si: 9, inner(c) {
        c.strokeStyle = al(dk(BW, 0.45), 0.6); c.lineWidth = 6; c.lineCap = 'round';
        for (const [a, b2] of ribs) { const A = flip ? [512 - a[0], a[1]] : a, Bp = flip ? [512 - b2[0], b2[1]] : b2; c.beginPath(); c.moveTo(A[0], A[1]); c.quadraticCurveTo((A[0] + Bp[0]) / 2, Math.min(A[1], Bp[1]) - 16, Bp[0], Bp[1]); c.stroke(); }
      } });
      // finger ribs as stitched seams
      for (const [a, b2] of ribs) {
        const A = flip ? [512 - a[0], a[1]] : a, Bp = flip ? [512 - b2[0], b2[1]] : b2;
        const mid = [(A[0] + Bp[0]) / 2, Math.min(A[1], Bp[1]) - 16];
        stitch(ctx, smooth([A, mid, Bp], 8, false), lt(BW, 0.45), { closed: false, lw: 2.4, dash: [6, 5] });
      }
    }
    // wing-thumb claws
    for (const fx of [1, -1]) { const x = fx > 0 ? 58 : 454; plush(ctx, smooth([[x - 8, 176], [x + 2, 150], [x + 10, 178]].map(([px, py]) => [fx > 0 ? px : px, py]), 6), P.cream, { stitch: false, ow: 3, fuzz: false }); }
    // feet
    plush(ctx, ell(232, 420, 16, 13, 40), dk(B, 0.2), { stitch: false, ow: 5 });
    plush(ctx, ell(280, 420, 16, 13, 40), dk(B, 0.2), { stitch: false, ow: 5 });
    // body + belly patch
    plush(ctx, ell(256, 348, 78, 76), B, { si: 8 });
    plush(ctx, ell(256, 362, 44, 46, 64), BL, { ow: 4, cast: false, si: 6, dash: [5, 4], slw: 2, fuzz: false });
    // ears
    const ear = smooth([[196, 222], [164, 150], [150, 92], [198, 128], [240, 190]], 10);
    plush(ctx, ear, B, { si: 7 }); plush(ctx, mir(ear), B, { si: 7 });
    const ein = smooth([[192, 206], [172, 152], [166, 116], [196, 142], [222, 192]], 8);
    plush(ctx, ein, mix(P.blush, B, 0.25), flat({ outline: false })); plush(ctx, mir(ein), mix(P.blush, B, 0.25), flat({ outline: false }));
    // head
    plush(ctx, ell(256, 250, 92, 80), B);
    // brows + eyes
    plush(ctx, smooth([[196, 214], [240, 226], [238, 238], [198, 228]], 6), BW, flat());
    plush(ctx, smooth([[316, 214], [272, 226], [274, 238], [314, 228]], 6), BW, flat());
    plush(ctx, ell(222, 256, 22, 24, 64), P.cream, { ow: 4, si: 4, dash: [3, 3], slw: 1.5, fuzz: false });
    plush(ctx, ell(290, 256, 22, 24, 64), P.cream, { ow: 4, si: 4, dash: [3, 3], slw: 1.5, fuzz: false });
    safetyEye(ctx, 226, 260, 13); safetyEye(ctx, 286, 260, 13);
    cheek(ctx, 192, 290, 11); cheek(ctx, 320, 290, 11);
    // nose + mouth + fangs
    plush(ctx, ell(256, 276, 9, 6, 32), dk(B, 0.5), flat({ ow: 2.5 }));
    thread(ctx, [[232, 292], [244, 300], [256, 294], [268, 300], [280, 292]], '#3e2440', 4.5);
    fang(ctx, [[238, 297], [248, 299], [242, 314]]); fang(ctx, [[264, 299], [274, 297], [270, 314]]);
    ctx.restore();
  }

  // =====================================================================
  // WOLF — sitting grey plush wolf, cream muzzle and chest
  // =====================================================================
  function wolf(ctx, size) {
    begin(ctx, size);
    const W = '#99a1ac', WD = '#6e7683';
    // tail (behind, curling up on the viewer's right)
    const tail = smooth([[318, 486], [392, 470], [446, 418], [470, 340], [452, 276], [430, 320], [414, 384], [372, 432], [318, 446]], 10);
    plush(ctx, tail, W, { si: 9, inner(c) { c.fillStyle = al(P.cream, 1); c.save(); shadowOn(c, 'rgba(40,40,50,0.35)', 6, 2, 4); c.beginPath(); c.moveTo(452, 276); c.quadraticCurveTo(482, 300, 470, 346); c.quadraticCurveTo(446, 340, 430, 320); c.closePath(); c.fill(); c.restore(); } });
    // haunches
    plush(ctx, ell(180, 452, 62, 52), W, { si: 8 });
    plush(ctx, ell(332, 452, 62, 52), W, { si: 8 });
    // body
    plush(ctx, smooth([[200, 300], [312, 300], [344, 380], [338, 476], [256, 490], [174, 476], [168, 380]]), W);
    // cream chest bib (zig-zag felt edge)
    const bib = [[214, 312], [298, 312], [312, 360]];
    for (let i = 0; i <= 6; i++) bib.push([304 - i * (96 / 6), 420 + (i % 2 ? 20 : 0)]);
    bib.push([200, 360]);
    plush(ctx, smooth(bib, 6), P.cream, { ow: 5, cast: true, si: 7, dash: [5, 4], slw: 2, thread: P.creamD });
    // front legs + fat cream paws
    plush(ctx, rrect(198, 400, 44, 84, 20), W, { stitch: false, ow: 7 });
    plush(ctx, rrect(270, 400, 44, 84, 20), W, { stitch: false, ow: 7 });
    for (const x of [218, 294]) {
      plush(ctx, ell(x, 486, 34, 20, 64), P.cream, { stitch: false, ow: 6 });
      ctx.save(); ctx.strokeStyle = al(P.creamD, 0.9); ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (const d of [-10, 10]) { ctx.beginPath(); ctx.moveTo(x + d, 476); ctx.lineTo(x + d, 494); ctx.stroke(); } ctx.restore();
    }
    // ears
    const ear = smooth([[168, 176], [142, 96], [150, 44], [204, 96], [232, 140]], 10);
    plush(ctx, ear, W, { si: 8 }); plush(ctx, mir(ear), W, { si: 8 });
    const ein = smooth([[176, 156], [162, 100], [166, 72], [198, 108], [214, 142]], 8);
    plush(ctx, ein, mix(P.blush, W, 0.3), flat({ outline: false })); plush(ctx, mir(ein), mix(P.blush, W, 0.3), flat({ outline: false }));
    // cheek ruff + head
    const head = smooth([[256, 112], [326, 124], [370, 178], [380, 236], [406, 262], [366, 270], [384, 300], [330, 316], [256, 326], [182, 316], [128, 300], [146, 270], [106, 262], [132, 236], [142, 178], [186, 124]], 10);
    plush(ctx, head, W, { si: 12 });
    // forehead darker blaze
    // brows + eyes
    plush(ctx, smooth([[184, 190], [234, 202], [232, 214], [186, 202]], 6), WD, flat());
    plush(ctx, smooth([[328, 190], [278, 202], [280, 214], [326, 202]], 6), WD, flat());
    plush(ctx, ell(212, 230, 22, 24, 64), P.cream, { ow: 4, si: 4, dash: [3, 3], slw: 1.5, fuzz: false });
    plush(ctx, ell(300, 230, 22, 24, 64), P.cream, { ow: 4, si: 4, dash: [3, 3], slw: 1.5, fuzz: false });
    safetyEye(ctx, 216, 234, 14); safetyEye(ctx, 296, 234, 14);
    // muzzle
    plush(ctx, smooth([[204, 262], [256, 244], [308, 262], [318, 296], [290, 318], [256, 322], [222, 318], [194, 296]], 10), P.cream, { si: 6, dash: [5, 4], slw: 2, thread: P.creamD, ow: 6 });
    cheek(ctx, 172, 280, 12); cheek(ctx, 340, 280, 12);
    plush(ctx, smooth([[236, 258], [276, 258], [272, 276], [256, 284], [240, 276]], 8), '#3a2a2e', flat({ ow: 3, inner(c) { gloss(c, 248, 264, 7, 4, -0.3, 0.6); } }));
    thread(ctx, [[256, 284], [256, 296]], '#4a3030', 4);
    thread(ctx, [[232, 296], [244, 306], [256, 298], [268, 306], [280, 296]], '#4a3030', 4.5);
    fang(ctx, [[238, 301], [248, 303], [243, 314]]); fang(ctx, [[264, 303], [274, 301], [269, 314]]);
    ctx.restore();
  }

  // =====================================================================
  // SPIDER — round purple plush, 8 stubby striped legs, many button eyes
  // =====================================================================
  function spider(ctx, size) {
    begin(ctx, size);
    const S = '#7a4f98', SD = '#563870';
    const legs = [
      [[186, 268], [112, 200], [66, 270]],
      [[170, 318], [88, 286], [56, 370]],
      [[172, 376], [92, 384], [80, 452]],
      [[200, 428], [148, 456], [140, 494]],
    ];
    const allLegs = legs.concat(legs.map(l => l.map(([x, y]) => [512 - x, y])));
    for (const pts of allLegs) {
      const [a, k, f] = pts, shape = tube(pts, 22, 17);
      plush(ctx, shape, SD, { si: 6, dash: [5, 4], slw: 2, thread: lt(SD, 0.4) });
      // mustard cross-stitches at the knee
      ctx.save(); ctx.strokeStyle = P.mustard; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      for (const d of [-7, 7]) { const ang = Math.atan2(f[1] - a[1], f[0] - a[0]) + Math.PI / 2, ux = Math.cos(ang), uy = Math.sin(ang), tx = -uy, ty = ux;
        ctx.beginPath(); ctx.moveTo(k[0] + tx * d - ux * 14, k[1] + ty * d - uy * 14); ctx.lineTo(k[0] + tx * d + ux * 14, k[1] + ty * d + uy * 14); ctx.stroke(); }
      ctx.restore();
      plush(ctx, ell(f[0], f[1] + 4, 22, 16, 48), dk(SD, 0.2), { stitch: false, ow: 6 });
    }
    // body
    plush(ctx, ell(256, 330, 140, 148), S, { si: 12, inner(c) {
      // mustard felt crest marking on top
      c.save(); shadowOn(c, 'rgba(40,15,40,0.45)', 6, 2, 4); c.fillStyle = P.mustard;
      trace(c, smooth([[256, 186], [284, 204], [276, 236], [256, 252], [236, 236], [228, 204]], 8)); c.fill(); c.restore();
    } });
    stitch(ctx, smooth([[256, 192], [280, 206], [272, 234], [256, 246], [240, 234], [232, 206]], 8), P.thread, { lw: 2, dash: [4, 3] });
    // small button eyes (row above)
    for (const [x, y, r] of [[196, 290, 11], [316, 290, 11], [230, 274, 9], [282, 274, 9]]) buttonEye(ctx, x, y, r, '#3b2c3c');
    // big eyes on cream whites
    plush(ctx, ell(214, 336, 28, 30, 64), P.cream, { ow: 4, si: 5, dash: [3, 3], slw: 1.6, fuzz: false });
    plush(ctx, ell(298, 336, 28, 30, 64), P.cream, { ow: 4, si: 5, dash: [3, 3], slw: 1.6, fuzz: false });
    safetyEye(ctx, 218, 340, 17); safetyEye(ctx, 294, 340, 17);
    cheek(ctx, 172, 382, 13); cheek(ctx, 340, 382, 13);
    // mouth + fangs (chelicerae)
    thread(ctx, [[236, 390], [256, 398], [276, 390]], '#3a2038', 4.5);
    fang(ctx, [[234, 396], [248, 400], [240, 422]]); fang(ctx, [[264, 400], [278, 396], [272, 422]]);
    ctx.restore();
  }

  // =====================================================================
  // WRAITH — pale blue-white ghost sheet, ragged hem, hollow cute eyes
  // =====================================================================
  function wraith(ctx, size) {
    begin(ctx, size);
    const Wc = '#dde7f2', Wi = '#a9b9d6';
    // ragged hem points
    const hem = [];
    const hx = [404, 370, 334, 296, 256, 216, 178, 142, 108];
    hx.forEach((x, i) => hem.push([x, i % 2 ? 440 : 490 - Math.abs(i - 4) * 4]));
    // inner sheet (underside, visible through the notches)
    plush(ctx, smooth([[130, 360], [382, 360], [392, 446], [256, 462], [120, 446]], 10), Wi, { stitch: false, ow: 7 });
    const sheet = smooth([[256, 44], [330, 62], [374, 128], [384, 214], [400, 270], [452, 296], [466, 330], [430, 334], [404, 324], [412, 400], [418, 456], ...hem, [94, 456], [100, 400], [108, 324], [82, 334], [46, 330], [60, 296], [112, 270], [128, 214], [138, 128], [182, 62]], 9);
    plush(ctx, sheet, Wc, { si: 11, lx: 0.32, ly: 0.18, thread: mix(Wi, '#5d6c90', 0.35), inner(c, b) {
      // soft fold creases running down the sheet
      c.strokeStyle = al(dk(Wi, 0.2), 0.45); c.lineWidth = 6; c.lineCap = 'round';
      for (const [x0, x1] of [[200, 178], [312, 334]]) { c.beginPath(); c.moveTo(x0, 330); c.quadraticCurveTo((x0 + x1) / 2, 390, x1, 444); c.stroke(); }
      const g = c.createLinearGradient(0, 300, 0, 500); g.addColorStop(0, 'rgba(120,140,190,0)'); g.addColorStop(1, 'rgba(120,140,190,0.35)');
      c.fillStyle = g; c.fillRect(b.x, b.y, b.w, b.h);
    } });
    // hollow eyes: dark felt holes with a blue rim and sparkle
    for (const x of [206, 306]) {
      plush(ctx, ell(x, 214, 34, 40, 64), '#34304e', { ow: 5, cast: false, stitch: false, fuzz: false, inner(c) {
        const g = c.createRadialGradient(x, 230, 4, x, 214, 40); g.addColorStop(0, 'rgba(110,150,230,0.55)'); g.addColorStop(1, 'rgba(110,150,230,0)'); c.fillStyle = g; c.fillRect(x - 40, 170, 80, 90);
      } });
      stitch(ctx, ell(x, 214, 42, 48, 64), '#7f9cc8', { lw: 2.4, dash: [5, 4] });
      ctx.save(); ctx.fillStyle = 'rgba(255,253,245,0.95)';
      ctx.beginPath(); ctx.ellipse(x - 12, 198, 10, 8, -0.5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 11, 228, 4, 0, 7); ctx.fill(); ctx.restore();
    }
    cheek(ctx, 166, 270, 14); cheek(ctx, 346, 270, 14);
    // little "oo" mouth
    plush(ctx, ell(256, 282, 16, 20, 48), '#34304e', flat({ ow: 3 }));
    ctx.save(); ctx.fillStyle = al(P.blush, 0.8); ctx.beginPath(); ctx.ellipse(256, 292, 9, 6, 0, 0, 7); ctx.fill(); ctx.restore();
    ctx.restore();
  }

  // =====================================================================
  // DRAKE — red baby dragon, cream segmented belly, little wings + horns
  // =====================================================================
  function drake(ctx, size) {
    begin(ctx, size);
    const D = '#c9473a', DD = '#94302a';
    // tail curling to the viewer's right, spade tip
    const tail = smooth([[310, 470], [380, 478], [432, 446], [448, 390], [430, 350], [414, 382], [404, 420], [370, 440], [318, 434]], 10);
    plush(ctx, tail, D, { si: 8 });
    plush(ctx, smooth([[420, 360], [404, 314], [436, 280], [470, 312], [452, 362], [434, 372]], 10), P.mustard, { si: 6, dash: [5, 4], slw: 2 });
    // wings (behind body)
    const wing = smooth([[206, 330], [150, 300], [96, 232], [86, 284], [64, 300], [92, 330], [88, 368], [140, 360], [190, 380]], 9);
    for (const [w, fl] of [[wing, 0], [mir(wing), 1]]) {
      const f = fl ? (x => 512 - x) : (x => x);
      const mem = smooth([[204, 330], [150, 300], [96, 232], [86, 284], [64, 300], [92, 330], [88, 368], [140, 360], [190, 380]].map(([x, y]) => [f(x), y]), 9);
      plush(ctx, mem, P.mustard, { si: 7, dash: [5, 4], slw: 2, inner(c) {
        c.strokeStyle = al(P.mustardD, 0.85); c.lineWidth = 4; c.lineCap = 'round';
        for (const [x, y] of [[98, 240], [70, 302], [92, 364]]) { c.beginPath(); c.moveTo(f(196), 336); c.lineTo(f(x), y); c.stroke(); }
      } });
      plush(ctx, smooth([[f(90), 244], [f(92), 206], [f(110), 238]], 6), P.cream, { stitch: false, ow: 3, fuzz: false });
    }
    // feet
    for (const [x, fl] of [[204, 1], [308, -1]]) {
      plush(ctx, smooth([[x - 44, 504], [x - 50, 480], [x - 20, 458], [x + 24, 460], [x + 46, 482], [x + 40, 504]]), D, { si: 6 });
      for (const d of [-26, 0, 26]) plush(ctx, ell(x + d, 500, 9, 7, 24), P.cream, { stitch: false, ow: 3, fuzz: false, cast: false });
    }
    // body
    plush(ctx, smooth([[204, 314], [308, 314], [338, 386], [336, 462], [256, 482], [176, 462], [174, 386]]), D);
    // cream belly with stitched segments
    plush(ctx, smooth([[222, 330], [290, 330], [312, 396], [300, 456], [256, 470], [212, 456], [200, 396]], 10), P.cream, { ow: 5, cast: true, si: 7, dash: [5, 4], slw: 2, thread: P.creamD, inner(c) {
      c.strokeStyle = al(P.creamD, 1); c.lineWidth = 3; c.setLineDash([6, 4]);
      for (const y of [362, 394, 426]) { c.beginPath(); c.moveTo(196, y); c.quadraticCurveTo(256, y + 14, 316, y); c.stroke(); }
    } });
    // arms
    plush(ctx, smooth([[200, 340], [214, 356], [196, 404], [172, 398], [184, 352]], 10), D, { stitch: false });
    plush(ctx, ell(184, 404, 20, 18, 48), D, { stitch: false, ow: 6 });
    plush(ctx, smooth([[312, 340], [298, 356], [316, 404], [340, 398], [328, 352]], 10), D, { stitch: false });
    plush(ctx, ell(328, 404, 20, 18, 48), D, { stitch: false, ow: 6 });
    // horns
    const horn = smooth([[196, 148], [168, 92], [150, 54], [190, 84], [228, 128]], 9);
    plush(ctx, horn, P.cream, { si: 6, dash: [5, 4], slw: 2, thread: P.creamD }); plush(ctx, mir(horn), P.cream, { si: 6, dash: [5, 4], slw: 2, thread: P.creamD });
    // head spines
    for (const [x, y, s] of [[256, 102, 20], [222, 112, 15], [290, 112, 15]]) plush(ctx, smooth([[x - s, y + 12], [x, y - s * 1.3], [x + s, y + 12]], 8), P.mustard, { stitch: false, ow: 5 });
    // head
    plush(ctx, ell(256, 214, 124, 104), D);
    // ear fins
    const fin = smooth([[140, 200], [96, 176], [110, 222], [138, 238]], 8);
    plush(ctx, fin, P.mustard, { stitch: false, ow: 6 }); plush(ctx, mir(fin), P.mustard, { stitch: false, ow: 6 });
    // snout
    plush(ctx, smooth([[200, 262], [256, 246], [312, 262], [318, 294], [256, 312], [194, 294]], 10), lt(D, 0.18), { si: 6, dash: [5, 4], slw: 2 });
    for (const x of [240, 272]) plush(ctx, ell(x, 266, 6, 4, 24), DD, flat({ ow: 2 }));
    // brows + eyes
    plush(ctx, smooth([[182, 180], [234, 192], [232, 204], [184, 194]], 6), DD, flat());
    plush(ctx, smooth([[330, 180], [278, 192], [280, 204], [328, 194]], 6), DD, flat());
    plush(ctx, ell(212, 226, 24, 26, 64), P.cream, { ow: 4, si: 4, dash: [3, 3], slw: 1.5, fuzz: false });
    plush(ctx, ell(300, 226, 24, 26, 64), P.cream, { ow: 4, si: 4, dash: [3, 3], slw: 1.5, fuzz: false });
    safetyEye(ctx, 216, 230, 15); safetyEye(ctx, 296, 230, 15);
    cheek(ctx, 168, 266, 13); cheek(ctx, 344, 266, 13);
    thread(ctx, [[226, 288], [256, 298], [286, 288]], '#5a2222', 4.5);
    fang(ctx, [[268, 293], [280, 290], [276, 306]]);
    ctx.restore();
  }

  window.SPRITES = Object.assign(window.SPRITES || {}, { goblin, slime, bat, wolf, spider, wraith, drake });
})();
