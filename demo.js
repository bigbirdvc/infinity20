import {loadArt,prefetchRegion} from './game-assets.js';
import {readSave} from './adventure-storage.js';
import {encounterProgress} from './adventure-engine.js';
import { WIDTH, HEIGHT, REGIONS, titleCase, borderTrees, nextSeed, rng as seededRandom } from './adventure-world.js';
import { COUNTERS, freshGame, worldFor, advanceGame, format, money, xpNeeded, levelBase, maxHealth } from './adventure-engine.js';
import { SAVE_KEY as LIVE_SAVE_KEY, encode, decode, catchUp } from './adventure-save.js';
import { paintMeadow, paintRoads, paintDesertRiver, terrainPosition as classicPosition } from './demo-terrain.js';
import { paintWorld, walkPosition } from './world-paint.js';
import { createAmbient } from './ambient.js';
const terrainPosition = (s, w) => w.generation >= 8 ? walkPosition(s, w) : classicPosition(s, w);

const SAVE_KEY = document.documentElement.hasAttribute('data-test-session') ? 'infinite-adventure-browser-qa' : LIVE_SAVE_KEY;
const $ = id => document.getElementById(id);
const TILE = 96, worldWidth = WIDTH * TILE, worldHeight = HEIGHT * TILE;
const canvas = $('map'), view = canvas.getContext('2d');
const scene = document.createElement('canvas');
scene.width = worldWidth; scene.height = worldHeight;
const context = scene.getContext('2d');
let state = freshGame(), world = worldFor(state);
let saveBlocked=false, artworkFailed=false, refreshPending=false;
let owner = false, savedAt = Date.now(), pendingSummary = null, loadingRegion = false, storageOK = true, closed = false;
let heroesReady=false;
let mode = 'full-map', speed = 1, paused = false, ready = false;
let hero = 'knight', heroName = 'Rowan', zoom = 2.2, camera = null, lastTime = 0, uiTime = 0, frameTime = 0;
let comparisonBorder=true;
let heroColour = 'original';
const colourFrames = new Map();
let creating = false, portraitsKey = '', questKey = '', eventKey = '';
const frames = new Map(), landscapes = new Map();
let regionalFrames = new Map(), region = 'fresh', manifests;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const nameText = value => value.replaceAll('Rowan', heroName);
const text = (id, value) => { $(id).textContent = value; };

