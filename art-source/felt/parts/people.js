// FELT & PLUSH — people: heroes, villager and humanoid foes. Designer: people.
(function () {
  const { P, R, mix, lt, dk, al, RNG, ell, smooth, rrect, inset, bbox, resample, trace, xf, shadowOn, shadowOff, outlineCol, outline, stitch, plush, safetyEye, buttonEye, button, cheek, thread, begin, cloud } = window.PL;

  // ---- local richer tones (mixes of the palette, a notch more saturated for map readability) ----
  const C = {
    heroBlue: '#3f78c0', heroBlueD: '#2f5c99',
    elfGreen: '#349a7c', elfGreenD: '#26745c',
    mageBlue: '#4a6fc0', mageBlueD: '#36529a',
    plume: '#d5543a', steel: '#d3dbe1', steelT: '#8a96a2', blade: '#e4eaee',
    boot: '#6a432d', wood: '#9a6a44', woodL: '#b8875a',
    purple: '#7a4e9a', purpleD: '#553571', purpleL: '#a77cc6',
    armour: '#56525e', armourD: '#3e3a45',
    bone: '#f0e2c4', boneD: '#d8c09a',
    mask: '#b8473a', hood: '#6b5650',
    dress: '#5f86b0', hair: '#8c5e40', hairD: '#6a432d',
    mouth: '#6b3a32', glow: '#f6dc6a'
  };

  // thick stroke as a closed shape (for bows, staffs, limbs), with rounded caps
  function band(pts, w0, w1 = w0, per = 8) {
    const c = smooth(pts, per, false), n = c.length, L = [], Rr = [];
    for (let i = 0; i < n; i++) {
      const a = c[Math.max(0, i - 1)], b = c[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const w = (w0 + (w1 - w0) * i / (n - 1)) / 2;
      L.push([c[i][0] - ty * w, c[i][1] + tx * w]); Rr.push([c[i][0] + ty * w, c[i][1] - tx * w]);
    }
    // end cap (from R end to L end around the tip) and start cap
    const e = c[n - 1], s = c[0];
    const endCap = arcBetween(Rr[n - 1], L[n - 1], e), startCap = arcBetween(L[0], Rr[0], s);
    return [...startCap, ...Rr, ...endCap, ...L.reverse()];
    function arcBetween(p, q, ctr) {
      const r = Math.hypot(p[0] - ctr[0], p[1] - ctr[1]); let a0 = Math.atan2(p[1] - ctr[1], p[0] - ctr[0]), a1 = Math.atan2(q[1] - ctr[1], q[0] - ctr[0]);
      // go the outward way (the half facing away from the band)
      let d = a1 - a0; while (d <= 0) d += Math.PI * 2; if (d > Math.PI * 1.01) d -= Math.PI * 2;
      const o = []; for (let k = 1; k < 6; k++) { const a = a0 + d * k / 6; o.push([ctr[0] + Math.cos(a) * r, ctr[1] + Math.sin(a) * r]); } return o;
    }
  }

  function boots(ctx, col, o = {}) {
    const dx = o.dx || 0;
    plush(ctx, smooth([[188 - dx, 458], [238 - dx, 454], [252 - dx, 482], [246 - dx, 504], [184 - dx, 504], [172 - dx, 486]]), col, { si: 7 });
    plush(ctx, smooth([[272 + dx, 456], [320 + dx, 458], [338 + dx, 486], [330 + dx, 504], [266 + dx, 504], [260 + dx, 482]]), col, { si: 7 });
    if (o.cuff) {
      plush(ctx, rrect(184 - dx, 448, 64, 20, 9), o.cuff, { si: 4, dash: [4, 3], slw: 1.8, ow: 6 });
      plush(ctx, rrect(266 + dx, 448, 64, 20, 9), o.cuff, { si: 4, dash: [4, 3], slw: 1.8, ow: 6 });
    }
  }
  function face(ctx, cx, cy, o = {}) {
    const g = o.gap || 33, er = o.er || 17;
    if (o.cheeks !== false) { cheek(ctx, cx - g - 19, cy + 30, 14); cheek(ctx, cx + g + 19, cy + 30, 14); }
    safetyEye(ctx, cx - g, cy, er); safetyEye(ctx, cx + g, cy, er);
    if (o.mouth !== false) thread(ctx, [[cx - 11, cy + 31], [cx, cy + 39], [cx + 11, cy + 31]], C.mouth, 4.5);
  }
  function mitten(ctx, x, y, col, r = 24) { plush(ctx, ell(x, y, r, r * 0.92, 64), col, { stitch: false, ow: 7 }); }
  function glowAt(ctx, x, y, r, col, a = 0.75) {
    ctx.save(); const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, al(col, a)); g.addColorStop(0.45, al(col, a * 0.35)); g.addColorStop(1, al(col, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  function star(cx, cy, r, rot = -Math.PI / 2, k = 0.48) {
    const p = []; for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, rr = i % 2 ? r * k : r; p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    return smooth(p, 3);
  }
  const BODY = [[200, 322], [256, 312], [314, 322], [336, 392], [330, 466], [256, 480], [182, 466], [176, 392]];

  // =================== KNIGHT ===================
  function knight(ctx, size) {
    begin(ctx, size);
    // cape (behind)
    plush(ctx, smooth([[196, 318], [316, 318], [346, 410], [344, 484], [256, 494], [168, 484], [166, 410]]), P.rustD, { si: 9 });
    boots(ctx, C.boot, { cuff: P.mustard, dx: 4 });
    // tunic
    plush(ctx, smooth(BODY), C.heroBlue, { thread: lt(C.heroBlue, 0.55) });
    // belt
    plush(ctx, smooth([[180, 416], [256, 426], [332, 416], [333, 442], [256, 452], [179, 442]], 10), P.mustard, { si: 6, dash: [5, 4], slw: 2 });
    button(ctx, 244, 438, 13, P.cream);
    // sword (viewer-left hand), bigger and brighter
    ctx.save(); ctx.translate(152, 426); ctx.rotate(-0.5);
    plush(ctx, smooth([[-19, -30], [-20, -170], [-12, -222], [0, -248], [12, -222], [20, -170], [19, -30]], 10), C.blade, { si: 7, thread: '#7f8b96', dash: [6, 5], slw: 2.2, ow: 10,
      inner(c) { c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(-7, -40); c.lineTo(-7, -200); c.stroke();
        c.strokeStyle = 'rgba(60,70,90,0.22)'; c.lineWidth = 4; c.beginPath(); c.moveTo(8, -40); c.lineTo(8, -200); c.stroke(); } });
    plush(ctx, rrect(-11, -14, 22, 50, 9), P.brownD, { stitch: false, ow: 7 });
    plush(ctx, rrect(-50, -36, 100, 26, 13), P.mustard, { si: 5, dash: [5, 4], slw: 2 });
    button(ctx, 0, 44, 14, P.rust);
    ctx.restore();
    // near arm + mitten
    plush(ctx, smooth([[196, 340], [214, 360], [186, 420], [160, 410], [176, 356]], 10), C.heroBlue, { stitch: false });
    mitten(ctx, 156, 422, P.skin);
    // plume
    const plume = smooth([[300, 118], [296, 62], [262, 22], [208, 6], [146, 18], [180, 36], [194, 62], [204, 92], [210, 122]], 12);
    plush(ctx, plume, C.plume, { si: 10, lx: 0.4, ly: 0.2, thread: dk(C.plume, 0.4), inner(c) {
      c.strokeStyle = al(dk(C.plume, 0.35), 0.55); c.lineWidth = 3; c.lineCap = 'round';
      for (const [x0, y0, x1, y1, cx, cy] of [[250, 112, 182, 30, 230, 50], [266, 110, 230, 34, 262, 62]]) { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); c.stroke(); }
    } });
    // helmet
    const helm = ell(254, 218, 130, 118);
    plush(ctx, helm, C.steel, { thread: C.steelT, ow: 10 });
    ctx.save(); trace(ctx, helm); ctx.clip();
    plush(ctx, smooth([[256, 92], [278, 96], [288, 170], [284, 190], [254, 192], [242, 170], [242, 98]], 10), P.mustard, { si: 6, dash: [5, 4], slw: 2, cast: false, ow: 5 });
    ctx.restore();
    button(ctx, 150, 250, 15, P.mustard);
    // face opening
    const fo = smooth([[204, 200], [266, 188], [332, 200], [352, 250], [326, 300], [266, 312], [208, 300], [186, 250]]);
    plush(ctx, fo, P.skin, { stitch: false, ow: 8, lx: 0.35, ly: 0.3 });
    stitch(ctx, inset(fo, -13), C.steelT, { lw: 3, dash: [8, 6] });
    face(ctx, 269, 248);
    // shield (front, viewer-right)
    plush(ctx, ell(356, 406, 78, 78, 128), P.mustard, { si: 7, ow: 10 });
    plush(ctx, ell(356, 406, 59, 59, 128), C.plume, { ow: 5, cast: false, thread: P.thread, si: 9 });
    stitch(ctx, [[356, 358], [356, 454]], P.thread, { closed: false, lw: 3.6, dash: [8, 6] });
    stitch(ctx, [[308, 406], [404, 406]], P.thread, { closed: false, lw: 3.6, dash: [8, 6] });
    button(ctx, 356, 406, 18, P.cream);
    ctx.restore();
  }

  // =================== ELF RANGER ===================
  function elf(ctx, size) {
    begin(ctx, size);
    // quiver on back (peeks over right shoulder)
    ctx.save(); ctx.translate(330, 250); ctx.rotate(0.42);
    for (const [x, col] of [[-12, P.rust], [6, P.cream], [22, P.rust]]) {
      plush(ctx, band([[x, -20], [x, -150]], 7), C.woodL, { stitch: false, fuzz: false, ow: 4 });
      plush(ctx, smooth([[x, -138], [x + 14, -150], [x + 14, -184], [x, -170], [x - 14, -184], [x - 14, -150]], 6), col, { stitch: false, fuzz: false, ow: 4 });
    }
    plush(ctx, rrect(-34, -120, 68, 200, 22), P.brown, { thread: P.mustard, si: 8 });
    plush(ctx, rrect(-38, -128, 76, 22, 10), P.brownD, { stitch: false, ow: 6 });
    ctx.restore();
    // cloak (behind body)
    plush(ctx, smooth([[190, 312], [322, 312], [356, 410], [358, 482], [256, 494], [154, 482], [156, 410]]), C.elfGreenD, { si: 9 });
    boots(ctx, P.brown, { cuff: P.brownD });
    // tunic
    plush(ctx, smooth(BODY), C.elfGreen, { thread: lt(C.elfGreen, 0.5) });
    // strap across chest + belt
    plush(ctx, band([[214, 330], [300, 440]], 18), P.brownD, { stitch: false, ow: 5, cast: false });
    plush(ctx, smooth([[180, 418], [256, 428], [332, 418], [333, 442], [256, 452], [179, 442]], 10), P.brown, { si: 6, dash: [5, 4], slw: 2, thread: P.mustard });
    button(ctx, 256, 440, 12, P.mustard);
    // bow (viewer-left)
    const bow = band([[170, 226], [118, 284], [96, 366], [118, 448], [170, 500]], 22, 22);
    plush(ctx, bow, C.woodL, { si: 5, dash: [5, 4], slw: 2, thread: P.mustard, ow: 9 });
    ctx.save(); ctx.strokeStyle = P.thread; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; shadowOn(ctx, 'rgba(40,20,20,0.35)', 3, 1, 2);
    ctx.beginPath(); ctx.moveTo(170, 232); ctx.lineTo(172, 494); ctx.stroke(); ctx.restore();
    plush(ctx, rrect(90, 348, 34, 40, 9), P.rust, { stitch: false, ow: 5 });
    // near arm holding bow
    plush(ctx, smooth([[196, 340], [214, 360], [150, 386], [128, 370], [176, 352]], 10), C.elfGreen, { stitch: false });
    mitten(ctx, 116, 370, P.skin, 22);
    // hood (back + point)
    const hood = smooth([[150, 300], [124, 230], [138, 160], [176, 110], [214, 62], [190, 18], [252, 46], [310, 86], [362, 140], [384, 226], [366, 300], [300, 336], [210, 336]], 12);
    plush(ctx, hood, C.elfGreen, { si: 11, lx: 0.4, ly: 0.2 });
    // ears poking out of the hood
    const earL = smooth([[170, 238], [116, 214], [62, 176], [94, 250], [164, 278]], 12);
    const earR = smooth([[356, 236], [410, 212], [462, 176], [432, 250], [362, 276]], 12);
    plush(ctx, earL, P.skin, { si: 7 }); plush(ctx, earR, P.skin, { si: 7 });
    plush(ctx, smooth([[154, 244], [110, 222], [84, 198], [102, 240], [150, 262]], 10), mix(P.blush, P.skin, 0.4), { outline: false, stitch: false, fuzz: false });
    plush(ctx, smooth([[372, 244], [416, 222], [442, 198], [424, 240], [376, 262]], 10), mix(P.blush, P.skin, 0.4), { outline: false, stitch: false, fuzz: false });
    // face
    const fo = smooth([[200, 196], [268, 176], [336, 196], [356, 252], [330, 306], [268, 320], [206, 306], [182, 252]]);
    plush(ctx, fo, P.skin, { stitch: false, ow: 8, lx: 0.35, ly: 0.3 });
    // fringe
    plush(ctx, smooth([[196, 206], [228, 176], [276, 170], [332, 186], [346, 214], [314, 206], [296, 222], [270, 204], [240, 222], [222, 206]], 8), P.mustard, { stitch: false, ow: 5, cast: true, si: 5 });
    stitch(ctx, inset(fo, -14), lt(C.elfGreen, 0.5), { lw: 3, dash: [8, 6] });
    face(ctx, 269, 254);
    ctx.restore();
  }

  // =================== MAGE ===================
  function mage(ctx, size) {
    begin(ctx, size);
    boots(ctx, P.brown, { dx: 2 });
    // robe (long, flared)
    const robe = smooth([[206, 318], [256, 308], [306, 318], [338, 400], [354, 470], [256, 486], [158, 470], [174, 400]]);
    plush(ctx, robe, C.mageBlue, { thread: lt(C.mageBlue, 0.5), inner(c) {
      // mustard hem trim
      c.save(); shadowOn(c, 'rgba(30,20,40,0.45)', 6, 2, -3); c.fillStyle = P.mustard; trace(c, smooth([[150, 446], [256, 462], [362, 446], [370, 500], [140, 500]], 8)); c.fill(); shadowOff(c); c.restore();
      stitch(c, [[160, 458], [256, 474], [352, 458]], P.thread, { closed: false, lw: 2.2, dash: [5, 4] });
      // front opening seam
      stitch(c, [[264, 320], [268, 400], [270, 450]], P.mustard, { closed: false, lw: 3, dash: [8, 6] });
    } });
    button(ctx, 268, 360, 9, P.mustard); button(ctx, 269, 400, 9, P.mustard);
    // staff (viewer-left)
    plush(ctx, band([[150, 500], [146, 330], [140, 170]], 20, 18), C.wood, { si: 5, dash: [5, 4], slw: 2, thread: P.mustard });
    // gem cradle + glowing gem
    plush(ctx, smooth([[112, 172], [140, 186], [168, 172], [160, 196], [140, 206], [120, 196]], 8), P.brownD, { stitch: false, ow: 6 });
    glowAt(ctx, 140, 138, 78, lt(P.rust, 0.3), 0.7);
    plush(ctx, smooth([[140, 92], [170, 128], [160, 172], [140, 182], [120, 172], [110, 128]], 8), '#e26a4a', { si: 6, dash: [4, 3], slw: 1.8, thread: lt(P.rust, 0.6), ow: 7,
      inner(c) { c.fillStyle = 'rgba(255,246,220,0.7)'; c.beginPath(); c.ellipse(128, 120, 8, 14, -0.4, 0, 7); c.fill(); } });
    // near arm (sleeve) + mitten on staff
    plush(ctx, smooth([[196, 336], [218, 358], [176, 412], [150, 398], [174, 350]], 10), C.mageBlue, { stitch: false });
    plush(ctx, ell(166, 404, 22, 18, 48, -0.6), P.mustard, { stitch: false, ow: 5 });
    mitten(ctx, 148, 402, P.skin, 22);
    // head
    const head = ell(256, 238, 124, 104);
    plush(ctx, head, P.skin, { stitch: false, lx: 0.35, ly: 0.35 });
    // hair tufts at sides
    plush(ctx, smooth([[136, 208], [160, 196], [170, 236], [150, 262], [132, 240]], 8), P.cream, { stitch: false, ow: 6 });
    plush(ctx, smooth([[376, 208], [352, 196], [342, 236], [362, 262], [380, 240]], 8), P.cream, { stitch: false, ow: 6 });
    face(ctx, 268, 256);
    // hat cone (floppy tip to the right)
    const cone = smooth([[154, 176], [190, 120], [218, 70], [252, 26], [300, 4], [350, 14], [384, 46], [392, 88], [374, 82], [350, 52], [318, 44], [296, 70], [300, 120], [336, 172]], 12);
    plush(ctx, cone, C.mageBlue, { si: 11, lx: 0.3, ly: 0.2, thread: lt(C.mageBlue, 0.5) });
    plush(ctx, star(244, 118, 30, -1.5), P.mustard, { si: 6, dash: [4, 3], slw: 1.8, ow: 6, thread: dk(P.mustard, 0.4) });
    plush(ctx, star(318, 30, 13, -1.2), P.mustard, { stitch: false, ow: 4, fuzz: false });
    button(ctx, 386, 90, 13, P.mustard);
    // brim
    plush(ctx, smooth([[118, 178], [180, 156], [256, 150], [334, 156], [396, 178], [376, 200], [256, 192], [138, 200]], 10), C.mageBlueD, { si: 7, thread: lt(C.mageBlue, 0.45), lx: 0.4, ly: 0.2 });
    ctx.restore();
  }

  // =================== VILLAGER (quest giver) ===================
  function npc(ctx, size) {
    begin(ctx, size);
    boots(ctx, P.brownD, { dx: 2 });
    // dress
    const dress = smooth([[204, 316], [256, 306], [308, 316], [340, 400], [352, 470], [256, 486], [160, 470], [172, 400]]);
    plush(ctx, dress, C.dress, { thread: lt(C.dress, 0.55) });
    // apron
    plush(ctx, smooth([[210, 350], [300, 350], [316, 420], [318, 470], [256, 480], [194, 470], [196, 420]]), P.cream, { thread: P.rust, si: 9, inner(c) {
      c.fillStyle = al(P.rust, 0.9); trace(c, smooth([[256, 404], [268, 392], [282, 400], [256, 432], [230, 400], [244, 392]], 6)); c.fill(); } });
    plush(ctx, smooth([[184, 340], [256, 348], [328, 340], [328, 358], [256, 366], [184, 358]], 8), P.cream, { stitch: false, ow: 5 });
    // far arm
    plush(ctx, smooth([[200, 338], [220, 356], [186, 416], [162, 404], [180, 350]], 10), C.dress, { stitch: false });
    mitten(ctx, 168, 414, P.skin, 22);
    // basket (viewer-right) — handle behind arm
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = outlineCol(C.woodL); ctx.lineWidth = 20; shadowOn(ctx, 'rgba(52,32,28,0.32)', 10, 3, 5);
    ctx.beginPath(); ctx.moveTo(296, 404); ctx.quadraticCurveTo(352, 276, 412, 404); ctx.stroke(); shadowOff(ctx);
    ctx.strokeStyle = C.woodL; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(296, 404); ctx.quadraticCurveTo(352, 276, 412, 404); ctx.stroke(); ctx.restore();
    // apples
    for (const [x, y] of [[318, 386], [386, 384], [352, 368]]) {
      plush(ctx, ell(x, y, 25, 23, 48), '#d0533a', { stitch: false, ow: 6 });
      plush(ctx, ell(x + 10, y - 22, 10, 5, 24, -0.5), P.sageD, { stitch: false, ow: 3, fuzz: false, cast: false });
    }
    plush(ctx, smooth([[284, 404], [420, 404], [410, 460], [394, 478], [310, 478], [294, 460]], 8), C.woodL, { thread: P.cream, si: 7, inner(c) {
      c.strokeStyle = 'rgba(80,40,20,0.35)'; c.lineWidth = 3; for (let y = 420; y < 480; y += 14) { c.beginPath(); c.moveTo(280, y); c.lineTo(424, y); c.stroke(); }
      for (let x = 296; x < 424; x += 18) { c.beginPath(); c.moveTo(x, 404); c.lineTo(x + 2, 480); c.stroke(); } } });
    // near arm hooking basket
    plush(ctx, smooth([[300, 338], [322, 350], [336, 400], [314, 410], [292, 360]], 10), C.dress, { stitch: false });
    mitten(ctx, 322, 408, P.skin, 21);
    // hair behind head
    plush(ctx, smooth([[140, 230], [150, 170], [256, 130], [362, 170], [372, 230], [366, 300], [146, 300]], 10), C.hair, { stitch: false });
    // head
    plush(ctx, ell(256, 240, 118, 100), P.skin, { stitch: false, lx: 0.35, ly: 0.35 });
    plush(ctx, smooth([[150, 200], [210, 190], [262, 196], [226, 216], [168, 228]], 8), C.hair, { stitch: false, ow: 5 });
    face(ctx, 268, 258);
    // headscarf with knot tails (viewer-left)
    plush(ctx, smooth([[150, 150], [124, 118], [100, 150], [118, 176]], 8), '#d0533a', { stitch: false, ow: 7 });
    plush(ctx, smooth([[136, 150], [96, 166], [92, 198], [132, 178]], 8), '#d0533a', { stitch: false, ow: 7 });
    const scarf = smooth([[136, 220], [134, 160], [172, 116], [256, 98], [340, 116], [378, 160], [376, 220], [346, 206], [300, 192], [256, 190], [210, 194], [166, 206]], 10);
    plush(ctx, scarf, '#d0533a', { si: 9, thread: lt(P.rust, 0.6), inner(c) {
      c.fillStyle = al(P.cream, 0.92); for (const [x, y] of [[190, 140], [244, 122], [300, 130], [348, 158], [222, 172], [282, 162], [160, 182], [330, 186]]) { c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill(); } } });
    button(ctx, 136, 162, 11, P.mustard);
    ctx.restore();
  }

  // =================== BANDIT ===================
  function bandit(ctx, size) {
    begin(ctx, size);
    // short cloak
    plush(ctx, smooth([[190, 312], [322, 312], [350, 404], [346, 470], [256, 482], [166, 470], [162, 404]]), dk(C.hood, 0.25), { si: 9 });
    boots(ctx, P.brownD, { cuff: dk(C.hood, 0.1) });
    // leather vest body
    plush(ctx, smooth(BODY), P.brown, { thread: P.mustard });
    plush(ctx, smooth([[180, 412], [256, 422], [332, 412], [333, 438], [256, 448], [179, 438]], 10), P.brownD, { si: 6, dash: [5, 4], slw: 2, thread: P.mustard });
    button(ctx, 214, 428, 12, P.mustard);
    // coin pouch
    plush(ctx, smooth([[204, 446], [236, 446], [244, 474], [220, 484], [198, 474]], 8), P.mustard, { stitch: false, ow: 5 });
    // far arm
    plush(ctx, smooth([[200, 338], [220, 356], [186, 416], [162, 404], [180, 350]], 10), dk(C.hood, 0.1), { stitch: false });
    mitten(ctx, 168, 414, P.brownD, 22);
    // hood (pointed)
    const hood = smooth([[140, 300], [124, 222], [146, 150], [198, 96], [258, 52], [300, 34], [310, 70], [350, 120], [384, 204], [372, 296], [300, 334], [210, 334]], 12);
    plush(ctx, hood, C.hood, { si: 11, lx: 0.4, ly: 0.2, thread: lt(C.hood, 0.35) });
    // face opening with shadow
    const fo = smooth([[194, 200], [266, 180], [338, 200], [356, 256], [330, 310], [266, 322], [204, 310], [178, 256]]);
    plush(ctx, fo, P.skin, { stitch: false, ow: 8, lx: 0.35, ly: 0.2 });
    ctx.save(); trace(ctx, fo); ctx.clip(); const g = ctx.createLinearGradient(0, 180, 0, 240); g.addColorStop(0, 'rgba(60,30,30,0.45)'); g.addColorStop(1, 'rgba(60,30,30,0)'); ctx.fillStyle = g; ctx.fillRect(150, 170, 230, 80); ctx.restore();
    // angry brows + eyes
    plush(ctx, smooth([[204, 216], [252, 230], [250, 242], [204, 230]], 6), P.brownD, { stitch: false, ow: 4, cast: false, fuzz: false });
    plush(ctx, smooth([[334, 216], [286, 230], [288, 242], [334, 230]], 6), P.brownD, { stitch: false, ow: 4, cast: false, fuzz: false });
    safetyEye(ctx, 236, 254, 16); safetyEye(ctx, 302, 254, 16);
    // mask over mouth
    const mask = smooth([[174, 270], [266, 280], [360, 268], [352, 300], [306, 330], [268, 352], [228, 330], [184, 300]], 10);
    plush(ctx, mask, C.mask, { si: 7, thread: dk(C.mask, 0.45), inner(c) { c.strokeStyle = al(dk(C.mask, 0.4), 0.45); c.lineWidth = 3; c.lineCap = 'round';
      for (const [y, w] of [[300, 70], [320, 40]]) { c.beginPath(); c.moveTo(268 - w, y - 4); c.quadraticCurveTo(268, y + 6, 268 + w, y - 4); c.stroke(); }
      c.fillStyle = al(P.cream, 0.9); for (const [x, y] of [[220, 292], [300, 290], [262, 318], [330, 282], [196, 282]]) { c.beginPath(); c.arc(x, y, 4.5, 0, 7); c.fill(); } } });
    // mask knot tails
    plush(ctx, smooth([[150, 272], [118, 268], [104, 296], [128, 300], [152, 290]], 8), C.mask, { stitch: false, ow: 6 });
    // dagger (viewer-right hand, pointing up-out)
    ctx.save(); ctx.translate(352, 410); ctx.rotate(0.45);
    plush(ctx, smooth([[-13, -20], [-14, -96], [0, -134], [14, -96], [13, -20]], 8), C.blade, { si: 5, dash: [4, 3], slw: 1.8, thread: '#7f8b96', ow: 9,
      inner(c) { c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(-4, -30); c.lineTo(-4, -100); c.stroke(); } });
    plush(ctx, rrect(-34, -28, 68, 18, 9), P.mustard, { stitch: false, ow: 6 });
    plush(ctx, rrect(-9, -12, 18, 40, 8), P.brownD, { stitch: false, ow: 6 });
    ctx.restore();
    plush(ctx, smooth([[300, 338], [322, 350], [356, 400], [336, 418], [292, 366]], 10), dk(C.hood, 0.1), { stitch: false });
    mitten(ctx, 350, 412, P.brownD, 22);
    ctx.restore();
  }

  // =================== WARLOCK ===================
  function warlock(ctx, size) {
    begin(ctx, size);
    // robe
    const robe = smooth([[200, 312], [256, 302], [312, 312], [344, 400], [360, 476], [300, 492], [256, 486], [212, 494], [152, 476], [168, 400]]);
    plush(ctx, robe, C.purple, { thread: C.purpleL, inner(c) {
      c.save(); shadowOn(c, 'rgba(30,10,40,0.45)', 6, 2, -3); c.fillStyle = C.purpleD; trace(c, smooth([[140, 452], [256, 468], [372, 452], [372, 504], [140, 504]], 8)); c.fill(); shadowOff(c); c.restore();
      stitch(c, [[152, 464], [256, 480], [360, 464]], P.mustard, { closed: false, lw: 2.4, dash: [5, 4] });
    } });
    plush(ctx, smooth([[200, 346], [256, 360], [312, 346], [308, 368], [256, 380], [204, 368]], 8), P.mustard, { stitch: false, ow: 5 });
    plush(ctx, ell(256, 372, 15, 15, 40), P.cream, { stitch: false, ow: 5 }); // little skull clasp
    safetyEye(ctx, 251, 371, 3.5); safetyEye(ctx, 262, 371, 3.5);
    // near arm sleeve + pale mitten on staff
    // hood (tall point drooping back)
    const hood = smooth([[136, 300], [124, 222], [148, 146], [196, 96], [236, 56], [252, 10], [296, 40], [332, 96], [376, 150], [394, 226], [376, 300], [300, 340], [210, 340]], 12);
    plush(ctx, hood, C.purple, { si: 11, lx: 0.4, ly: 0.2, thread: C.purpleL });
    // dark shadowed face opening
    const fo = smooth([[194, 206], [266, 186], [338, 206], [356, 260], [330, 312], [266, 326], [204, 312], [178, 260]]);
    plush(ctx, fo, '#2e2134', { stitch: false, ow: 8, lx: 0.5, ly: 0.8 });
    stitch(ctx, inset(fo, -14), C.purpleL, { lw: 3, dash: [8, 6] });
    // glowing eyes
    for (const x of [234, 304]) {
      glowAt(ctx, x, 258, 40, C.glow, 0.55);
      plush(ctx, smooth([[x - 22, 254], [x, 242], [x + 22, 254], [x, 268]], 6), C.glow, { outline: false, stitch: false, fuzz: false, lx: 0.4, ly: 0.3 });
      ctx.save(); ctx.fillStyle = 'rgba(255,255,240,0.95)'; ctx.beginPath(); ctx.ellipse(x - 5, 252, 5, 3.5, -0.3, 0, 7); ctx.fill(); ctx.restore();
    }
    // skull staff (viewer-left)
    plush(ctx, band([[118, 500], [106, 330], [96, 196]], 20, 18), P.brownD, { si: 5, dash: [5, 4], slw: 2, thread: P.mustard });
    glowAt(ctx, 94, 126, 90, '#b98be0', 0.6);
    // skull
    plush(ctx, smooth([[94, 68], [134, 78], [148, 118], [136, 154], [118, 162], [116, 180], [72, 180], [70, 162], [52, 154], [40, 118], [54, 78]], 10), C.bone, { si: 6, dash: [-48, -11], slw: 1.8, thread: C.boneD, ow: 8 });
    plush(ctx, ell(76, 126, 15, 16, 32), '#3a2536', { stitch: false, ow: 2.5, cast: false, fuzz: false });
    plush(ctx, ell(114, 126, 15, 16, 32), '#3a2536', { stitch: false, ow: 2.5, cast: false, fuzz: false });
    glowAt(ctx, 76, 128, 14, '#d8a8ff', 0.9); glowAt(ctx, 114, 128, 14, '#d8a8ff', 0.9);
    plush(ctx, smooth([[94, 140], [102, 154], [86, 154]], 4), '#3a2536', { stitch: false, ow: 2, cast: false, fuzz: false });
    ctx.save(); ctx.strokeStyle = al(C.boneD, 1); ctx.lineWidth = 2.5; for (const x of [82, 94, 106]) { ctx.beginPath(); ctx.moveTo(x, 164); ctx.lineTo(x, 178); ctx.stroke(); } ctx.restore();
    plush(ctx, smooth([[176, 330], [196, 348], [130, 400], [110, 384], [156, 342]], 10), C.purple, { stitch: false });
    mitten(ctx, 112, 396, '#cfc3d0', 22);
    // wicked little grin (thread)
    thread(ctx, [[248, 292], [258, 298], [270, 294], [282, 298], [292, 292]], '#a77cc6', 3.5);
    ctx.restore();
  }

  // =================== FALLEN KNIGHT ===================
  function fallenKnight(ctx, size) {
    begin(ctx, size);
    // tattered cape
    const cape = [[190, 314], [322, 314], [356, 400], [366, 470]];
    const jag = [[366, 470], [338, 500], [320, 474], [296, 504], [272, 476], [248, 502], [226, 474], [200, 500], [180, 472], [150, 496], [148, 470]];
    plush(ctx, smooth(cape.concat(jag.slice(1), [[156, 400]]), 6), C.purpleD, { si: 9, thread: C.purple });
    boots(ctx, C.armourD, { cuff: C.purple, dx: 4 });
    // armour body
    plush(ctx, smooth(BODY), C.armour, { thread: C.purpleL, inner(c) {
      c.strokeStyle = al(dk(C.armour, 0.5), 0.6); c.lineWidth = 4; for (const y of [360, 392]) { c.beginPath(); c.moveTo(176, y); c.quadraticCurveTo(256, y + 14, 336, y); c.stroke(); } } });
    plush(ctx, smooth([[180, 416], [256, 426], [332, 416], [333, 442], [256, 452], [179, 442]], 10), C.purple, { si: 6, dash: [5, 4], slw: 2, thread: C.purpleL });
    button(ctx, 256, 438, 13, P.silver);
    // pauldron near-left
    plush(ctx, ell(188, 336, 40, 30, 64, -0.3), C.armour, { si: 6, thread: C.purpleL });
    // broken sword (viewer-right)
    ctx.save(); ctx.translate(354, 424); ctx.rotate(0.42);
    plush(ctx, smooth([[-21, -30], [-22, -160], [-10, -182], [0, -166], [10, -196], [22, -172], [21, -30]], 6), '#c9d1d7', { si: 6, thread: '#6f7882', dash: [5, 4], slw: 2, ow: 10,
      inner(c) { c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(-8, -40); c.lineTo(-8, -156); c.stroke(); } });
    plush(ctx, rrect(-10, -14, 20, 48, 8), '#3a2536', { stitch: false, ow: 7 });
    plush(ctx, smooth([[-52, -36], [0, -28], [52, -36], [44, -12], [0, -8], [-44, -12]], 8), C.purple, { si: 5, dash: [4, 3], slw: 1.8, thread: C.purpleL });
    button(ctx, 0, 42, 12, C.purple);
    ctx.restore();
    plush(ctx, smooth([[302, 338], [322, 348], [358, 404], [338, 420], [292, 366]], 10), C.armour, { stitch: false });
    mitten(ctx, 352, 418, C.armourD, 24);
    // far arm
    plush(ctx, smooth([[200, 344], [218, 362], [186, 420], [160, 410], [178, 356]], 10), C.armour, { stitch: false });
    mitten(ctx, 166, 420, C.armourD, 24);
    // tattered plume
    plush(ctx, smooth([[298, 118], [296, 62], [266, 24], [214, 8], [150, 20], [184, 36], [166, 52], [194, 62], [186, 84], [206, 96], [210, 122]], 10), C.purple, { si: 9, thread: C.purpleL, lx: 0.4, ly: 0.2 });
    // horns
    plush(ctx, smooth([[150, 176], [110, 140], [100, 88], [124, 120], [170, 150]], 10), P.creamD, { si: 5, dash: [4, 3], slw: 1.8, ow: 8 });
    plush(ctx, smooth([[358, 176], [398, 140], [412, 88], [384, 120], [340, 150]], 10), P.creamD, { si: 5, dash: [4, 3], slw: 1.8, ow: 8 });
    // helmet
    const helm = ell(254, 220, 130, 118);
    plush(ctx, helm, C.armour, { thread: C.purpleL, ow: 10 });
    ctx.save(); trace(ctx, helm); ctx.clip();
    plush(ctx, smooth([[256, 92], [278, 96], [288, 170], [284, 182], [254, 184], [242, 170], [242, 98]], 10), C.purple, { si: 6, dash: [5, 4], slw: 2, cast: false, ow: 5, thread: C.purpleL });
    ctx.restore();
    button(ctx, 150, 252, 14, C.purple);
    // visor: dark slot with glowing eyes
    const vis = smooth([[196, 222], [268, 206], [340, 222], [350, 262], [328, 292], [268, 302], [208, 292], [186, 262]]);
    plush(ctx, vis, '#241a26', { stitch: false, ow: 8, lx: 0.5, ly: 0.8 });
    stitch(ctx, inset(vis, -13), C.purpleL, { lw: 3, dash: [8, 6] });
    for (const x of [234, 302]) {
      glowAt(ctx, x, 256, 36, '#e070c8', 0.6);
      plush(ctx, ell(x, 256, 15, 13, 32), '#f2a0dc', { outline: false, stitch: false, fuzz: false });
      ctx.save(); ctx.fillStyle = 'rgba(255,250,250,0.95)'; ctx.beginPath(); ctx.ellipse(x - 5, 251, 5, 3.5, -0.3, 0, 7); ctx.fill(); ctx.restore();
    }
    // angry felt brow ridge
    plush(ctx, smooth([[200, 222], [254, 236], [252, 246], [202, 234]], 6), C.armourD, { stitch: false, ow: 4, cast: false, fuzz: false });
    plush(ctx, smooth([[336, 222], [282, 236], [284, 246], [334, 234]], 6), C.armourD, { stitch: false, ow: 4, cast: false, fuzz: false });
    // stitched crack
    thread(ctx, [[322, 140], [338, 160], [326, 176], [344, 196]], C.purpleL, 3);
    ctx.restore();
  }

  // =================== SKELETON ===================
  function skeleton(ctx, size) {
    begin(ctx, size);
    const B = C.bone, BD = C.boneD, hole = '#4a3240';
    const joint = (x, y, r = 11) => { plush(ctx, ell(x, y, r, r, 32), B, { stitch: false, ow: 5, fuzz: false });
      ctx.save(); ctx.strokeStyle = P.rustD; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - r * 0.45, y - r * 0.45); ctx.lineTo(x + r * 0.45, y + r * 0.45); ctx.moveTo(x + r * 0.45, y - r * 0.45); ctx.lineTo(x - r * 0.45, y + r * 0.45); ctx.stroke(); ctx.restore(); };
    // legs
    plush(ctx, band([[226, 420], [218, 470]], 18), B, { stitch: false, ow: 7 });
    plush(ctx, band([[288, 420], [296, 470]], 18), B, { stitch: false, ow: 7 });
    plush(ctx, smooth([[182, 470], [234, 464], [246, 488], [240, 504], [180, 504], [172, 488]]), B, { si: 6, thread: BD });
    plush(ctx, smooth([[276, 464], [326, 470], [340, 488], [334, 504], [272, 504], [268, 488]]), B, { si: 6, thread: BD });
    joint(222, 452); joint(292, 452);
    // pelvis
    plush(ctx, smooth([[204, 404], [256, 396], [308, 404], [312, 430], [278, 440], [256, 428], [234, 440], [200, 430]], 8), B, { si: 6, thread: BD });
    // spine
    for (const y of [396, 382]) plush(ctx, rrect(244, y - 7, 24, 14, 6), B, { stitch: false, ow: 4, fuzz: false });
    // ribcage
    const rib = smooth([[204, 320], [256, 308], [308, 320], [326, 350], [304, 378], [256, 384], [208, 378], [186, 350]]);
    plush(ctx, rib, B, { thread: BD, si: 8, inner(c) {
      c.fillStyle = al(hole, 0.85); for (const [y, w] of [[336, 52], [356, 48]]) { for (const s of [-1, 1]) { c.beginPath(); c.ellipse(256 + s * 34, y, w * 0.42, 5.5, s * 0.12, 0, 7); c.fill(); } }
      c.fillStyle = al(BD, 1); c.fillRect(250, 312, 12, 70); } });
    // shield arm (viewer-right): round wooden shield
    plush(ctx, ell(360, 404, 76, 76, 128), P.mustard, { si: 7, ow: 10, thread: P.mustardD });
    plush(ctx, ell(360, 404, 60, 60, 128), C.wood, { ow: 5, cast: false, thread: P.cream, si: 8, inner(c) {
      c.strokeStyle = 'rgba(60,30,15,0.4)'; c.lineWidth = 3.5; for (const x of [330, 360, 390]) { c.beginPath(); c.moveTo(x, 340); c.lineTo(x, 470); c.stroke(); } } });
    button(ctx, 360, 404, 17, P.silver);
    // sword arm (viewer-left)
    ctx.save(); ctx.translate(152, 420); ctx.rotate(-0.5);
    plush(ctx, smooth([[-17, -30], [-18, -160], [-10, -206], [0, -228], [10, -206], [18, -160], [17, -30]], 10), '#c4ccd2', { si: 7, thread: '#7f8b96', dash: [6, 5], slw: 2.2, ow: 10,
      inner(c) { c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(-6, -40); c.lineTo(-6, -190); c.stroke();
        c.fillStyle = 'rgba(150,90,60,0.35)'; c.beginPath(); c.arc(6, -120, 6, 0, 7); c.arc(-4, -150, 4, 0, 7); c.fill(); } });
    plush(ctx, rrect(-10, -14, 20, 46, 8), P.brownD, { stitch: false, ow: 7 });
    plush(ctx, rrect(-42, -34, 84, 22, 11), P.brown, { si: 5, dash: [4, 3], slw: 1.8, thread: P.mustard });
    ctx.restore();
    plush(ctx, band([[206, 334], [180, 376], [160, 410]], 16), B, { stitch: false, ow: 7 });
    joint(186, 368, 10);
    mitten(ctx, 156, 418, B, 22);
    plush(ctx, band([[306, 334], [330, 372], [344, 400]], 16), B, { stitch: false, ow: 7 });
    joint(326, 366, 10);
    // skull
    const sk = smooth([[256, 104], [340, 118], [382, 178], [378, 248], [348, 290], [322, 294], [316, 318], [256, 326], [196, 318], [190, 294], [164, 290], [134, 248], [130, 178], [172, 118]], 12);
    plush(ctx, sk, B, { thread: BD, lx: 0.32, ly: 0.25 });
    // eye sockets + safety eyes
    for (const x of [228, 308]) { plush(ctx, ell(x, 228, 34, 32, 48), hole, { stitch: false, ow: 3, cast: false, fuzz: false, lx: 0.6, ly: 0.7 }); safetyEye(ctx, x + 4, 232, 15); }
    plush(ctx, smooth([[268, 258], [280, 278], [256, 278]], 4), hole, { stitch: false, ow: 2, cast: false, fuzz: false });
    // stitched teeth grin
    thread(ctx, [[222, 294], [268, 304], [314, 294]], C.mouth, 4);
    ctx.save(); ctx.strokeStyle = C.mouth; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const x of [236, 252, 268, 284, 300]) { const y = 294 + 10 * Math.sin((x - 222) / 92 * Math.PI) ; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8); ctx.stroke(); }
    ctx.restore();
    cheek(ctx, 178, 276, 12); cheek(ctx, 350, 276, 12);
    // crack stitch
    thread(ctx, [[194, 142], [208, 160], [198, 176], [212, 192]], BD, 3);
    ctx.restore();
  }

  window.SPRITES = Object.assign(window.SPRITES || {}, { knight, elf, mage, npc, bandit, warlock, 'fallen-knight': fallenKnight, skeleton });
})();
