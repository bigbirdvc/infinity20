// Shared road geometry: drawing and walking use the same cubic curves.
const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const road = (world, x, y) => world.tiles[y]?.[x]?.path;
export function roadNode(world, x, y) {
  if (!road(world, x, y) || (Math.abs(x - (world.riverX ?? 15)) <= 1)) return { x, y };
  return { x: x + .15 * Math.sin(y * .83 + x * .37), y: y + .14 * Math.sin(x * .78 - y * .31) };
}

function tangent(world, node, toward) {
  const neighbors = directions.filter(([dx, dy]) => road(world, node.x + dx, node.y + dy));
  let dx = toward.x - node.x, dy = toward.y - node.y;
  if (neighbors.length === 2 && !(Math.abs(node.x - (world.riverX ?? 15)) <= 1)) {
    const other = neighbors.find(([x, y]) => x !== dx || y !== dy);
    dx -= other[0]; dy -= other[1];
  }
  const length = Math.hypot(dx, dy);
  return { x: dx / length, y: dy / length };
}

export function roadCurve(world, from, to) {
  const a = roadNode(world, from.x, from.y), b = roadNode(world, to.x, to.y);
  const onRoad = road(world, from.x, from.y) && road(world, to.x, to.y);
  const ta = onRoad ? tangent(world, from, to) : { x: b.x - a.x, y: b.y - a.y };
  const tb = onRoad ? tangent(world, to, from) : { x: a.x - b.x, y: a.y - b.y };
  const reach = onRoad ? Math.hypot(b.x - a.x, b.y - a.y) * .36 : 1 / 3;
  return [a, { x: a.x + ta.x * reach, y: a.y + ta.y * reach }, { x: b.x + tb.x * reach, y: b.y + tb.y * reach }, b];
}

export function curvePoint(curve, t) {
  const [a, b, c, d] = curve, u = 1 - t;
  return { x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * d.x,
    y: u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t ** 3 * d.y };
}

export function terrainPosition(state, world) {
  const next = ['walk','return'].includes(state.stage) ? state.route[0] : null;
  return next ? curvePoint(roadCurve(world, state, next), state.fraction) : roadNode(world, state.x, state.y);
}

const canvasOf = (width, height) => {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas;
};
const mirror = value => { const n = ((value % 2) + 2) % 2; return n < 1 ? n : 2 - n; };

export function paintDesertRiver(ctx, frames, tile, height, riverX = 15) {
  // Desert's first water cell is a shoreline corner, not a repeatable river.
  // The middle water cell contains open water. Reflect its interior continuously
  // along the river and feather only the two banks, never horizontal tile ends.
  const source = frames.get('terrain-tiles/water-marsh').image.getContext('2d').getImageData(0, 0, 256, 256).data;
  const margin = Math.ceil(tile * .07), width = tile + margin * 2;
  const strip = canvasOf(width, height), ink = strip.getContext('2d');
  const pixels = ink.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    const bend = Math.sin(y * Math.PI / tile) * tile * .065;
    const left = margin + bend, right = margin + tile - bend;
    const sy = 24 + Math.floor(mirror(y / (tile * 2.3)) * 207);
    for (let x = 0; x < width; x++) {
      const u = (x - left) / (right - left);
      if (u <= 0 || u >= 1) continue;
      const sx = 24 + Math.floor(u * 207), from = (sy * 256 + sx) * 4, to = (y * width + x) * 4;
      const edge = Math.min(1, Math.min(u, 1 - u) / .12);
      for (let c = 0; c < 3; c++) pixels.data[to + c] = source[from + c];
      pixels.data[to + 3] = 255 * edge * edge * (3 - 2 * edge);
    }
  }
  ink.putImageData(pixels, 0, 0); ctx.drawImage(strip, riverX * tile - margin, 0);
  strip.width = strip.height = 1;
}

// Crop away atlas borders, reflect the fine texture, and mix the three approved
// meadow colours with continuous fields spanning several tiles. No tile masks.
export function paintMeadow(ctx, frames, width, height, tile, region) {
  const sources = ['meadow-a', 'meadow-b', 'meadow-c'].map(name => {
    const f = frames.get(`terrain-tiles/${name}`);
    return f.image.getContext('2d').getImageData(0, 0, 256, 256).data;
  });
  const scale = 2, w = Math.ceil(width / scale), h = Math.ceil(height / scale);
  const layer = canvasOf(w, h), out = layer.getContext('2d').createImageData(w, h);
  const richness = ['fresh', 'lush'].includes(region) ? .78 : .58;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const wx = x * scale / tile, wy = y * scale / tile;
    const field = Math.sin(wx * .61 + Math.sin(wy * .48) * 1.7) * Math.cos(wy * .53 - wx * .17);
    const second = Math.sin(wx * .39 + wy * .57 + 2.3) * Math.cos(wx * .28 - wy * .46);
    const b = richness * Math.max(0, field), c = richness * Math.max(0, second) * (1 - b);
    const weights = [1 - b - c, b, c];
    const index = (y * w + x) * 4;
    for (let variant = 0; variant < 3; variant++) {
      const sx = 35 + Math.floor(mirror(wx * .77 + variant * .37) * 185);
      const sy = 35 + Math.floor(mirror(wy * .77 + variant * .61) * 185);
      const source = (sy * 256 + sx) * 4;
      for (let channel = 0; channel < 3; channel++) out.data[index + channel] += sources[variant][source + channel] * weights[variant];
    }
    out.data[index + 3] = 255;
  }
  layer.getContext('2d').putImageData(out, 0, 0);
  ctx.drawImage(layer, 0, 0, width, height);
  layer.width = layer.height = 1;
}

