// Runtime sheet extraction for this prototype. Source artwork is never changed.
// Connected matte removal preserves pale highlights enclosed by the silhouette.
export function removeSheetMatte(imageData, edgeThreshold = 5) {
  const { width: w, height: h, data } = imageData;
  const original = new Uint8ClampedArray(data);
  const sample = (x, y) => [0, 1, 2].map(channel => {
    const values = [];
    for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) values.push(data[((y + dy) * w + x + dx) * 4 + channel]);
    values.sort((a, b) => a - b); return values[8];
  });
  const corners = [sample(0, 0), sample(w - 4, 0), sample(0, h - 4), sample(w - 4, h - 4)];
  const visited = new Uint8Array(w * h), queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  const difference = p => {
    const x = (p % w) / (w - 1), y = Math.floor(p / w) / (h - 1);
    return [0, 1, 2].map(c => (corners[0][c] * (1 - x) + corners[1][c] * x) * (1 - y) + (corners[2][c] * (1 - x) + corners[3][c] * x) * y - data[p * 4 + c]);
  };
  const visit = p => {
    if (visited[p]) return;
    const delta = difference(p), max = Math.max(...delta), min = Math.min(...delta);
    const close = Math.max(...delta.map(Math.abs)) < 24;
    const shadow = min > 0 && max < 78 && max - min < 10;
    if (!close && !shadow) return;
    // A silhouette's edge can be much lighter than its background. Stop at
    // image gradients instead of flooding through those pale surface highlights.
    const px = p % w, py = Math.floor(p / w);
    const neighbors = [px ? p - 1 : p, px < w - 1 ? p + 1 : p, py ? p - w : p, py < h - 1 ? p + w : p];
    let edge = 0;
    for (const q of neighbors) for (let c = 0; c < 3; c++) edge = Math.max(edge, Math.abs(original[p * 4 + c] - original[q * 4 + c]));
    if (edge > edgeThreshold) return;
    visited[p] = 1; queue[tail++] = p;
    const a = shadow ? Math.max(0, Math.min(.38, (delta.reduce((a, b) => a + b) / 3 - 9) / 210)) : 0;
    data[p * 4] = 0; data[p * 4 + 1] = 0; data[p * 4 + 2] = 0; data[p * 4 + 3] = Math.round(a * 255);
  };
  for (let x = 0; x < w; x++) { visit(x); visit((h - 1) * w + x); }
  for (let y = 1; y < h - 1; y++) { visit(y * w); visit(y * w + w - 1); }
  while (head < tail) {
    const p = queue[head++], x = p % w, y = Math.floor(p / w);
    if (x) visit(p - 1); if (x < w - 1) visit(p + 1);
    if (y) visit(p - w); if (y < h - 1) visit(p + w);
  }
  // Discard isolated remnants from the neighboring reference drawings. Keep
  // the main silhouette and its compact shadow; do not change enclosed holes.
  const seen = new Uint8Array(w * h), components = [];
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || data[start * 4 + 3] < 100) continue;
    const pixels = [start]; seen[start] = 1;
    for (let i = 0; i < pixels.length; i++) {
      const p = pixels[i], x = p % w, y = Math.floor(p / w);
      for (const q of [x ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q >= 0 && !seen[q] && data[q * 4 + 3] >= 100) { seen[q] = 1; pixels.push(q); }
      }
    }
    components.push(pixels);
  }
  components.sort((a, b) => b.length - a.length);
  for (const component of components.slice(1)) if (component.length < (components[0]?.length || 0) * .035) {
    for (const p of component) data[p * 4 + 3] = 0;
  }
  return imageData;
}

export function prepareSprite(image, spec, makeCanvas) {
  const [x, y, w, h] = spec.rect;
  const crop = makeCanvas(w, h), ctx = crop.getContext('2d');
  ctx.drawImage(image, x, y, w, h, 0, 0, w, h);
  let pixels = ctx.getImageData(0, 0, w, h);
  if (spec.matte) { pixels = removeSheetMatte(pixels, spec.matteEdge); ctx.putImageData(pixels, 0, 0); }
  if (!spec.normalize) return crop;
  let left = w, top = h, right = 0, bottom = 0;
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    if (pixels.data[(py * w + px) * 4 + 3] < 100) continue;
    left = Math.min(left, px); top = Math.min(top, py); right = Math.max(right, px); bottom = Math.max(bottom, py);
  }
  if (left > right) throw new Error('Sprite extraction produced an empty silhouette');
  left = Math.max(0, left - 3); top = Math.max(0, top - 3); right = Math.min(w - 1, right + 3); bottom = Math.min(h - 1, bottom + 9);
  const bw = right - left + 1, bh = bottom - top + 1, scale = 224 / Math.max(bw, bh);
  const result = makeCanvas(256, 256), target = result.getContext('2d');
  target.drawImage(crop, left, top, bw, bh, (256 - bw * scale) / 2, 240 - bh * scale, bw * scale, bh * scale);
  return result;
}