function frameFor(style, group, name) {
  const frame = regionalFrames.get(`${group}/${name}`) || frames.get(`${group}/${name}`);
  if (!frame) throw new Error(`Missing sprite: ${style}/${group}/${name}`);
  if (group !== 'hero-sprites' || heroColour === 'original') return frame;
  const key = `${name}/${heroColour}`;
  if (!colourFrames.has(key)) {
    const image = document.createElement('canvas'); image.width = frame.w; image.height = frame.h;
    const c = image.getContext('2d'); c.drawImage(frame.image, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
    const pixels = c.getImageData(0, 0, frame.w, frame.h), target = {crimson:[190,45,65],emerald:[40,150,95],violet:[135,65,195],blue:[45,110,205]}[heroColour];
    if (target) for (let i=0;i<pixels.data.length;i+=4) {
      const [r,g,b] = pixels.data.slice(i,i+3), high=Math.max(r,g,b), low=Math.min(r,g,b);
      // Recolour cool, saturated clothing; preserve skin, gold, steel and shadows.
      if (high-low>30 && (b>r*1.08 || g>r*1.12)) {
        const light=high/200; for(let j=0;j<3;j++) pixels.data[i+j]=Math.min(255,target[j]*light);
      }
    }
    c.putImageData(pixels,0,0); colourFrames.set(key,{image,x:0,y:0,w:frame.w,h:frame.h});
  }
  return colourFrames.get(key);
}

function sprite(ctx, style, group, name, x, y, width, height = width, alpha = 1) {
  const f = frameFor(style, group, name);
  ctx.globalAlpha = alpha;
  const scale = Math.min(width / f.w, height / f.h), dw = f.w * scale, dh = f.h * scale;
  ctx.drawImage(f.image, f.x, f.y, f.w, f.h, x + (width - dw) / 2, y + height - dh, dw, dh);
  ctx.globalAlpha = 1;
}

// Ground crops use the current review sheet; actors share padded square canvases.
function texture(ctx, style, name, crop, x, y, w, h) {
  const f = frameFor(style, 'terrain-tiles', name);
  ctx.drawImage(f.image, f.x + crop[0] * f.w, f.y + crop[1] * f.h, crop[2] * f.w, crop[3] * f.h, x, y, w, h);
}

async function loadAssets() {
  for(const [key,frame]of await loadArt('heroes'))frames.set(key,frame);
  heroesReady=true; previewHero();
  for(const [key,frame]of await loadArt('common'))frames.set(key,frame);
  manifests=true;
  await selectRegion(world.region);
}
let prefetchTimer;
function prepareNextRegion(){
 clearTimeout(prefetchTimer);
 const choices=REGIONS.filter(r=>r!==world.region),next=choices[Math.floor(seededRandom(nextSeed(world.seed))()*choices.length)];
 prefetchTimer=setTimeout(()=>prefetchRegion(next).catch(()=>{}),2000);
}

async function selectRegion(next) {
  const previous = regionalFrames;
  try {
    const nextFrames = await loadArt('regions',next);
    regionalFrames = nextFrames;
    const landscape = makeLandscape('soft-3d', next);
    const oldLandscape = landscapes.get('full-map');
    landscapes.set('full-map', landscape); landscapes.set('follow-view', landscape);
    if (oldLandscape) oldLandscape.width = oldLandscape.height = 1;
    region = next; staticKey = ''; prepareNextRegion(); canvas.dataset.region = next;
    draw();
  } catch (error) {
    regionalFrames = previous;
    throw error;
  }
}

function makeLandscape(style, palette) {
  const ground = document.createElement('canvas'); ground.width = worldWidth; ground.height = worldHeight;
  const ctx = ground.getContext('2d'); ctx.imageSmoothingEnabled = true;
  if (world.generation >= 8) { paintWorld(ctx, { get: key => frameFor(style, ...key.split('/')) }, world, worldWidth, worldHeight, TILE, palette); return ground; }
  paintMeadow(ctx, regionalFrames, worldWidth, worldHeight, TILE, palette);
  paintRoads(ctx, world, regionalFrames, worldWidth, worldHeight, TILE, palette);
  if (palette === 'desert') paintDesertRiver(ctx, regionalFrames, TILE, worldHeight, world.riverX);
  for (const row of world.tiles) for (const tile of row) {
    const { x, y, kind } = tile, px = x * TILE, py = y * TILE;
    if (palette !== 'desert' && (kind === 'water' || kind === 'bridge')) {
      const bank = yy => Math.sin(yy * Math.PI / TILE) * TILE * .065;
      ctx.save(); ctx.beginPath();
      ctx.moveTo(px + bank(py), py);
      for (let offset = 0; offset <= TILE; offset += TILE / 8) ctx.lineTo(px + bank(py + offset), py + offset);
      for (let offset = TILE; offset >= 0; offset -= TILE / 8) ctx.lineTo(px + TILE + bank(py + offset + TILE), py + offset);
      ctx.closePath(); ctx.clip();
      texture(ctx, style, 'water-clear', [0, 0, 1, 1], px - TILE * .1, py, TILE * 1.2, TILE + 1);
      ctx.restore();
    }
    if (kind === 'bridge' && tile.path && x === world.riverX && world.tiles[y][x - 1]?.path && world.tiles[y][x + 1]?.path) {
      ctx.save(); ctx.translate(px + TILE / 2, py + TILE / 2);
      sprite(ctx, style, 'terrain-tiles', 'bridge', -TILE * .64, -TILE * .6, TILE * 1.28, TILE * 1.2);
      ctx.restore();
    }
  }
  return ground;
}

const staticScene = document.createElement('canvas');
staticScene.width = worldWidth; staticScene.height = worldHeight;
let staticKey = '', staticItems = [], heroBox = null;
// One size for everything: target height and maximum width, in tiles, of each
// sprite's visible artwork. The art was drawn at many scales; this evens it out.
const SIZES = {
  hero: [.98, 1.05], npc: [.9, .8],
  slime: [.58, .8], bat: [.62, 1], spider: [.6, .95], wolf: [.78, .92], goblin: [.84, .9], skeleton: [.9, .95], bandit: [.88, .9],
  warlock: [.9, .9], wraith: [.84, .9], 'fallen-knight': [.98, 1], orc: [1, 1], golem: [1.1, 1.1], troll: [1.18, 1.15], ogre: [1.2, 1.2], treant: [1.3, 1.2], drake: [1.08, 1.15],
  chest: [.46, .6], flower: [.36, .4], mushroom: [.4, .42], shrine: [.86, .75], well: [1.02, .98], campfire: [.46, .6], sign: [.62, .6], grave: [.56, .5],
  bench: [.42, .74], exit: [1.8, 1.9], log: [.3, .78], pebble: [.2, .42], bush: [.44, .66], crystal: [.58, .52], 'east-sign': [.62, .6], 'south-bench': [.42, .74],
  'tree-small': [1.12, 1.02], 'rock-small': [.52, .84], 'tree-large': [2.15, 2.05], 'tree-conifer-large': [2.35, 1.6], 'tree-crooked-large': [2.05, 2.1],
  'rock-large': [1.1, 1.85], 'rock-layered-large': [1.22, 1.95],
  house: [1.95, 2.02], inn: [2.2, 2.08], 'house-small': [1.3, 1.12], 'inn-small': [1.42, 1.15], tower: [2.55, 1.65], 'tower-small': [1.85, 1.08], ruins: [1.85, 2.08], 'ruins-small': [1.25, 1.22],
};
const boxes = new WeakMap();
// The visible artwork inside a padded sprite canvas, found once per frame.
function artBox(f) {
  let cached = boxes.get(f); if (cached) return cached;
  const data = f.image.getContext('2d').getImageData(f.x, f.y, f.w, f.h).data;
  let x0 = f.w, y0 = f.h, x1 = -1, y1 = -1;
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (data[(y * f.w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  cached = x1 < 0 ? { x: 0, y: 0, w: f.w, h: f.h } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  boxes.set(f, cached); return cached;
}
// Place a sprite by its feet: centred on footX, standing on footY.
function placed(group, name, footX, footY, size, boost = 1) {
  const f = frameFor(mode, group, name), b = artBox(f), [h, w] = size || SIZES[name] || [.9, .9];
  const scale = Math.min(h * TILE * boost / b.h, w * TILE * boost / b.w), dw = b.w * scale, dh = b.h * scale;
  return { f, b, rect: [footX - dw / 2, footY - dh, dw, dh] };
}
function groundShadow(ctx, x, y, width, alpha = .3) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, .32);
  const r = width / 2, g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, `rgba(16,24,12,${alpha})`); g.addColorStop(.6, `rgba(16,24,12,${alpha * .55})`); g.addColorStop(1, 'rgba(16,24,12,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function standing(group, name, footX, footY, { size, boost = 1, alpha = 1, shadow = .3, shadowWidth = .78 } = {}) {
  const p = placed(group, name, footX, footY, size, boost), [x, y, w, h] = p.rect;
  const sw = Math.max(w * shadowWidth, TILE * .22);
  const box = [Math.min(x, footX - sw / 2) - 2, y - 2, Math.max(w, sw) + 4, h + sw * .2 + 4];
  return { z: footY / TILE, box, draw: ctx => {
    if (shadow) groundShadow(ctx, footX, footY - h * .02, sw, shadow * (alpha < 1 ? .6 : 1));
    ctx.globalAlpha = alpha; ctx.drawImage(p.f.image, p.f.x + p.b.x, p.f.y + p.b.y, p.b.w, p.b.h, x, y, w, h); ctx.globalAlpha = 1;
  } };
}
function sceneItems() {
  const items = [];
  const border = world.generation >= 8 ? world.border : (comparisonBorder ? borderTrees(world.seed, world.riverX) : []);
  for (const tree of [...world.trees, ...border]) {
    const big = tree.size === 2, fx = (big ? tree.x : tree.x + .5 + (tree.jx || 0)) * TILE, fy = (tree.y + (big ? .94 : .86) + (tree.jy || 0)) * TILE;
    items.push(standing('terrain-tiles', tree.kind, fx, fy, { boost: tree.scale || 1, shadow: tree.kind.startsWith('rock') ? .26 : .34, shadowWidth: tree.kind.startsWith('rock') ? .9 : .7 }));
  }
  for (const b of world.buildings) items.push(standing('building-sprites', b.kind, (b.x + b.w / 2) * TILE, (b.y + b.h - .02) * TILE, { shadow: .32, shadowWidth: .92 }));
  for (const object of world.objects) {
    const enemy = object.group === 'enemy-sprites', faded = state.visited.has(object.id) ? .46 : 1;
    const arch = object.kind === 'exit';
    const fx = (arch && object.size ? object.x : object.x + .5 + (object.jx || 0)) * TILE;
    const fy = (object.y + (arch ? (object.size ? .95 : .9) : .72)) * TILE;
    items.push(standing(object.group, object.kind, fx, fy, { alpha: faded, boost: object.boss ? 1.32 : 1, shadow: ['flower', 'pebble', 'grave'].includes(object.kind) ? .18 : enemy ? .34 : .28 }));
  }
  // Quest and discovery markers sit on the ground, beneath every sprite.
  for (const object of world.objects.filter(o => o.type === 'quest' || o.type === 'discovery')) {
    const cx = (object.x + .5) * TILE, cy = (object.y + .78) * TILE, alpha = state.visited.has(object.id) ? .3 : 1;
    items.push({ z: -Infinity, box: [cx - 14, cy - 8, 28, 16], draw: ctx => {
      ctx.globalAlpha = alpha; ctx.strokeStyle = object.type === 'quest' ? '#e8bd4a' : '#9fd3ec'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(cx, cy, 12, 5.5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    } });
  }
  return items;
}
let ambient = null, ambientKey = '';
function heroItem(p) {
  const footX = (p.x + .5) * TILE, footY = (p.y + .72) * TILE;
  const body = standing('hero-sprites', hero, footX, footY, { shadow: .36 });
  const rect = [footX - TILE * .95, footY - TILE * 1.55, TILE * 1.9, TILE * 1.82];
  return { z: footY / TILE, rect, draw: ctx => {
    // A soft warm halo keeps the hero easy to find among the scenery.
    ctx.save(); ctx.translate(footX, footY); ctx.scale(1, .36);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, TILE * .62);
    g.addColorStop(0, 'rgba(255,236,170,.5)'); g.addColorStop(.6, 'rgba(255,226,140,.2)'); g.addColorStop(1, 'rgba(255,226,140,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, TILE * .62, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    body.draw(ctx);
    if (mode === 'full-map') {
      const label = heroName.length > 14 ? heroName.slice(0, 13) + '…' : heroName;
      ctx.font = `700 ${TILE * .24}px ui-rounded, "Avenir Next", system-ui, sans-serif`;
      const w = Math.min(TILE * 1.8, ctx.measureText(label).width + TILE * .22), h = TILE * .34, x = footX - w / 2, y = footY - TILE * 1.48;
      ctx.fillStyle = 'rgba(46,32,18,.82)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
      ctx.fillStyle = '#fff3cf'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, footX, y + h / 2 + 1, w - TILE * .12);
    }
  } };
}

function draw(now = 0) {
  if (!ready || creating || loadingRegion || artworkFailed) return;
  const p = terrainPosition(state, world);
  // Scenery only changes when the map, palette or visited set changes, so it is
  // painted once into staticScene. Each frame repaints just the hero's box.
  const key = `${world.seed}:${state.mapNumber}:${region}:${state.visited.size}:${comparisonBorder}`;
  if (key !== staticKey) {
    staticItems = sceneItems().sort((a, b) => a.z - b.z);
    const ctx = staticScene.getContext('2d'); ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, worldWidth, worldHeight); ctx.drawImage(landscapes.get(mode), 0, 0);
    for (const item of staticItems) item.draw(ctx);
    context.clearRect(0, 0, worldWidth, worldHeight); context.drawImage(staticScene, 0, 0);
    staticKey = key; heroBox = null;
  } else if (heroBox) context.drawImage(staticScene, ...heroBox, ...heroBox);
  // Foot-point depth ordering lets the hero pass behind tall scenery.
  const hi = heroItem(p), hx = Math.max(0, Math.round(hi.rect[0])), hy = Math.max(0, Math.round(hi.rect[1]));
  const heroRect = [hx, hy, Math.min(worldWidth, Math.round(hi.rect[0] + hi.rect[2])) - hx, Math.min(worldHeight, Math.round(hi.rect[1] + hi.rect[3])) - hy];
  const overlaps = item => item.box[0] < heroRect[0] + heroRect[2] && item.box[0] + item.box[2] > heroRect[0] && item.box[1] < heroRect[1] + heroRect[3] && item.box[1] + item.box[3] > heroRect[1];
  const local = staticItems.filter(overlaps); local.splice(local.findIndex(item => item.z > hi.z) >>> 0, 0, hi);
  context.save(); context.imageSmoothingEnabled = true;
  context.beginPath(); context.rect(...heroRect); context.clip();
  context.drawImage(landscapes.get(mode), ...heroRect, ...heroRect);
  for (const item of local) item.draw(context);
  context.restore(); heroBox = heroRect;

  const box = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(box.width * dpr)), height = Math.max(1, Math.round(box.height * dpr));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; camera = null; }
  view.fillStyle = '#132b23'; view.fillRect(0, 0, width, height);
  view.imageSmoothingEnabled = true;
  // The map toolbar lives in the header now, so the whole canvas is available.
  const scale = Math.min(width / worldWidth, height / worldHeight);
  if (mode === 'full-map') {
    const w = worldWidth * scale, h = worldHeight * scale;
    view.drawImage(scene, 0, 0, worldWidth, worldHeight, Math.round((width - w) / 2), Math.round((height - h) / 2), w, h);
    drawAmbient({ ox: Math.round((width - w) / 2), oy: Math.round((height - h) / 2), s: scale }, now);
  } else {
    const followScale = Math.max(scale, 74 * dpr / TILE / 2.2) * zoom;
    const sw = Math.min(worldWidth, width / followScale), sh = Math.min(worldHeight, height / followScale);
    const tx = Math.max(0, Math.min(worldWidth - sw, (p.x + .5) * TILE - sw / 2));
    const ty = Math.max(0, Math.min(worldHeight - sh, (p.y + .5) * TILE - sh / 2));
    if (!camera || reducedMotion) camera = { x: tx, y: ty };
    else { camera.x += (tx - camera.x) * .12; camera.y += (ty - camera.y) * .12; }
    camera.x = Math.max(0, Math.min(worldWidth - sw, camera.x)); camera.y = Math.max(0, Math.min(worldHeight - sh, camera.y));
    const dw = sw * followScale, dh = sh * followScale;
    view.drawImage(scene, camera.x, camera.y, sw, sh, (width - dw) / 2, (height - dh) / 2, dw, dh);
    view.save(); view.beginPath(); view.rect((width - dw) / 2, (height - dh) / 2, dw, dh); view.clip();
    drawAmbient({ ox: (width - dw) / 2 - camera.x * followScale, oy: (height - dh) / 2 - camera.y * followScale, s: followScale }, now);
    view.restore();
  }
}

