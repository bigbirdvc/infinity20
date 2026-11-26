// Ambient life drawn over the map each frame: water shimmer, fire glow,
// drifting cloud shadows, regional particles, weather and a slow day/night
// cycle. Everything is a pure function of time, so nothing needs saving.
import { waterSparkles } from './world-paint.js';

const DAY_SECONDS = 600; // one full day every ten minutes
const WEATHER_FALLBACK = { fresh: 'clear', dry: 'clear', cool: 'snow', lush: 'rain', desert: 'haze', volcanic: 'haze', twilight: 'fog' };
const PARTICLES = { fresh: 'petals', lush: 'fireflies', cool: 'snow', dry: 'seeds', desert: 'dust', volcanic: 'embers', twilight: 'wisps' };

function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Returns how dark the world is (0 day … 1 deep night) plus a warm/cool tint.
export function daylight(now = Date.now()) {
  const p = (now / 1000 % DAY_SECONDS) / DAY_SECONDS;
  // 0–.5 day, .5–.6 dusk, .6–.86 night, .86–.96 dawn.
  const night = smooth(.5, .62, p) * (1 - smooth(.84, .96, p));
  const dusk = smooth(.46, .55, p) * (1 - smooth(.55, .64, p));
  const dawn = smooth(.84, .9, p) * (1 - smooth(.9, .98, p));
  return { night, dusk, dawn, phase: p };
}

