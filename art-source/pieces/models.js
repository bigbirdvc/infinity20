// Board-game piece sprite set: every sprite is a few smooth, matte, painted shapes.
(function () {
  const { sphere, cylinder, box, prism, place, V } = window.T3;
  const REGIONS = {
    fresh:    { leaf: '#5f9e4f', leafD: '#4a8540', fruit: '#c94a3d', rock: '#b9b3a6', bark: '#8a5a3a', roof: '#c94a3d', crystal: '#7fc4e8', snow: false },
    dry:      { leaf: '#a3a052', leafD: '#878441', fruit: '#e0b24a', rock: '#c9a27a', bark: '#8a5a3a', roof: '#c77a3f', crystal: '#e0b24a', snow: false },
    cool:     { leaf: '#4f8c7c', leafD: '#3e7365', fruit: '#c94a3d', rock: '#b4bcc4', bark: '#7a5a46', roof: '#5f86b5', crystal: '#a6dcf2', snow: true },
    lush:     { leaf: '#46963f', leafD: '#367a31', fruit: '#e07a5a', rock: '#a9ad98', bark: '#7d533a', roof: '#c94a3d', crystal: '#8fe0b0', snow: false },
    desert:   { leaf: '#98a865', leafD: '#7d8b50', fruit: '#e0a050', rock: '#d6ad7a', bark: '#a0714a', roof: '#d39a52', crystal: '#f0c060', snow: false },
    volcanic: { leaf: '#5e4e54', leafD: '#45383e', fruit: '#e8743a', rock: '#6e6468', bark: '#5a4038', roof: '#a84a3a', crystal: '#ff8a4a', snow: false },
    twilight: { leaf: '#7470b8', leafD: '#5b5896', fruit: '#e7b6e0', rock: '#9b9fb8', bark: '#6a5070', roof: '#6d6fb0', crystal: '#c8a0ff', snow: false },
  };
  let region = 'fresh'; const R = k => REGIONS[region][k];
  const C = { blue: '#3f6fb5', red: '#c94a3d', green: '#4f9a52', teal: '#3f9a86', lime: '#8db54b', wood: '#d6b07c', cream: '#efe4cc', bone: '#ece3cc',
    grey: '#c9ccd1', steel: '#8e98a4', char: '#4a4b55', brown: '#8a5a3a', gold: '#e0b24a', purple: '#7a4f9a', plum: '#5e3b7a', pink: '#e98aa8',
    tan: '#c9a877', stone: '#b7b2a8', stoneD: '#8f8a82', orange: '#f08a3a', yellow: '#f6d35a', ink: '#2c2630', moss: '#6f9a6a', slate: '#7d8fa3' };
  const S = sphere(48, 32), Sf = sphere(8, 6), Cy = cylinder(56), B = box(), Pr = prism(), Cone = cylinder(48, 0, 1);
  const Q = Math.PI / 4, F = [.707, 0, .707], L = [-.707, 0, .707];
  const at = (f, l, y) => [F[0]*f + L[0]*l, y, F[2]*f + L[2]*l];
  const part = (mesh, col, o, extra = {}) => Object.assign({ mesh: place(mesh, o), col, gloss: .5, noOutline: true }, extra);
  const disc = (col, r, h, y, p = [0, 0, 0]) => part(Cy, col, { s: [r, h, r], t: [p[0], y, p[2]] });
  const taper = (col, r0, r1, h, y, p = [0, 0, 0]) => part(cylinder(56, r0, r1), col, { s: [1, h, 1], t: [p[0], y, p[2]] });
  const ball = (col, r, p, s, rr) => part(S, col, { s: s || [r, r, r], t: p, r: rr });
  const cone = (col, r, h, p, rr) => part(Cone, col, { s: [r, h, r], t: p, r: rr });
  const blk = (col, s, p, rr) => part(B, col, { s, t: p, r: rr || [0, Q, 0] });
  // rod from a to b
  function rod(col, a, b, r, mesh = Cy) { const d = V.sub(b, a), l = Math.hypot(...d), u = V.norm(d); return part(mesh, col, { s: [r, l, r], r: [Math.acos(u[1]), Math.atan2(u[0], u[2]), 0], t: a }); }
  const facing = [Math.PI / 2, Q, 0];   // turns a disc to face the camera
  // ---------- pawns ----------
  function pawn(col, o = {}) {
    const w = o.w || 1, h = o.h || 1, head = o.head || col;
    return [disc(o.base || col, .3 * w, .06, 0), taper(o.base || col, .27 * w, .3 * w, .03, .06), taper(o.body || col, .13 * w, .25 * w, .34 * h, .09),
      disc(o.collar || col, .2 * w, .04, .09 + .34 * h), ball(head, .18 * (o.hs || 1), [0, .13 + .34 * h + .18 * (o.hs || 1), 0])];
  }
  const headY = (h = 1, hs = 1) => .13 + .34 * h + .18 * hs;
  const eyes = (y, r = .18, col = C.ink) => [-1, 1].map(s => ball(col, .028, at(r * .9, s * r * .34, y + .01)));
  // ---------- heroes & people ----------
  function knight(col = C.blue, helm = C.grey, plume = C.red, dark) {
    const p = pawn(col), y = headY();
    p.push(part(S, helm, { s: [.195, .13, .195], t: [0, y + .05, 0] }), disc(helm, .21, .03, y + .01), part(cylinder(32, .02, .05), plume, { s: [1, .2, 1], t: [0, y + .16, 0] }), ball(plume, .055, [0, y + .37, 0]));
    p.push(part(Cy, dark ? C.purple : C.gold, { s: [.13, .035, .13], r: facing, t: at(.22, .14, .28) }), part(Cy, dark ? C.char : C.red, { s: [.1, .02, .1], r: facing, t: at(.245, .14, .28) }));
    if (dark) { for (const s of [-1, 1]) p.push(rod(C.bone, at(0, s * .12, y + .08), at(0, s * .24, y + .2), .03, Cone)); p.push(...eyes(y - .02, .2, '#ff6b9a')); }
    return p;
  }
  function elf() {
    const p = pawn(C.teal, { head: C.cream }), y = headY();
    p.push(part(S, C.teal, { s: [.2, .16, .2], t: at(-.03, 0, y + .04) }), cone(C.teal, .08, .16, at(-.08, 0, y + .14), [-.6, Q, 0]));   // hood
    for (const s of [-1, 1]) p.push(rod(C.cream, at(0, s * .14, y), at(-.02, s * .3, y + .1), .035, Cone));
    p.push(rod(C.brown, at(-.14, .1, .2), at(-.18, .16, .6), .05), ...[0, 1, 2].map(i => ball(C.red, .025, at(-.18, .12 + i * .03, .62))));          // quiver
    p.push(...eyes(y - .02));
    return p;
  }
  function mage() {
    const p = pawn(C.blue, { h: 1.15, head: C.cream }), y = headY(1.15);
    p.push(disc(C.plum, .26, .025, y + .05), cone(C.plum, .17, .42, [0, y + .07, 0], [-.15, Q, 0]), ball(C.yellow, .045, at(.11, 0, y + .17)));
    p.push(rod(C.brown, at(.1, -.26, 0), at(.1, -.26, .78), .025), ball('#7fd8ff', .07, at(.1, -.26, .82)));
    p.push(...eyes(y - .03));
    return p;
  }
  function npc() {
    const p = pawn(C.cream, { body: C.pink, head: C.cream }), y = headY();
    p.push(part(S, C.red, { s: [.195, .12, .195], t: [0, y + .07, 0] }), ball(C.red, .06, at(-.16, 0, y + .02)));
    p.push(disc(C.brown, .1, .09, .24, at(.18, -.16, 0)), ...[0, 1, 2].map(i => ball(C.red, .04, at(.18 + (i - 1) * .05, -.16, .35))));
    p.push(...eyes(y - .02));
    return p;
  }
  function hooded(body, hood, extra) {
    const p = pawn(body), y = headY();
    p.push(part(S, hood, { s: [.205, .2, .205], t: at(-.02, 0, y + .02) }), cone(hood, .13, .22, at(-.05, 0, y + .14), [-.35, Q, 0]));
    p.push(ball(C.ink, 0, at(.08, 0, y - .01), [.13, .12, .07], [0, Q, 0]));   // shadowed face opening
    return p;
  }
  function bandit() {
    const p = hooded(C.char, '#5b5a52'), y = headY();
    p.push(...eyes(y + .01, .2, '#f4e9c9'), blk(C.red, [.2, .05, .06], at(.17, 0, y - .07)));
    p.push(rod(C.steel, at(.2, -.18, .25), at(.32, -.24, .42), .02, Cone));
    return p;
  }
  function warlock() {
    const p = hooded(C.purple, C.plum), y = headY();
    p.push(...eyes(y, .2, '#ffe36a'));
    p.push(rod(C.brown, at(.1, .28, 0), at(.1, .28, .84), .025), ball(C.bone, .07, at(.1, .28, .88)));
    return p;
  }
  function skeleton() {
    const p = pawn(C.bone), y = headY();
    for (const yy of [.2, .27, .34]) p.push(disc('#d6ccb2', .2 - (yy - .2) * .6, .015, yy));
    p.push(...[-1, 1].map(s => ball(C.ink, .045, at(.15, s * .07, y + .01))), blk(C.ink, [.09, .018, .02], at(.17, 0, y - .08)));
    p.push(part(Cy, C.brown, { s: [.12, .03, .12], r: facing, t: at(.22, .14, .28) }), rod(C.steel, at(.16, -.22, .3), at(.2, -.26, .7), .022));
    return p;
  }
  // ---------- monsters ----------
  function goblin() {
    const p = pawn(C.lime, { body: C.purple }), y = headY();
    for (const s of [-1, 1]) { const d = V.norm([s * .7, .35, -s * .7]); p.push(part(Cone, C.lime, { s: [.06, .24, .06], r: [Math.acos(d[1]), Math.atan2(d[0], d[2]), 0], t: [s * .1, y + .02, -s * .1] })); }
    p.push(cone(C.brown, .045, .1, [0, y + .16, 0]), ...eyes(y));
    p.push(rod(C.wood, at(.16, -.24, .15), at(.16, -.3, .62), .045, cylinder(32, .6, 1)));
    return p;
  }
  function slime() { return [ball(C.pink, 0, [0, 0, 0], [.32, .3, .32]), disc(C.pink, .32, .02, 0), ball('#ffffff', 0, at(.05, .12, .2), [.06, .04, .06]), ...eyes(.13, .3)]; }
  function bat() {
    const p = [disc(C.plum, .12, .03, 0), rod(C.plum, [0, .02, 0], [0, .2, 0], .03), ball(C.purple, .17, [0, .36, 0])];
    for (const s of [-1, 1]) p.push(part(Pr, C.plum, { s: [.04, .32, .3], r: [0, Q, s * 1.9], t: at(0, s * .14, .4) }));
    for (const s of [-1, 1]) p.push(cone(C.purple, .04, .08, at(0, s * .08, .5)));
    p.push(...eyes(.38, .17, '#ffe36a'));
    return p;
  }
  function wolf() {
    return [ball(C.slate, 0, at(-.05, 0, .2), [.2, .22, .2]), disc(C.slate, .22, .05, 0, at(-.05, 0, 0)), ball(C.slate, .14, at(.08, 0, .48)),
      cone(C.slate, .06, .1, at(.22, 0, .44), [Math.PI / 2, Q, 0]), ball(C.cream, .05, at(.15, 0, .41)), ball(C.ink, .025, at(.32, 0, .45)),
      ...[-1, 1].map(s => cone(C.slate, .05, .12, at(.05, s * .08, .58))), cone(C.cream, .07, .26, at(-.25, .1, .1), [0.9, -Q, 0]), ...eyes(.51, .15)];
  }
  function spider() {
    const p = [ball(C.purple, 0, [0, .2, 0], [.24, .2, .24]), ball(C.plum, .12, at(.18, 0, .2))];
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
      const a = (i - 1.5) * .45, dir = [Math.cos(a) * F[0] + s * Math.sin(Math.PI / 2) * L[0] * Math.cos(a), 0, 0];
      const out = at(Math.sin(a) * .1 + (i - 1.5) * .08, s * .2, .22), knee = at((i - 1.5) * .14, s * .38, .3), foot = at((i - 1.5) * .17, s * .44, 0);
      p.push(rod(C.plum, out, knee, .025), rod(C.plum, knee, foot, .022));
    }
    p.push(...[-1, 1].map(s => ball('#ffe36a', .03, at(.28, s * .05, .24))));
    return p;
  }
  function wraith() { return [cone('#cfe0f2', .26, .55, [0, 0, 0]), disc('#cfe0f2', .26, .02, 0), ball('#e4eefa', .18, [0, .55, 0]), ...[-1, 1].map(s => ball('#2c3c5c', .04, at(.16, s * .07, .56)))]; }
  function drake() {
    const p = [disc(C.red, .2, .05, 0), ball(C.red, 0, [0, .2, 0], [.2, .22, .2]), ball(C.cream, 0, at(.08, 0, .2), [.12, .15, .06], [0, Q, 0]), ball(C.red, .14, at(.06, 0, .5))];
    p.push(cone(C.red, .08, .14, at(.18, 0, .48), [Math.PI / 2, Q, 0]));
    for (const s of [-1, 1]) p.push(part(Pr, C.orange, { s: [.03, .24, .22], r: [0, Q, s * 1.3], t: at(-.08, s * .16, .34) }), cone(C.cream, .03, .1, at(0, s * .07, .62)));
    p.push(cone(C.red, .07, .3, at(-.2, .05, .06), [1.2, -Q, 0]), ...eyes(.53, .14));
    return p;
  }
  function brute(col, o = {}) {
    const p = pawn(col, { w: o.w || 1.3, h: o.h || 1, hs: o.hs || 1, body: o.body || col }), y = headY(o.h || 1, o.hs || 1);
    p.push(...eyes(y, .18 * (o.hs || 1)));
    return p;
  }
  function orc() { const p = brute('#4f7a45', { body: '#6b4a2e' }), y = headY(); p.push(...[-1, 1].map(s => cone(C.cream, .02, .06, at(.17, s * .05, y - .09)))); p.push(rod(C.wood, at(.22, -.34, .15), at(.22, -.42, .7), .055, cylinder(32, .55, 1))); return p; }
  function ogre() { return brute(C.tan, { w: 1.5, h: .9, hs: .8, body: '#a08458' }); }
  function troll() { const p = brute(C.slate, { w: 1.2, h: 1.35 }), y = headY(1.35); p.push(ball('#6f7f93', .06, at(.18, 0, y - .03)), ball(C.moss, 0, [0, y + .15, 0], [.12, .06, .12])); return p; }
  function golem() {
    return [blk(C.stoneD, [.36, .22, .3], [0, .11, 0]), blk(C.stone, [.42, .28, .34], [0, .36, 0]), blk(C.stone, [.24, .22, .22], [0, .62, 0]),
      blk(C.gold, [.08, .08, .02], at(.18, 0, .38)), ...[-1, 1].map(s => blk(C.stoneD, [.12, .3, .12], at(0, s * .28, .3))), ...[-1, 1].map(s => ball('#ffe36a', .025, at(.12, s * .05, .65)))];
  }
  function treant() {
    return [disc(C.brown, .26, .05, 0), taper(C.brown, .14, .2, .5, .04), ball('#4a8f45', .26, [0, .72, 0]), ball('#3f7f3d', .18, at(-.05, .18, .62)), ball('#3f7f3d', .18, at(-.05, -.18, .62)),
      ...[-1, 1].map(s => rod(C.brown, at(0, s * .12, .35), at(.04, s * .3, .5), .035)), ...eyes(.38, .17, '#2c2014')];
  }
  // ---------- props ----------
  function chest() { return [blk(C.brown, [.42, .22, .28], [0, .11, 0]), rod('#9a6a44', [-.149, .22, .149], [.149, .22, -.149], .14), blk(C.gold, [.44, .04, .3], [0, .2, 0]), blk(C.gold, [.06, .08, .02], at(.15, 0, .19))]; }
  function sign() { return [rod(C.brown, [0, 0, 0], [0, .6, 0], .035), blk(C.wood, [.34, .12, .03], [.04, .5, -.04]), rod(C.wood, [.16, .5, -.16], [.24, .5, -.24], .085, cylinder(4, 0, 1))]; }
  function bench() { return [blk(C.wood, [.5, .04, .14], [0, .16, 0]), ...[-1, 1].map(s => blk(C.brown, [.04, .16, .12], at(0, s * .2, .08))), blk(C.wood, [.5, .1, .03], at(-.06, 0, .25))]; }
  function log() { return [rod(C.brown, [-.21, .12, .21], [.21, .12, -.21], .12), rod(C.wood, [.21, .12, -.21], [.215, .12, -.215], .1)]; }
  function well() { return [disc(C.stone, .24, .2, 0), disc('#3b5fa8', .19, .01, .2), ...[-1, 1].map(s => rod(C.brown, at(0, s * .2, .2), at(0, s * .2, .55), .025)), part(Pr, R('roof'), { s: [.5, .16, .3], r: [0, -Q, 0], t: [0, .55, 0] }), disc(C.brown, .04, .07, .3)]; }
  function shrine() { return [blk(C.stone, [.36, .08, .3], [0, .04, 0]), blk(C.stone, [.26, .3, .2], [0, .23, 0]), part(Pr, C.stoneD, { s: [.34, .12, .26], r: [0, Q, 0], t: [0, .38, 0] }), ball(C.gold, .045, at(.11, 0, .24)), disc(C.cream, .02, .06, .28, at(.11, 0, 0))]; }
  function grave() { return [blk(C.stoneD, [.3, .04, .22], [0, .02, 0]), blk(C.stone, [.24, .26, .07], [0, .17, 0]), part(Cy, C.stone, { s: [.12, .07, .12], r: facing, t: at(-.035, 0, .3) }), blk(C.stoneD, [.04, .12, .01], at(.04, 0, .2)), blk(C.stoneD, [.1, .035, .01], at(.04, 0, .22))]; }
  function campfire() {
    const p = [];
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; p.push(ball(C.stone, 0, [Math.cos(a) * .24, .04, Math.sin(a) * .24], [.07, .05, .07])); }
    p.push(rod(C.brown, [-.16, .03, -.06], [.16, .08, .06], .035), rod(C.brown, [-.06, .03, .16], [.06, .08, -.16], .035));
    p.push(cone(C.orange, .14, .34, [0, .05, 0]), cone(C.yellow, .07, .2, at(.04, 0, .06)));
    return p;
  }
  function pebble() { return [part(Sf, C.stone, { s: [.14, .07, .12], t: [0, .04, 0] }), part(Sf, C.stoneD, { s: [.09, .05, .08], t: at(.06, .16, .03) }), part(Sf, C.stone, { s: [.07, .04, .06], t: at(.1, -.14, .02) })]; }
  function exit() {
    return [...[-1, 1].map(s => blk(C.stone, [.16, .7, .16], at(0, s * .3, .35))), part(B, C.stone, { s: [.18, .14, .82], r: [0, -Q, 0], t: [0, .77, 0] }),
      part(B, C.gold, { s: [.2, .14, .14], r: [0, -Q, 0], t: [0, .77, 0] }), ...[-1, 1].map(s => blk(C.stoneD, [.2, .06, .2], at(0, s * .3, .03)))];
  }
  function mushroom() { return [taper(C.cream, .06, .08, .18, 0), part(S, C.red, { s: [.2, .13, .2], t: [0, .18, 0] }), ...[[.1, .05], [-.04, .12], [.03, -.1]].map(([f, l]) => ball(C.cream, .03, at(f, l, .27)))]; }
  function flower() {
    const p = [];
    for (const [f, l, h] of [[0, 0, .26], [.08, .12, .18], [-.06, -.12, .2]]) { p.push(rod(R('leafD'), at(f, l, 0), at(f, l, h), .012)); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; p.push(ball(R('fruit'), .035, at(f + Math.cos(a) * .045, l + Math.sin(a) * .045, h))); } p.push(ball(C.yellow, .025, at(f + .01, l, h + .01))); }
    p.push(ball(R('leaf'), 0, [0, .02, 0], [.14, .04, .14]));
    return p;
  }
  function bush() { const p = [ball(R('leaf'), .22, [0, .16, 0]), ball(R('leafD'), .17, at(-.05, .2, .1)), ball(R('leafD'), .17, at(-.05, -.2, .1)), ...[[.2, .05, .22], [.15, -.12, .14], [.1, .15, .3]].map(([f, l, h]) => ball(R('fruit'), .03, at(f, l, h)))]; if (R('snow')) p.push(ball('#f4f6f8', 0, [0, .33, 0], [.16, .06, .16])); return p; }
  function crystal() { const c = R('crystal'); return [ball(R('rock'), 0, [0, .03, 0], [.22, .06, .18]), ...[[0, 0, .42, 0], [.08, .12, .26, .4], [.02, -.13, .3, -.35]].map(([f, l, h, t]) => part(cylinder(6, 0, 1), c, { s: [.07, h, .07], r: [t * .4, Q, t], t: at(f, l, .03) }, { gloss: 1.2 }))]; }
  function bridge() { const p = []; for (let i = 0; i < 9; i++) p.push(part(B, i % 2 ? C.wood : '#c49a66', { s: [.1, .04, .5], t: [-.45 + i * .1125, 0, 0] })); for (const z of [-.27, .27]) p.push(part(B, C.brown, { s: [1.04, .05, .04], t: [0, .04, z] })); for (const x of [-.5, .5]) for (const z of [-.27, .27]) p.push(part(Cy, C.brown, { s: [.035, .09, .035], t: [x, 0, z] })); return p; }
  // ---------- buildings ----------
  function cottage(W, D, H, o = {}) {
    const fz = D / 2, fx = W / 2, p = [part(B, o.wall || C.cream, { s: [W, H, D], t: [0, H / 2, 0] }, { gloss: .3 }), part(Pr, R('roof'), { s: [W + .06, o.rh || .3, D + .06], t: [0, H, 0] }, { gloss: .3 })];
    if (R('snow')) p.push(part(Pr, '#f4f6f8', { s: [W + .08, .06, .12], t: [0, H + (o.rh || .3) - .05, 0] }));
    if (o.chimney !== false) p.push(part(B, R('roof'), { s: [.09, .2, .09], t: [-W * .25, H + .2, -D * .15] }));
    p.push(part(B, C.brown, { s: [.11, .19, .01], t: [-W * .22, .095, fz + .005] }));
    for (const x of o.windows || [W * .22]) p.push(part(B, C.blue, { s: [.11, .1, .01], t: [x, H * .58, fz + .005] }));
    p.push(part(B, C.blue, { s: [.01, .1, .11], t: [fx + .005, H * .58, 0] }));
    if (o.upper) for (const x of o.upper) p.push(part(B, C.blue, { s: [.1, .09, .01], t: [x, H * .85, fz + .005] }));
    if (o.sign) p.push(rod(C.brown, [fx + .01, H * .8, fz], [fx + .12, H * .8, fz + .12], .015), part(B, C.gold, { s: [.12, .1, .02], r: [0, -Q, 0], t: [fx + .1, H * .68, fz + .1] }));
    return p;
  }
  const house = () => cottage(.62, .48, .34);
  const houseSmall = () => cottage(.42, .4, .3, { windows: [.11], rh: .26 });
  const inn = () => cottage(.9, .52, .55, { windows: [.08, .3], upper: [-.22, .08, .3], sign: true, wall: '#e8d8b8' });
  const innSmall = () => cottage(.6, .46, .4, { windows: [.15], sign: true, wall: '#e8d8b8', chimney: false });
  function tower(h = 1, r = .22) { const p = [disc(C.stoneD, r + .03, .05, 0), disc(C.stone, r, .8 * h, .05), disc(C.stoneD, r + .04, .05, .85 * h), cone(R('roof'), r + .07, .36, [0, .9 * h, 0]), rod(C.brown, [0, 1.2 * h, 0], [0, 1.3 * h + .08, 0], .012), part(B, C.red, { s: [.14, .08, .01], t: [.07, 1.3 * h + .03, 0] })]; for (const y of [.35, .6]) p.push(blk(C.ink, [.05, .1, .01], at(r, 0, y * h * 1.1))); if (R('snow')) p.push(cone('#f4f6f8', .1, .12, [0, .9 * h + .25, 0])); return p; }
  function ruins(small) {
    const c = R('rock'), p = [blk(C.stoneD, small ? [.3, .05, .3] : [.8, .05, .3], [0, .025, 0], [0, -Q, 0])];
    if (small) return [...p, blk(c, [.14, .45, .14], [0, .25, 0], [0.08, Q, 0]), blk(c, [.12, .08, .1], at(.15, .1, .04)), ball(R('leaf'), 0, at(.06, -.04, .3), [.08, .05, .08])];
    p.push(...[[-.3, .7], [-.1, .5], [.1, .62], [.3, .35]].map(([l, h]) => blk(c, [.14, h, .14], at(0, l, h / 2), [0, Q, 0])), part(B, c, { s: [.16, .1, .42], r: [0, -Q, 0], t: at(0, -.2, .74) }), ball(R('leaf'), 0, at(.06, .1, .5), [.08, .12, .08]), blk(c, [.12, .08, .1], at(.18, .3, .04)));
    return p;
  }
  // ---------- nature ----------
  function roundTree(s = 1) { const p = [taper(R('bark'), .05 * s, .07 * s, .3 * s, 0), ball(R('leaf'), .26 * s, [0, .46 * s, 0]), ball(R('leafD'), .18 * s, at(-.06, .16 * s, .36 * s)), ball(R('leafD'), .16 * s, at(-.04, -.17 * s, .38 * s))]; if (R('snow')) p.push(ball('#f4f6f8', 0, [0, .66 * s, 0], [.18 * s, .07 * s, .18 * s])); return p; }
  function pine() { const p = [taper(R('bark'), .06, .08, .22, 0), cone(R('leaf'), .3, .38, [0, .16, 0]), cone(R('leafD'), .24, .32, [0, .36, 0]), cone(R('leaf'), .17, .26, [0, .54, 0])]; if (R('snow')) p.push(cone('#f4f6f8', .09, .14, [0, .67, 0])); return p; }
  function crooked() { const p = [rod(R('bark'), [0, 0, 0], at(-.05, .1, .35), .07), rod(R('bark'), at(-.05, .1, .35), at(.05, -.1, .62), .055), ball(R('leaf'), .2, at(.05, -.1, .72)), ball(R('leafD'), .15, at(-.08, .18, .5))]; if (R('snow')) p.push(ball('#f4f6f8', 0, at(.05, -.1, .9), [.14, .05, .14])); return p; }
  function rocks(n) { const c = R('rock'); return n.map(([f, l, w, h], i) => part(Sf, i % 2 ? toneDown(c) : c, { s: [w, h, w * .85], t: at(f, l, h * .7), r: [0, i, 0] }, { gloss: .2 })); }
  const toneDown = h => '#' + h.slice(1).match(/../g).map(x => Math.round(parseInt(x, 16) * .82).toString(16).padStart(2, '0')).join('');
  const rockSmall = () => rocks([[0, 0, .16, .12], [.05, .17, .1, .08]]);
  const rockLarge = () => rocks([[0, 0, .3, .24], [.08, .3, .2, .16], [.1, -.28, .16, .12]]);
  function rockLayered() { const c = R('rock'); return [0, 1, 2].map(i => part(B, i % 2 ? toneDown(c) : c, { s: [.7 - i * .16, .12, .45 - i * .1], r: [0, Q + i * .2, 0], t: [i * .03, .06 + i * .12, 0] }, { gloss: .2 })); }

  const PIECES = { knight: () => knight(), elf, mage, npc, bandit, warlock, 'fallen-knight': () => knight(C.char, C.char, C.purple, true), skeleton,
    goblin, slime, bat, wolf, spider, wraith, drake, orc, ogre, troll, golem, treant,
    chest, sign, bench, log, well, shrine, grave, campfire, pebble, exit, mushroom, flower, bush, crystal, bridge,
    house, 'house-small': houseSmall, inn, 'inn-small': innSmall, tower: () => tower(1), 'tower-small': () => tower(.7, .2), ruins: () => ruins(false), 'ruins-small': () => ruins(true),
    'tree-small': () => roundTree(1), 'tree-large': () => roundTree(1.35), 'tree-conifer-large': pine, 'tree-crooked-large': crooked, 'rock-small': rockSmall, 'rock-large': rockLarge, 'rock-layered-large': rockLayered };
  const TOPDOWN = { bridge: 1.5 };
  window.PIECES = { build: k => PIECES[k](), keys: Object.keys(PIECES), setRegion: r => { region = r; }, pitch: k => TOPDOWN[k] };
})();