function drawAmbient(tf, now) {
  const key = `${world.seed}:${state.mapNumber}:${region}`;
  if (key !== ambientKey) { ambient = createAmbient(world, region, TILE); ambientKey = key; }
  try { ambient.draw(view, tf, now || performance.now(), reducedMotion); } catch (error) { console.warn('Ambient layer skipped:', error); }
}

function portrait(id, group, name) {
  const c = $(id).getContext('2d'); c.clearRect(0, 0, 96, 96); c.imageSmoothingEnabled = true;
  sprite(c, 'full-map', group, name, 0, 0, 96);
}

function updateUI() {
  text('place', `${world.name} · Map ${format(state.mapNumber)}`);
  const characterTitle = `${heroName} The ${titleCase(hero)}`; text('characterName', characterTitle); $('characterName').style.fontSize = `${Math.min(22,Math.max(12,($('characterName').clientWidth || 280)/(characterTitle.length*.60)))}px`; text('rank', '');
  const health = maxHealth(state.level), xp = state.xpTotal - levelBase(state.level), needed = xpNeeded(state.level);
  text('level', format(state.level)); text('hp', `${format(health * BigInt(Math.round(state.hp * 1000)) / 1000n)} / ${format(health)}`); text('xp', `${format(xp)} / ${format(needed)}`);
  text('lint', money(state.gold)); text('biscuits', format(state.potions));
  $('hpbar').style.width = `${state.hp * 100}%`;
  $('xpbar').style.width = `${Number(xp * 10000n / needed) / 100}%`;
  text('maps', format(state.circuits)); text('completed', format(state.completed)); text('side', format(state.discoveries)); text('wins', format(state.wins));
  text('defeats', format(state.defeats)); text('strength', format(7n + state.level * 2n + state.level / 10n));
  text('saveStatus', !storageOK ? 'Browser storage unavailable · progress is not saved' : owner ? 'Saved in this browser' : 'Watching · adventure active in another tab');
  $('eventCard').hidden = !state.card; if (state.card) { text('cardTitle', state.card.title); text('cardText', state.card.text); }
  text('agendaTitle', `Local quests · ${state.completedQuests.size} / ${world.quests.length}`);
  const nextQuest = world.quests.findIndex((q, n) => !state.completedQuests.has(n));
  const qKey = state.seed + ':' + state.mapNumber + ':' + [...state.completedQuests].join(',') + ':' + nextQuest;
  if (qKey !== questKey) {
    questKey = qKey; $('quests').replaceChildren();
    world.quests.forEach(({title}, i) => {
      const li = document.createElement('li'), done = state.completedQuests.has(i), current = i === nextQuest;
      li.className = done ? 'done' : current ? 'active' : '';
      li.textContent = `${done ? '✓' : current ? '→' : '·'} ${title}`;
      $('quests').append(li);
    });
  }
  const combat = state.stage === 'combat';
  $('duel').hidden = !combat; $('duel').parentElement.classList.toggle('fighting', combat);
  if (combat) {
    const key = hero + ':' + state.target.kind;
    if (key !== portraitsKey) { portrait('heroPortrait', 'hero-sprites', hero); portrait('enemyPortrait', 'enemy-sprites', state.target.kind); portraitsKey = key; }
    text('heroName', `${heroName} · Lv ${format(state.level)}`); text('enemyName', titleCase(state.target.kind));
    text('heroFightStats', `${Math.round(state.hp * 100)}% health`);
    const enemyHp = Math.max(0, Math.ceil(state.enemy.hp * 100));
    text('enemyFightStats', `Lv ${format(state.enemy.level)} · ${enemyHp}%`);
    $('fightHeroHP').style.width = `${state.hp * 100}%`;
    $('fightEnemyHP').style.width = `${enemyHp}%`;
  }
  const eKey = state.event.title + state.event.text + heroName;
  if (eKey !== eventKey) {
    eventKey = eKey;
    // Screen readers hear notable events only, not every step along the road.
    if (state.event.title !== 'Along the road') text('announcer', `${state.event.title}. ${nameText(state.event.text)}`);
    $('eventTitle').className = state.event.quality ? `quality-${state.event.quality.toLowerCase()}` : '';
    text('eventTitle', state.event.title); text('eventText', nameText(state.event.text));
    $('history').replaceChildren();
    for (const event of state.log.slice(0, 10)) {
      const p = document.createElement('p'), b = document.createElement('b');
      b.textContent = event.title; if(event.quality)b.className = `quality-${event.quality.toLowerCase()}`; p.append(b, document.createTextNode(nameText(event.text))); $('history').append(p);
    }
  }
  $('timer').style.width = state.stage === 'walk' || state.stage === 'plan' ? '0%' : `${encounterProgress(state) * 100}%`;
}