let cloudSprite = null;
function clouds() {
  if (cloudSprite) return cloudSprite;
  const c = document.createElement('canvas'); c.width = 520; c.height = 300; const g = c.getContext('2d');
  const r = mulberry(77);
  for (let i = 0; i < 9; i++) {
    const x = 110 + r() * 300, y = 90 + r() * 120, rad = 60 + r() * 70;
    const grad = g.createRadialGradient(x, y, 0, x, y, rad); grad.addColorStop(0, 'rgba(20,30,40,1)'); grad.addColorStop(1, 'rgba(20,30,40,0)');
    g.fillStyle = grad; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  return cloudSprite = c;
}

export function createAmbient(world, region, tile) {
  const random = mulberry((world.seed >>> 0) ^ 0xa3b1);
  const weather = world.weather || WEATHER_FALLBACK[region] && (random() < .35 ? WEATHER_FALLBACK[region] : 'clear');
  const sparkles = waterSparkles(world);
  const fires = world.objects.filter(o => o.kind === 'campfire').map(o => ({ x: o.x + .5, y: o.y + .62 }));
  const windows = world.buildings.filter(b => /house|inn/.test(b.kind)).map(b => ({ x: b.x + b.w / 2, y: b.y + b.h * .72, r: b.w }));
  const kind = PARTICLES[region] || 'petals';
  const count = { petals: 26, fireflies: 34, snow: 70, seeds: 24, dust: 34, embers: 40, wisps: 30 }[kind] * (weather === 'snow' && kind === 'snow' ? 1.8 : 1);
  const particles = Array.from({ length: Math.round(count) }, () => ({ a: random(), b: random(), c: random(), d: random() }));
  const cloudCount = weather === 'cloudy' || weather === 'rain' ? 6 : weather === 'clear' ? 3 : 4;
  const cloudList = Array.from({ length: cloudCount }, () => ({ a: random(), b: random(), s: .8 + random() * .9 }));
  const drops = Array.from({ length: 160 }, () => ({ a: random(), b: random(), c: random() }));
  const fog = Array.from({ length: 6 }, () => ({ a: random(), b: random(), s: 1 + random() }));
  const W = world.tiles[0].length * tile, H = world.tiles.length * tile;

  return {
    weather,
    draw(ctx, tf, now, reducedMotion) {
      const t = reducedMotion ? 0 : now / 1000, s = tf.s;
      const X = x => tf.ox + x * s, Y = y => tf.oy + y * s;
      const light = daylight();
      ctx.save();
      ctx.beginPath(); ctx.rect(tf.ox, tf.oy, W * s, H * s); ctx.clip();

      // Water shimmer: short bright dashes that drift with the current.
      if (!reducedMotion) {
        ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, tile * .025 * s);
        for (const p of sparkles) {
          const a = Math.max(0, Math.sin(t * 1.4 + p.phase)) ** 4 * .6;
          if (a < .03) continue;
          const drift = ((t * .12 + p.phase) % 1 - .5) * .3;
          const x = (p.x + p.flow[0] * drift) * tile, y = (p.y + p.flow[1] * drift) * tile, len = tile * .14;
          ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(X(x - len / 2), Y(y)); ctx.lineTo(X(x + len / 2), Y(y)); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // Cloud shadows slide slowly across the map.
      const sprite = clouds(), shade = weather === 'cloudy' || weather === 'rain' ? .12 : .07;
      ctx.globalAlpha = shade;
      for (const c of cloudList) {
        const w = sprite.width * c.s * tile / 64, h = sprite.height * c.s * tile / 64, span = W + w;
        const x = ((c.a * span + t * 9 * c.s) % span) - w, y = c.b * (H + h * .5) - h * .5 + Math.sin(t * .05 + c.a * 9) * tile * .4;
        ctx.drawImage(sprite, X(x), Y(y), w * s, h * s);
      }
      ctx.globalAlpha = 1;

      // Day and night.
      if (light.dusk > 0) { ctx.fillStyle = `rgba(255,140,60,${.12 * light.dusk})`; ctx.fillRect(tf.ox, tf.oy, W * s, H * s); }
      if (light.dawn > 0) { ctx.fillStyle = `rgba(255,190,200,${.1 * light.dawn})`; ctx.fillRect(tf.ox, tf.oy, W * s, H * s); }
      if (light.night > 0) { ctx.fillStyle = `rgba(18,26,68,${.34 * light.night})`; ctx.fillRect(tf.ox, tf.oy, W * s, H * s); }
      if (weather === 'haze') { ctx.fillStyle = region === 'volcanic' ? 'rgba(255,110,60,.07)' : 'rgba(255,220,160,.08)'; ctx.fillRect(tf.ox, tf.oy, W * s, H * s); }
      if (weather === 'rain') { ctx.fillStyle = 'rgba(40,60,80,.08)'; ctx.fillRect(tf.ox, tf.oy, W * s, H * s); }

      // Warm light: campfires always, windows after dark.
      ctx.globalCompositeOperation = 'lighter';
      for (const f of fires) {
        const flicker = reducedMotion ? 1 : .78 + .14 * Math.sin(t * 9 + f.x) + .08 * Math.sin(t * 23 + f.y);
        const r = tile * (.9 + .5 * light.night) * flicker, cx = X(f.x * tile), cy = Y(f.y * tile);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * s);
        g.addColorStop(0, `rgba(255,170,70,${(.22 + .3 * light.night) * flicker})`); g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = g; ctx.fillRect(cx - r * s, cy - r * s, r * 2 * s, r * 2 * s);
        if (!reducedMotion) for (let k = 0; k < 4; k++) {
          const life = (t * .8 + k / 4 + f.x) % 1, sx = f.x * tile + Math.sin(t * 3 + k * 2) * tile * .08, sy = f.y * tile - tile * (.15 + life * .7);
          ctx.fillStyle = `rgba(255,190,90,${.8 * (1 - life)})`; ctx.beginPath(); ctx.arc(X(sx), Y(sy), Math.max(.8, tile * .018 * s), 0, Math.PI * 2); ctx.fill();
        }
      }
      if (light.night > .05) for (const w of windows) {
        const r = tile * .9 * w.r, cx = X(w.x * tile), cy = Y(w.y * tile);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * s);
        g.addColorStop(0, `rgba(255,200,110,${.32 * light.night})`); g.addColorStop(1, 'rgba(255,170,80,0)');
        ctx.fillStyle = g; ctx.fillRect(cx - r * s, cy - r * s, r * 2 * s, r * 2 * s);
      }
      ctx.globalCompositeOperation = 'source-over';

      // Regional particles.
      if (!reducedMotion) {
        const glowKinds = kind === 'fireflies' || kind === 'embers' || kind === 'wisps';
        if (glowKinds) ctx.globalCompositeOperation = 'lighter';
        for (const p of particles) {
          let x, y, r, colour, alpha;
          if (kind === 'snow') { x = (p.a * W + Math.sin(t * .6 + p.c * 9) * tile * .4 + t * 10) % W; y = (p.b * H + t * tile * (.35 + p.c * .3)) % H; r = tile * (.025 + p.d * .025); colour = '255,255,255'; alpha = .85; }
          else if (kind === 'embers') { x = p.a * W + Math.sin(t * .9 + p.c * 9) * tile * .5; y = H - ((p.b * H + t * tile * (.4 + p.c * .5)) % H); r = tile * (.018 + p.d * .02); colour = '255,150,60'; alpha = .5 + .5 * Math.sin(t * 6 + p.d * 20); }
          else if (kind === 'fireflies' || kind === 'wisps') { x = p.a * W + Math.sin(t * .35 + p.c * 9) * tile * 1.3; y = p.b * H + Math.cos(t * .3 + p.a * 7) * tile; r = tile * (.03 + p.d * .02); colour = kind === 'wisps' ? (p.d < .5 ? '170,200,255' : '230,180,255') : '220,255,120'; alpha = Math.max(0, Math.sin(t * 1.6 + p.c * 20)) ** 3 * (.45 + .55 * Math.max(light.night, kind === 'wisps' ? .7 : .25)); }
          else if (kind === 'petals') { x = (p.a * W + t * tile * .3) % W; y = (p.b * H + t * tile * .12 + Math.sin(t + p.c * 6) * tile * .3) % H; r = tile * (.03 + p.d * .015); colour = p.d < .5 ? '255,230,240' : '255,255,245'; alpha = .8; }
          else if (kind === 'seeds') { x = (p.a * W + t * tile * .4) % W; y = p.b * H + Math.sin(t * .8 + p.c * 6) * tile * .5; r = tile * .022; colour = '255,250,230'; alpha = .7; }
          else { x = (p.a * W + t * tile * (.6 + p.c)) % W; y = p.b * H + Math.sin(t * .5 + p.c * 6) * tile * .2; r = tile * (.015 + p.d * .015); colour = '235,205,150'; alpha = .45; }
          if (alpha < .03) continue;
          ctx.fillStyle = `rgba(${colour},${alpha})`;
          ctx.beginPath();
          if (kind === 'petals') ctx.ellipse(X(x), Y(y), Math.max(1, r * s * 1.4), Math.max(.6, r * s * .7), t * 2 + p.c * 6, 0, Math.PI * 2);
          else ctx.arc(X(x), Y(y), Math.max(.8, r * s), 0, Math.PI * 2);
          ctx.fill();
          if (glowKinds && alpha > .2) { ctx.fillStyle = `rgba(${colour},${alpha * .18})`; ctx.beginPath(); ctx.arc(X(x), Y(y), Math.max(2, r * s * 4), 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.globalCompositeOperation = 'source-over';
        if (weather === 'rain') {
          ctx.strokeStyle = 'rgba(210,225,255,.32)'; ctx.lineWidth = Math.max(1, tile * .012 * s);
          ctx.beginPath();
          for (const d of drops) { const x = (d.a * W + t * tile * 2) % W, y = (d.b * H + t * tile * (7 + d.c * 3)) % H; ctx.moveTo(X(x), Y(y)); ctx.lineTo(X(x - tile * .06), Y(y - tile * .28)); }
          ctx.stroke();
        }
      }
      if (weather === 'fog') {
        for (const f of fog) {
          const r = tile * 4 * f.s, x = ((f.a * (W + r * 2) + t * tile * .15) % (W + r * 2)) - r, y = f.b * H;
          const g = ctx.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), r * s);
          g.addColorStop(0, 'rgba(235,240,250,.2)'); g.addColorStop(1, 'rgba(235,240,250,0)');
          ctx.fillStyle = g; ctx.fillRect(X(x - r), Y(y - r), r * 2 * s, r * 2 * s);
        }
      }
      ctx.restore();
    },
  };
}
