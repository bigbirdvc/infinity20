// Painting for generation-8 worlds: smooth roads, organic water, ground detail.
// Roads and the hero's walk share one curve definition (Catmull-Rom through
// the tile centres), so the hero always walks on the road that is drawn.
import { paintMeadow } from './demo-terrain.js';

const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
const STEPS4 = [[1,0],[-1,0],[0,1],[0,-1]];

function quietTile(world, x, y) {
  if (world.entrance && x === world.entrance.x && y === world.entrance.y) return true;
  return world.bridges.some(b => Math.abs(b.x - x) + Math.abs(b.y - y) <= 1);
}
function rawNode(world, x, y) {
  const t = world.tiles[y]?.[x];
  if (!t || !t.path || quietTile(world, x, y)) return { x, y };
  return { x: x + .12 * Math.sin(y * .83 + x * .37), y: y + .11 * Math.sin(x * .78 - y * .31) };
}
// Road tiles with exactly two road neighbours are eased toward them, which
// irons out grid steps. Drawing and walking both read this one table.
const eased = new WeakMap();
function easedNodes(world) {
  let table = eased.get(world); if (table) return table;
  const links = new Map(), key = (x, y) => `${x},${y}`;
  for (const road of world.roads) road.forEach((p, i) => {
    if (p.edge) return;
    const k = key(p.x, p.y), set = links.get(k) || new Set();
    for (const q of [road[i - 1], road[i + 1]]) if (q && !q.edge) set.add(key(q.x, q.y));
    links.set(k, set);
  });
  table = new Map();
  for (const [k, set] of links) {
    const [x, y] = k.split(',').map(Number);
    if (set.size !== 2 || quietTile(world, x, y)) continue;
    const [a, b] = [...set].map(n => n.split(',').map(Number)), self = rawNode(world, x, y), na = rawNode(world, ...a), nb = rawNode(world, ...b);
    table.set(k, { x: self.x * .5 + (na.x + nb.x) * .25, y: self.y * .5 + (na.y + nb.y) * .25 });
  }
  eased.set(world, table); return table;
}
// A road node: the tile centre, nudged and eased so roads flow.
export function nodeOf(world, p) {
  if (p.edge) return { x: p.x, y: p.y };
  if (world.roads) { const e = easedNodes(world).get(`${p.x},${p.y}`); if (e) return e; }
  return rawNode(world, p.x, p.y);
}
const reflect = (a, b) => ({ x: 2 * a.x - b.x, y: 2 * a.y - b.y });
// Catmull-Rom segment p1→p2 as a cubic Bézier.
function controls(p0, p1, p2, p3) {
  return [p1, { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }, { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }, p2];
}
function bezier([a, b, c, d], t) {
  const u = 1 - t;
  return { x: u*u*u*a.x + 3*u*u*t*b.x + 3*u*t*t*c.x + t*t*t*d.x, y: u*u*u*a.y + 3*u*u*t*b.y + 3*u*t*t*c.y + t*t*t*d.y };
}
function traceNodes(path, nodes, scale, offset = .5) {
  const P = p => [(p.x + offset) * scale, (p.y + offset) * scale];
  if (nodes.length === 1) { const [x, y] = P(nodes[0]); path.moveTo(x, y); path.lineTo(x + .01, y); return; }
  path.moveTo(...P(nodes[0]));
  for (let i = 0; i < nodes.length - 1; i++) {
    const p0 = nodes[i - 1] || reflect(nodes[i], nodes[i + 1]), p3 = nodes[i + 2] || reflect(nodes[i + 1], nodes[i]);
    const [, c1, c2, end] = controls(p0, nodes[i], nodes[i + 1], p3);
    path.bezierCurveTo(...P(c1), ...P(c2), ...P(end));
  }
}
export function roadPath(world, scale) {
  const path = new Path2D();
  for (const road of world.roads) traceNodes(path, road.map(p => nodeOf(world, p)), scale);
  return path;
}

// Hero position in tile units (top-left origin, like the tiles).
export function walkPosition(state, world) {
  const walking = ['walk', 'return'].includes(state.stage) && state.route?.length;
  const cur = nodeOf(world, state);
  if (!walking) return cur;
  const next = nodeOf(world, state.route[0]);
  const prev = state.prev && Math.max(Math.abs(state.prev.x - state.x), Math.abs(state.prev.y - state.y)) === 1 ? nodeOf(world, state.prev) : reflect(cur, next);
  const after = state.route[1] ? nodeOf(world, state.route[1]) : reflect(next, cur);
  return bezier(controls(prev, cur, next, after), Math.max(0, Math.min(1, state.fraction)));
}