function setMode(next) {
  if (!['full-map', 'follow-view'].includes(next)) throw new Error('Choose full-map or follow-view.');
  mode = next; camera = null;
  document.querySelectorAll('[data-zoom]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.zoom === (mode === 'full-map' ? 'full' : 'close'))));
  draw(performance.now());
}
function setPaused(value) { paused = value; draw(performance.now()); }
function restart() { if (!owner) return; state = freshGame(state.seed); state.name = heroName; state.hero = hero; state.heroColour = heroColour; state.characterCreated = true; world = worldFor(state); persist(); refreshMap(); camera = null; eventKey = ''; questKey = ''; portraitsKey = ''; updateGuide(); updateUI(); }

document.querySelectorAll('[data-zoom]').forEach(button => button.onclick = () => setMode(button.dataset.zoom === 'full' ? 'full-map' : 'follow-view'));
document.querySelectorAll('[data-speed]').forEach(button => button.onclick = () => {
  speed = Number(button.dataset.speed);
  document.querySelectorAll('[data-speed]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === speed)));
});

const music = new Audio(); music.preload='none'; music.loop = true; music.volume = .22;
$('music').onclick = async () => {
  if(!music.getAttribute('src'))music.src=music.canPlayType('audio/ogg; codecs=opus')?'meadow.ogg':'meadow.mp3';
  if (music.paused) { try { await music.play(); } catch { text('music', '♫ Retry sound'); return; } } else music.pause();
  text('music', music.paused ? '♫ Sound off' : '♫ Sound on'); $('music').setAttribute('aria-pressed', String(!music.paused));
};
$('deleteCharacter').onclick = () => { $('deleteWarning').hidden = false; $('deleteActions').hidden = false; $('cancelDelete').focus(); };
$('cancelDelete').onclick = () => { $('deleteWarning').hidden = true; $('deleteActions').hidden = true; $('deleteCharacter').focus(); };
$('confirmDelete').onclick = () => {
  if (!owner) { text('deleteError','This adventure is running in another tab. Close that tab, then delete it here.'); return; } text('deleteError',''); try { localStorage.removeItem(SAVE_KEY); if(SAVE_KEY===LIVE_SAVE_KEY)localStorage.removeItem('infinite-adventure-v1'); } catch { text('deleteError','The browser could not remove this save.'); return; } creating = true; $('deleteWarning').hidden = true; $('deleteActions').hidden = true;
  openCreator();
};
function needsCreation(loaded) { return !loaded || (!loaded.state.characterCreated && loaded.state.name.trim().toLowerCase() === 'rowan'); }
function openCreator() {
  creating=true; pendingSummary=null; closeRecap(); text('creationStatus',ready?'':'Loading the adventure artwork…');
  $('creator').hidden=false; document.body.classList.add('creating'); $('characterForm').reset();
  $('creationPreview').getContext('2d').clearRect(0,0,144,144); previewHero();
}
function closeCreator() { creating=false; $('creator').hidden=true; document.body.classList.remove('creating'); }
function previewHero() {
  const choice = document.querySelector('input[name="class"]:checked')?.value.toLowerCase();
  $('startAdventure').disabled = !$('chosenName').value.trim() || !choice || !ready || !owner;
  if (choice && heroesReady) { const savedColour=heroColour; heroColour=$('chosenColour').value; const c = $('creationPreview').getContext('2d'); c.clearRect(0, 0, 144, 144); sprite(c, 'follow-view', 'hero-sprites', choice, 0, 0, 144); heroColour=savedColour; }
}
$('chosenName').oninput = previewHero;
$('chosenColour').onchange = previewHero;
document.querySelectorAll('input[name="class"]').forEach(input => input.onchange = previewHero);
$('characterForm').onsubmit = event => {
  event.preventDefault(); const choice = document.querySelector('input[name="class"]:checked')?.value.toLowerCase();
  if (!choice || !$('chosenName').value.trim() || !ready || !owner) return;
  heroColour=$('chosenColour').value;
  hero = choice; heroName = $('chosenName').value.trim(); creating = false; $('creator').hidden = true; document.body.classList.remove('creating'); setPaused(false); restart();
};
// The recap is a modal: focus moves into it, Esc closes it, and focus returns afterwards.
let recapReturnFocus = null;
function openRecap() {
  if (!$('recap').hidden) return;
  recapReturnFocus = document.activeElement; $('recap').hidden = false; $('dismiss').focus();
}
function closeRecap() {
  if ($('recap').hidden) return;
  $('recap').hidden = true; if (recapReturnFocus?.isConnected) recapReturnFocus.focus(); recapReturnFocus = null;
}
$('dismiss').onclick = closeRecap;
$('recap').addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); closeRecap(); }
  else if (event.key === 'Tab') { event.preventDefault(); $('dismiss').focus(); }
});
new ResizeObserver(() => draw(performance.now())).observe(canvas);
document.addEventListener('visibilitychange', () => {
  lastTime = 0; if (!owner || creating || saveBlocked || loadingRegion || artworkFailed) return;
  if (document.hidden) persist();
  else { const oldSeed=world.seed; pendingSummary = awayFor(Math.max(0, Date.now() - savedAt)); world = worldFor(state); persist(); if(world.seed!==oldSeed) refreshMap(); showSummary(pendingSummary); }
});
window.addEventListener('pagehide', () => { if (!document.hidden) persist(); });
setInterval(() => { if (!document.hidden && ready && !creating) persist(); }, 5000);
window.addEventListener('storage', event => { if (!owner && event.key === SAVE_KEY && event.newValue) { const loaded = decode(event.newValue); if (loaded && !needsCreation(loaded)) { closeCreator(); const oldSeed=state.seed; state = loaded.state; world = worldFor(state); heroName = state.name; hero = state.hero; heroColour=state.heroColour || 'original'; if(oldSeed!==state.seed)refreshMap(); updateGuide(); updateUI(); } } });