export function paintRoads(ctx, world, frames, width, height, tile, region) {
  // Terrain is cached, so half-resolution masks retain soft edges while keeping
  // palette switches comfortably below browser canvas-memory limits.
  ctx.save(); ctx.scale(2, 2); width /= 2; height /= 2; tile /= 2;
  const mask = canvasOf(width, height); let ink = mask.getContext('2d');
  const curves = [];
  for (const row of world.tiles) for (const cell of row) if (cell.path) {
    for (const [dx, dy] of [[1, 0], [0, 1]]) if (road(world, cell.x + dx, cell.y + dy)) {
      curves.push(roadCurve(world, cell, { x: cell.x + dx, y: cell.y + dy }));
    }
    const arms = directions.filter(([dx, dy]) => road(world, cell.x + dx, cell.y + dy));
    if (arms.length >= 3) {
      const node = roadNode(world, cell.x, cell.y);
      // Widen the inside of each junction into a small rounded apron. The
      // walking centreline stays inside this shared, seam-free surface.
      for (let a = 0; a < arms.length; a++) for (let b = a + 1; b < arms.length; b++) {
        const [ax, ay] = arms[a], [bx, by] = arms[b];
        if (ax * bx + ay * by !== 0) continue;
        curves.push([{ x: node.x + ax * .62, y: node.y + ay * .62 },
          { x: node.x + ax * .20, y: node.y + ay * .20 },
          { x: node.x + bx * .20, y: node.y + by * .20 },
          { x: node.x + bx * .62, y: node.y + by * .62 }]);
      }
    }
  }
  const stroke = (extra, alpha) => {
    ink.lineCap = 'round'; ink.lineJoin = 'round'; ink.strokeStyle = `rgba(255,255,255,${alpha})`;
    ink.lineWidth = tile * (.66 + extra);
    // One path per layer: a filtered stroke creates an expensive intermediate
    // surface. Applying it to every tiny segment can stall the GPU for seconds.
    ink.beginPath();
    for (const curve of curves) {
      const [a,b,c,d]=curve;
      ink.moveTo((a.x+.5)*tile,(a.y+.5)*tile);
      ink.bezierCurveTo((b.x+.5)*tile,(b.y+.5)*tile,(c.x+.5)*tile,(c.y+.5)*tile,(d.x+.5)*tile,(d.y+.5)*tile);
    }
    ink.stroke();
  };
  // A translucent worn shoulder, then a solid centre; masks are composed before
  // texturing so junctions never acquire overlapping dark seams.
  ink.filter = `blur(${tile * .038}px)`; stroke(.16, .22);
  ink.filter = 'none'; stroke(.06, .32); stroke(0, 1);
  const centre = canvasOf(width, height); ink = centre.getContext('2d');
  ink.filter = `blur(${tile * .022}px)`; stroke(-.10, 1);
  const surface = canvasOf(width, height), dirt = surface.getContext('2d');
  const grain = canvasOf(128, 128), g = grain.getContext('2d');
  const f = frames.get('terrain-tiles/path');
  g.drawImage(f.image, 108, 108, 40, 40, 0, 0, 128, 128);
  dirt.fillStyle = dirt.createPattern(grain, 'repeat'); dirt.fillRect(0, 0, width, height);
  const shoulder = canvasOf(width, height), edge = shoulder.getContext('2d');
  edge.drawImage(mask, 0, 0); edge.globalCompositeOperation = 'destination-out'; edge.drawImage(centre, 0, 0);
  edge.globalCompositeOperation = 'source-in'; edge.fillStyle = 'rgba(88,57,31,.20)'; edge.fillRect(0, 0, width, height);
  dirt.drawImage(shoulder, 0, 0);
  // Sparse, deterministic fine grains, clipped by the same continuous mask.
  let seed = 781;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 16000; i++) {
    const x = random() * width, y = random() * height, size = .6 + random() * 1.7;
    dirt.fillStyle = i % 3 ? 'rgba(83,55,33,.12)' : 'rgba(255,244,211,.22)';
    dirt.fillRect(x, y, size, size * .65);
  }
  if (['volcanic', 'twilight'].includes(region)) {
    dirt.fillStyle = region === 'volcanic' ? 'rgba(30,22,28,.18)' : 'rgba(27,23,43,.14)';
    dirt.fillRect(0, 0, width, height);
  }
  dirt.globalCompositeOperation = 'destination-in'; dirt.drawImage(mask, 0, 0);
  // Clip the road to the land. Bridge artwork alone crosses the river.
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, (world.riverX ?? 15) * tile, height); ctx.rect(((world.riverX ?? 15) + 1) * tile, 0, width - ((world.riverX ?? 15) + 1) * tile, height); ctx.clip();
  ctx.drawImage(surface, 0, 0); ctx.restore();
  ctx.restore();
  for (const buffer of [mask, centre, surface, grain, shoulder]) buffer.width = buffer.height = 1;
}