function averageColour(frame) {
  const d = frame.image.getContext('2d').getImageData(frame.w * .3, frame.h * .3, frame.w * .4, frame.h * .4).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 16) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
  return [r / n, g / n, b / n];
}
const rgba = ([r, g, b], k, a) => `rgba(${Math.min(255, r * k) | 0},${Math.min(255, g * k) | 0},${Math.min(255, b * k) | 0},${a})`;
function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function waterPath(world, scale) {
  const path = new Path2D();
  for (const river of world.water.rivers) traceNodes(path, river.points, scale);
  return path;
}
function poolPath(world, scale, grow = 0) {
  const path = new Path2D();
  for (const pool of world.water.pools) for (const c of pool.cells) {
    // Uneven blobs give an irregular, natural shoreline.
    const r = (.66 + grow + .24 * Math.sin(c.x * 1.7 + c.y * 2.3)) * scale;
    const x = (c.x + .5 + .18 * Math.sin(c.y * 2.9 + c.x)) * scale, y = (c.y + .5 + .16 * Math.cos(c.x * 2.1 - c.y)) * scale;
    path.moveTo(x + r, y); path.arc(x, y, r, 0, Math.PI * 2);
  }
  return path;
}

// The full static ground for a generation-8 map.
export function paintWorld(ctx, frames, world, width, height, tile, region) {
  paintMeadow(ctx, frames, width, height, tile, region);
  const meadow = averageColour(frames.get('terrain-tiles/meadow-a'));
  const random = mulberry(world.seed ^ 0x9e37);
  const half = tile / 2, W = width / 2, H = height / 2;

  // Broad light and shade so the meadow is not one flat sheet.
  for (let i = 0; i < 26; i++) {
    const x = random() * width, y = random() * height, r = tile * (1.2 + random() * 2.6), light = random() < .45;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(meadow, light ? 1.16 : .74, light ? .16 : .2)); g.addColorStop(1, rgba(meadow, 1, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Worn earth around the village square and the camp.
  for (const scene of world.scenes.filter(s => s.kind === 'village' || s.kind === 'camp')) {
    const x = (scene.x + .5) * tile, y = (scene.y + .5) * tile, r = tile * (scene.kind === 'village' ? 1.5 : 1.05);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(120,88,52,.26)'); g.addColorStop(.7, 'rgba(120,88,52,.12)'); g.addColorStop(1, 'rgba(120,88,52,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // ---- Road mask (half resolution), shared by the surface and scatter tests.
  const roads = roadPath(world, half);
  const plaza = new Path2D();
  for (const s of world.scenes.filter(s => s.kind === 'village')) { plaza.moveTo((s.x + .5) * half + half * .78, (s.y + .5) * half); plaza.arc((s.x + .5) * half, (s.y + .5) * half, half * .78, 0, Math.PI * 2); }
  const mask = canvasOf(W, H), m = mask.getContext('2d');
  const stroke = (ink, width, alpha) => { ink.lineCap = 'round'; ink.lineJoin = 'round'; ink.strokeStyle = ink.fillStyle = `rgba(255,255,255,${alpha})`; ink.lineWidth = half * width; ink.stroke(roads); ink.fill(plaza); };
  m.filter = `blur(${half * .05}px)`; stroke(m, .9, .25);
  m.filter = 'none'; stroke(m, .76, .4); stroke(m, .68, 1);
  const centre = canvasOf(W, H), c = centre.getContext('2d');
  c.filter = `blur(${half * .03}px)`; stroke(c, .54, 1);
  // Dirt texture from the regional path tile, clipped by the mask.
  const surface = canvasOf(W, H), dirt = surface.getContext('2d');
  const pathFrame = frames.get('terrain-tiles/path');
  const grain = canvasOf(128, 128), gctx = grain.getContext('2d');
  gctx.drawImage(pathFrame.image, pathFrame.w * .42, pathFrame.h * .42, pathFrame.w * .16, pathFrame.h * .16, 0, 0, 128, 128);
  dirt.fillStyle = dirt.createPattern(grain, 'repeat'); dirt.fillRect(0, 0, W, H);
  const shoulder = canvasOf(W, H), edge = shoulder.getContext('2d');
  edge.drawImage(mask, 0, 0); edge.globalCompositeOperation = 'destination-out'; edge.drawImage(centre, 0, 0);
  edge.globalCompositeOperation = 'source-in'; edge.fillStyle = 'rgba(88,57,31,.24)'; edge.fillRect(0, 0, W, H);
  dirt.drawImage(shoulder, 0, 0);
  for (let i = 0; i < 9000; i++) {
    const x = random() * W, y = random() * H, size = .6 + random() * 1.6;
    dirt.fillStyle = i % 3 ? 'rgba(83,55,33,.13)' : 'rgba(255,244,211,.2)'; dirt.fillRect(x, y, size, size * .65);
  }
  if (region === 'desert' || region === 'dry') { dirt.fillStyle = 'rgba(120,78,40,.16)'; dirt.fillRect(0, 0, W, H); }
  if (['volcanic', 'twilight'].includes(region)) { dirt.fillStyle = region === 'volcanic' ? 'rgba(30,22,28,.18)' : 'rgba(27,23,43,.14)'; dirt.fillRect(0, 0, W, H); }
  dirt.globalCompositeOperation = 'destination-in'; dirt.drawImage(mask, 0, 0);
  const roadAlpha = m.getImageData(0, 0, W, H).data;
  const onRoad = (x, y) => roadAlpha[((Math.min(H - 1, Math.max(0, y / 2 | 0)) * W) + Math.min(W - 1, Math.max(0, x / 2 | 0))) * 4 + 3] > 30;
  const tileAt = (x, y) => world.tiles[Math.floor(y / tile)]?.[Math.floor(x / tile)];
  const solidAt = (x, y) => { const t = tileAt(x, y); return !t || t.kind === 'water' || t.kind === 'bridge' || world.blocked.has(`${t.x},${t.y}`) && world.buildings.some(b => t.x >= b.x && t.x < b.x + b.w && t.y >= b.y && t.y < b.y + b.h); };

  // ---- Grass tufts and tiny flowers on open ground.
  const dark = rgba(meadow, .62, .55), mid = rgba(meadow, .82, .5), light = rgba(meadow, 1.25, .5);
  const tuft = (x, y, s, alpha = 1) => {
    ctx.globalAlpha = alpha; ctx.lineCap = 'round';
    for (let b = 0; b < 4; b++) {
      const a = -Math.PI / 2 + (b - 1.5) * .38 + (random() - .5) * .25, len = s * (.6 + random() * .55);
      ctx.strokeStyle = b === 3 ? light : b % 2 ? mid : dark; ctx.lineWidth = Math.max(1.2, s * .13);
      ctx.beginPath(); ctx.moveTo(x + (b - 1.5) * s * .12, y); ctx.quadraticCurveTo(x + Math.cos(a) * len * .4, y + Math.sin(a) * len * .55, x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  for (let i = 0; i < 1700; i++) {
    const x = random() * width, y = random() * height;
    if (onRoad(x, y) || solidAt(x, y)) continue;
    tuft(x, y, tile * (.09 + random() * .09), .85);
  }
  const petals = { fresh: ['#fff8ea', '#ffd6e4', '#fff1a6'], lush: ['#fff8ea', '#f6c3ff', '#ffe58a'], cool: ['#ffffff', '#d9ecff'], dry: ['#f7e2a1', '#fff3d4'], desert: ['#ffe0a6', '#f0b77d'], volcanic: ['#ffb36a', '#ffd49a'], twilight: ['#c7d5ff', '#f1d7ff', '#9fe6ff'] }[region] || ['#fff'];
  for (let i = 0; i < 260; i++) {
    const x = random() * width, y = random() * height;
    if (onRoad(x, y) || solidAt(x, y)) continue;
    ctx.fillStyle = petals[i % petals.length]; ctx.globalAlpha = .75;
    ctx.beginPath(); ctx.arc(x, y, tile * (.018 + random() * .02), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ---- The road surface, then pebbles and grass creeping over its edges.
  ctx.drawImage(surface, 0, 0, width, height);
  const along = [];
  for (const road of world.roads) {
    const nodes = road.map(p => nodeOf(world, p));
    for (let i = 0; i < nodes.length - 1; i++) {
      const p0 = nodes[i - 1] || reflect(nodes[i], nodes[i + 1]), p3 = nodes[i + 2] || reflect(nodes[i + 1], nodes[i]);
      const seg = controls(p0, nodes[i], nodes[i + 1], p3);
      for (let t = 0; t < 1; t += .2) {
        const a = bezier(seg, t), b = bezier(seg, Math.min(1, t + .05)), dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
        along.push({ x: a.x + .5, y: a.y + .5, nx: -dy / len, ny: dx / len });
      }
    }
  }
  for (const p of along) {
    if (random() < .5) continue;
    const side = random() < .5 ? -1 : 1, off = .3 + random() * .12;
    const x = (p.x + p.nx * side * off) * tile, y = (p.y + p.ny * side * off) * tile;
    if (solidAt(x, y)) continue;
    if (random() < .55) tuft(x, y, tile * (.1 + random() * .07));
    else {
      const r = tile * (.025 + random() * .03);
      ctx.fillStyle = 'rgba(60,50,40,.25)'; ctx.beginPath(); ctx.ellipse(x + r * .25, y + r * .35, r * 1.1, r * .7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = random() < .5 ? '#b9b2a4' : '#9d968a'; ctx.beginPath(); ctx.ellipse(x, y, r * 1.1, r * .8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(x - r * .3, y - r * .3, r * .4, r * .25, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---- Water: a wet bank, the water itself, then depth and a bright rim.
  if (world.water.rivers.length || world.water.pools.length) {
    const river = waterPath(world, half), pools = poolPath(world, half), banks = poolPath(world, half, .2);
    const wm = canvasOf(W, H), w = wm.getContext('2d');
    w.lineCap = 'round'; w.lineJoin = 'round'; w.strokeStyle = w.fillStyle = '#fff';
    w.filter = `blur(${half * .05}px)`; w.lineWidth = half * .98; w.stroke(river);
    if (world.water.pools.length) {
      // Pools are melted together from overlapping blobs, then cut at a soft
      // threshold, giving one smooth shoreline instead of a cluster of circles.
      const blob = canvasOf(W, H), bc = blob.getContext('2d', { willReadFrequently: true });
      bc.filter = `blur(${half * .42}px)`; bc.fillStyle = '#fff'; bc.fill(poolPath(world, half, .1));
      const img = bc.getImageData(0, 0, W, H), d = img.data;
      for (let i = 3; i < d.length; i += 4) { const a = d[i] / 255, v = Math.max(0, Math.min(1, (a - .38) / .14)); d[i] = 255 * v * v * (3 - 2 * v); }
      bc.putImageData(img, 0, 0); w.filter = 'none'; w.drawImage(blob, 0, 0); blob.width = blob.height = 1;
    }
    const bank = canvasOf(W, H), bk = bank.getContext('2d');
    bk.filter = `blur(${half * .12}px)`; bk.lineCap = 'round'; bk.strokeStyle = 'rgba(70,52,30,.5)'; bk.lineWidth = half * 1.32; bk.stroke(river);
    bk.filter = `blur(${half * .1}px)`; bk.globalAlpha = .45; for (const [dx, dy] of [[0, 0], [.05, .05], [-.05, .05]]) bk.drawImage(wm, dx * half, dy * half + half * .06); bk.globalAlpha = 1;
    bk.globalCompositeOperation = 'source-in'; bk.fillStyle = 'rgba(70,52,30,.55)'; bk.fillRect(0, 0, W, H); bk.globalCompositeOperation = 'source-over';
    ctx.drawImage(bank, 0, 0, width, height);
    const source = frames.get(region === 'desert' ? 'terrain-tiles/water-marsh' : 'terrain-tiles/water-clear');
    const crop = canvasOf(96, 96), cc = crop.getContext('2d');
    cc.drawImage(source.image, source.w * .34, source.h * .34, source.w * .32, source.h * .32, 0, 0, 96, 96);
    // Mirror the crop four ways so the pattern repeats without seams.
    const tc2 = canvasOf(192, 192).getContext('2d');
    tc2.drawImage(crop, 0, 0); tc2.save(); tc2.translate(192, 0); tc2.scale(-1, 1); tc2.drawImage(crop, 0, 0); tc2.restore();
    tc2.save(); tc2.translate(0, 192); tc2.scale(1, -1); tc2.drawImage(crop, 0, 0); tc2.restore();
    tc2.save(); tc2.translate(192, 192); tc2.scale(-1, -1); tc2.drawImage(crop, 0, 0); tc2.restore();
    const body = canvasOf(W, H), bd = body.getContext('2d');
    bd.fillStyle = bd.createPattern(tc2.canvas, 'repeat'); bd.fillRect(0, 0, W, H);
    // Deeper water in the middle of rivers and pools.
    bd.filter = `blur(${half * .18}px)`; bd.lineCap = 'round'; bd.strokeStyle = bd.fillStyle = region === 'volcanic' ? 'rgba(20,20,40,.28)' : 'rgba(10,50,80,.22)';
    bd.lineWidth = half * .45; bd.stroke(river);
    bd.filter = 'none'; bd.globalCompositeOperation = 'destination-in'; bd.drawImage(wm, 0, 0);
    ctx.drawImage(body, 0, 0, width, height);
    // Bright rim where water meets land.
    const rim = canvasOf(W, H), rc = rim.getContext('2d');
    rc.drawImage(wm, 0, 0); rc.globalCompositeOperation = 'destination-out'; rc.filter = `blur(${half * .02}px)`;
    rc.lineCap = 'round'; rc.strokeStyle = '#fff'; rc.lineWidth = half * .86; rc.stroke(river); if (world.water.pools.length) { rc.filter = `blur(${half * .06}px)`; rc.drawImage(wm, 0, half * .07); }
    rc.filter = 'none'; rc.globalCompositeOperation = 'source-in'; rc.fillStyle = 'rgba(235,250,255,.55)'; rc.fillRect(0, 0, W, H);
    ctx.drawImage(rim, 0, 0, width, height);
    // Reeds and stones along the banks.
    const reed = region === 'desert' ? '#8a8a3c' : region === 'volcanic' ? '#5b4a3a' : region === 'cool' ? '#7c9a8a' : '#4f7a35';
    for (const row of world.tiles) for (const t of row) {
      if (t.kind !== 'water') continue;
      for (const [dx, dy] of STEPS4) {
        const n = world.tiles[t.y + dy]?.[t.x + dx];
        if (!n || n.kind !== 'meadow' || random() < .55) continue;
        const x = (t.x + .5 + dx * .52 + (random() - .5) * .5 * (dy ? 1 : 0)) * tile, y = (t.y + .5 + dy * .52 + (random() - .5) * .5 * (dx ? 1 : 0)) * tile;
        if (onRoad(x, y)) continue;
        if (random() < .7) {
          ctx.strokeStyle = reed; ctx.lineCap = 'round'; ctx.lineWidth = tile * .022;
          for (let k = 0; k < 4; k++) { const sway = (random() - .5) * tile * .12; ctx.beginPath(); ctx.moveTo(x + (k - 1.5) * tile * .03, y); ctx.quadraticCurveTo(x + sway * .4, y - tile * .12, x + sway, y - tile * (.16 + random() * .12)); ctx.stroke(); }
        } else {
          const r = tile * .05; ctx.fillStyle = 'rgba(40,40,40,.25)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 3, r * 1.2, r * .8, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#a7a29a'; ctx.beginPath(); ctx.ellipse(x, y, r * 1.2, r * .85, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    for (const b of [wm, bank, body, rim, crop, tc2.canvas]) b.width = b.height = 1;
  }

  // ---- Bridges sit on top of the water.
  const bridge = frames.get('terrain-tiles/bridge');
  for (const b of world.bridges) {
    ctx.save(); ctx.translate((b.x + .5) * tile, (b.y + .5) * tile); if (b.axis === 'y') ctx.rotate(Math.PI / 2);
    ctx.fillStyle = 'rgba(20,30,40,.25)'; ctx.beginPath(); ctx.ellipse(0, tile * .12, tile * .86, tile * .42, 0, 0, Math.PI * 2); ctx.fill();
    const w = tile * 1.78, h = w * bridge.h / bridge.w;
    ctx.drawImage(bridge.image, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
  for (const b of [mask, centre, surface, grain, shoulder]) b.width = b.height = 1;
}

// Points along the water for the animated shimmer.
export function waterSparkles(world) {
  const random = mulberry(world.seed ^ 0x51a7), out = [];
  for (const river of world.water?.rivers || []) {
    for (let i = 0; i < river.points.length - 1; i++) for (let k = 0; k < 3; k++) {
      const t = random(), a = river.points[i], b = river.points[i + 1], side = (random() - .5) * .6;
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      out.push({ x: a.x + dx * t + .5 - dy / len * side, y: a.y + dy * t + .5 + dx / len * side, phase: random() * 7, flow: [dx / len, dy / len] });
    }
  }
  for (const pool of world.water?.pools || []) for (const c of pool.cells) for (let k = 0; k < 2; k++) out.push({ x: c.x + .2 + random() * .6, y: c.y + .2 + random() * .6, phase: random() * 7, flow: [.3, 0] });
  if (!world.water) for (const row of world.tiles) for (const t of row) if (t.kind === 'water') for (let k = 0; k < 2; k++) out.push({ x: t.x + .25 + random() * .5, y: t.y + random(), phase: random() * 7, flow: [0, 1] });
  return out;
}