function loop(now) {
  if (now-frameTime < 1000/30) { requestAnimationFrame(loop); return; }
  frameTime=now;
  const dt = lastTime ? Math.max(0, (now - lastTime) / 1000) : 0; lastTime = now;
  if (ready && !creating && !document.hidden) {
    if (!paused && owner && !loadingRegion) { if (dt > 5) { const oldSeed=world.seed; pendingSummary = awayFor(dt * 1000); world = worldFor(state); if(world.seed!==oldSeed) refreshMap(); showSummary(pendingSummary); persist(); } else if (advanceGame(state, world, dt * speed, dt)) { world = worldFor(state); refreshMap(); persist(); } }
    if (!paused) draw(now);
    if (!loadingRegion && now - uiTime > 160) { updateUI(); uiTime = now; }
  }
  requestAnimationFrame(loop);
}

// Optional agent controls share exactly the actions used by the visible UI.
function registerAgentControl() {
  if (!document.modelContext?.registerTool) return;
  const lifecycle = new AbortController();
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  try {
    Promise.resolve(document.modelContext.registerTool({
      name: 'configure_adventure_demo',
      description: 'Set the art view and pause or resume the visible autoplay demo.',
      inputSchema: { type: 'object', properties: { view: { enum: ['full-map', 'follow-view'] }, paused: { type: 'boolean' } }, required: ['view', 'paused'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (!ready || !input || !['full-map', 'follow-view'].includes(input.view) || typeof input.paused !== 'boolean' || Object.keys(input).some(k => !['view', 'paused'].includes(k))) throw new Error('Expected view and paused.');
        setMode(input.view); setPaused(input.paused); updateUI();
        return { view: mode, paused, hero: heroName, map: { width: WIDTH, height: HEIGHT } };
      },
    }, { signal: lifecycle.signal })).catch(error => console.warn('Optional demo controls unavailable:', error));
  } catch (error) { console.warn('Optional demo controls unavailable:', error); }
}

// Short absences replay the real simulation, so no stop, fight or map is skipped.
// The statistical catch-up in adventure-save.js handles long absences.
const REPLAY_LIMIT_MS = 5 * 60 * 1000;
function awayFor(ms) {
  if (!(ms > 0)) return null;
  if (ms > REPLAY_LIMIT_MS) return catchUp(state, ms);
  const before = Object.fromEntries([...COUNTERS, 'level'].map(k => [k, state[k]]));
  let w = worldFor(state), left = ms / 1000;
  while (left > 1e-9) { const step = Math.min(.25, left); left -= step; if (advanceGame(state, w, step, step)) w = worldFor(state); }
  return { elapsedMs: ms, deltas: Object.fromEntries([...COUNTERS, 'level'].map(k => [k, state[k] - before[k]])) };
}

function persist() {
  if (!owner || creating || !ready || saveBlocked || artworkFailed || loadingRegion) return;
  try { savedAt = Date.now(); localStorage.setItem(SAVE_KEY, encode(state, savedAt)); storageOK = true; }
  catch { storageOK = false; text('saveStatus', 'Browser storage unavailable · progress is not saved'); }
}
function failureNotice(message,retry) {
  const panel=creating ? $('creationStatus') : $('loading'); panel.replaceChildren(document.createTextNode(message)); panel.hidden=false;
  const button=document.createElement('button'); button.textContent='Retry'; button.onclick=retry; panel.append(button);
}
function loadSavedAdventure() {
  try { return readSave(localStorage,SAVE_KEY,SAVE_KEY===LIVE_SAVE_KEY?'infinite-adventure-v1':null); }
  catch(error) { saveBlocked=true; throw error; }
}
async function refreshMap() {
  if (!manifests || refreshPending) return;
  refreshPending=true; loadingRegion=true;
  $('loading').hidden=false; $('loading').textContent='Preparing the next trail…';
  try {
    // Another tab can publish a newer map while these images are loading.
    let seed;
    do { seed=world.seed; await selectRegion(world.region); } while(seed!==world.seed);
    artworkFailed=false; loadingRegion=false; $('loading').hidden=true;
    lastTime=0; savedAt=Date.now(); updateUI(); draw(); persist();
  } catch(error) {
    console.error(error); artworkFailed=true;
    failureNotice('This map’s artwork could not load. The adventure is waiting safely.',()=>refreshMap());
  } finally { refreshPending=false; lastTime=0; }
}
function updateGuide() {
  text('guideCopy', `Infinite Adventure is completely idle. No movement controls, choices, or chores for you.

Your character walks, fights, rests, takes and completes every quest — they decide the best path.

Full Map shows the entire map. Follow zooms into ${heroName} to watch their every move closely. Gold markers show quest stops; pale blue markers show places to explore. Faded objects have already been attended to.

${heroName} gains experience forever. New opponents match ${heroName}’s level; defeat is only a setback. ${heroName} is resourceful and heals up to fight again.

Your game is saved in your browser. On return, you will see the progress ${heroName} has made while you have been away. Clearing browser data removes local saves.`);
}
function awayTime(ms) { const seconds=BigInt(Math.floor(ms/1000)); if(seconds<60n)return `${seconds}s`; if(seconds<3600n)return `${seconds/60n}m ${seconds%60n}s`; if(seconds<86400n)return `${seconds/3600n}h ${(seconds%3600n)/60n}m`; return `${format(seconds/86400n)} days ${(seconds%86400n)/3600n}h`; }
function showSummary(summary) {
  if (!summary || summary.elapsedMs < 15000) return;
  text('reportTitle', `${heroName} kept travelling.`);
  text('reportIntro', 'Warm windows, uncertain weather, and the kindness of strangers: the road has been quietly writing another chapter.');
  $('reportStats').replaceChildren();
  const d = summary.deltas;
  for (const [label, value] of [['Levels Gained',format(d.level)],['Quests Completed',format(d.completed)],['Time Away',awayTime(summary.elapsedMs)],['Maps Completed',format(d.circuits)],['Battles Won',format(d.wins)],['Discoveries',format(d.discoveries)],['Gold Earned',money(d.earned)],['Healing Potions Found',format(d.potionsFound)]]) {
    const box = document.createElement('div'), strong = document.createElement('strong'); strong.textContent = value; box.append(strong, document.createTextNode(label)); $('reportStats').append(box);
  }
  $('reportLevels').hidden = true; $('reportDream').hidden = true; text('reportTimer', ''); openRecap();
}
$('closeCard').onclick = () => { state.card = null; $('eventCard').hidden = true; };
async function boot() {
  let loaded=loadSavedAdventure();
  if (needsCreation(loaded)) { loaded=null; openCreator(); }
  if (loaded) { state = loaded.state; savedAt = loaded.savedAt; }
  world = worldFor(state); heroName = state.name; hero = state.hero; heroColour=state.heroColour || 'original';
  if (loaded && owner) { pendingSummary = awayFor(Math.max(0, Date.now() - savedAt)); world=worldFor(state); }
  await loadAssets();
  lastTime=0;
  ready = true; text('creationStatus',''); previewHero(); $('loading').hidden = true; updateGuide(); setMode(mode); updateUI(); draw(); registerAgentControl(); if (owner) persist(); showSummary(pendingSummary); requestAnimationFrame(loop);
}
// A browser lock grants one writer. Other tabs render the latest saved state.
window.addEventListener('pagehide', () => { closed = true; });
const holdLock = () => closed ? Promise.resolve() : new Promise(resolve => window.addEventListener('pagehide', resolve, {once:true}));
if (navigator.locks) navigator.locks.request(SAVE_KEY, {ifAvailable:true}, async lock => {
  owner = !!lock; await boot();
  if (lock) await holdLock();
  else navigator.locks.request(SAVE_KEY, async () => {
    if (closed) return;
    owner = true; let loaded;
    try { loaded=loadSavedAdventure(); } catch(error) { failureNotice(error.message,()=>location.reload()); await holdLock(); return; }
    if (loaded && !needsCreation(loaded)) { closeCreator(); state = loaded.state; pendingSummary = awayFor(Math.max(0,Date.now()-loaded.savedAt)); world = worldFor(state); heroName=state.name;hero=state.hero;heroColour=state.heroColour || 'original'; }
    else openCreator();
    previewHero();
    lastTime=0; persist(); await refreshMap(); updateGuide(); updateUI(); showSummary(pendingSummary); await holdLock();
  });
}).catch(error => { console.error(error); failureNotice(`The adventure could not start: ${error.message}`,()=>location.reload()); });
else { $('loading').textContent = 'This browser needs Web Locks support to save the adventure safely. Please use a current browser.'; }
// Read-only state inspection supports deterministic browser QA without a game control.
if (document.documentElement.hasAttribute('data-test-session')) window.adventure = { snapshot: () => ({state, world, mode, owner}) };

// Invoked only by the non-shipping browser QA page, which uses its own save key.
export async function testScenario({terrain,away=0,card=null,recovery=false,comparisonSeed=null,border=null,exportName=null}={}) {
  if (!document.documentElement.hasAttribute('data-test-session') || !ready) return;
  if(comparisonSeed!==null){state=freshGame(comparisonSeed);world=worldFor(state);paused=true;mode='full-map';await refreshMap();}
  if(border!==null)comparisonBorder=border;
  if (terrain) {
    let seed=1; while(REGIONS[Math.floor(seededRandom(seed)()*REGIONS.length)]!==terrain)seed++;
    state=freshGame(seed);world=worldFor(state);heroName=state.name;hero=state.hero;await refreshMap();
  }
  if(away){const summary=catchUp(state,away);world=worldFor(state);await refreshMap();showSummary(summary);}
  if(card)state.card={title:card==='boss'?'The guardian gives way':'The map is complete',text:'A little more room on the road.',seconds:card==='boss'?10:5};
  if(recovery){const {defeat}=await import('./adventure-engine.js');state.target={...world.stops.find(o=>o.type==='combat')};state.stop=world.stops.indexOf(world.stops.find(o=>o.id===state.target.id));state.enemy={hp:.5,level:state.level+2n,offset:2,seed:1,retries:0,round:3};defeat(state);}
  persist();updateUI();draw();
  if(exportName&&location.port==='4189'){const response=await fetch('/capture/'+exportName,{method:'POST',body:scene.toDataURL('image/png')});if(!response.ok)throw Error('Capture failed');document.getElementById('qaTools').dataset.saved=exportName;}
}
