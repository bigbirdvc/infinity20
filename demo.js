import {loadArt,prefetchRegion} from './game-assets.js';
import {readSave} from './adventure-storage.js';
import {encounterProgress} from './adventure-engine.js';
import { WIDTH, HEIGHT, titleCase, borderTrees, nextSeed, rng as seededRandom } from './adventure-world.js';
import { freshGame, worldFor, advanceGame, format, money, xpNeeded, levelBase, maxHealth } from './adventure-engine.js';
import { SAVE_KEY as LIVE_SAVE_KEY, encode, decode, catchUp } from './adventure-save.js';
import { REGIONS } from './demo-regions.js';
import { paintMeadow, paintRoads, paintDesertRiver, terrainPosition } from './demo-terrain.js';

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
  $('region').disabled = true;
  const previous = regionalFrames;
  try {
    const nextFrames = await loadArt('regions',next);
    regionalFrames = nextFrames;
    const landscape = makeLandscape('soft-3d', next);
    const oldLandscape = landscapes.get('full-map');
    landscapes.set('full-map', landscape); landscapes.set('follow-view', landscape);
    if (oldLandscape) oldLandscape.width = oldLandscape.height = 1;
    region = next; prepareNextRegion(); canvas.dataset.region = next; $('region').value = next; $('region').title = 'Matching terrain and props';
    draw();
  } catch (error) {
    regionalFrames = previous; $('region').value = region;
    $('region').title = `Could not load palette: ${error.message}`;
    throw error;
  } finally { $('region').disabled = false; }
}

function makeLandscape(style, palette) {
  const ground = document.createElement('canvas'); ground.width = worldWidth; ground.height = worldHeight;
  const ctx = ground.getContext('2d'); ctx.imageSmoothingEnabled = true;
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

function draw(now = 0) {
  if (!ready || creating || loadingRegion || artworkFailed) return;
  const p = terrainPosition(state, world);
  context.imageSmoothingEnabled = true;
  context.clearRect(0, 0, worldWidth, worldHeight);
  context.drawImage(landscapes.get(mode), 0, 0);
  // Foot-point depth ordering lets the hero pass behind tall scenery.
  const drawables = [];
  for (const tree of [...world.trees,...(comparisonBorder?borderTrees(world.seed,world.riverX):[])]) drawables.push({ z: tree.y + .95, draw: () => {
    sprite(context, mode, 'terrain-tiles', tree.kind, (tree.x + 1 - tree.size) * TILE, (tree.y + 1 - tree.size) * TILE, tree.size * TILE);
  } });
  for (const b of world.buildings) drawables.push({ z: b.y + b.h - .1, draw: () => {
    sprite(context, mode, 'building-sprites', b.kind, b.x * TILE, b.y * TILE, b.w * TILE, b.h * TILE);
  } });
  for (const object of world.objects) drawables.push({ z: object.y + (object.size ? .94 : .54), draw: () => {
    const enemy = object.group === 'enemy-sprites';
    const scale = object.size || (['flower', 'bush'].includes(object.kind) ? .45 : enemy || ['shrine', 'well', 'npc', 'exit'].includes(object.kind) ? 1 : .84);
    const faded = state.visited.has(object.id) ? .46 : 1;
    sprite(context, mode, object.group, object.kind, (object.size ? object.x + 1 - scale : object.x + .5 - scale / 2) * TILE, (object.y + (object.size ? 1 : .6) - scale) * TILE, TILE * scale, TILE * scale, faded);
  } });
  for (const object of world.objects.filter(o => o.type === 'quest' || o.type === 'discovery')) {
    context.fillStyle = object.type === 'quest' ? '#d6ae48' : '#add6e9';
    context.globalAlpha = state.visited.has(object.id) ? .3 : 1;
    context.beginPath(); context.arc((object.x + .5) * TILE, (object.y + .54) * TILE, 7, 0, Math.PI * 2); context.fill(); context.globalAlpha = 1;
  }
  drawables.push({ z: p.y + .54, draw: () => {
    sprite(context, mode, 'hero-sprites', hero, p.x * TILE, (p.y - .4) * TILE, TILE);
  } });
  drawables.sort((a, b) => a.z - b.z).forEach(item => item.draw());

  const box = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(box.width * dpr)), height = Math.max(1, Math.round(box.height * dpr));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; camera = null; }
  view.fillStyle = '#132b23'; view.fillRect(0, 0, width, height);
  view.imageSmoothingEnabled = true;
  const scale = Math.min(width / worldWidth, (height - 52 * dpr) / worldHeight);
  if (mode === 'full-map') {
    const w = worldWidth * scale, h = worldHeight * scale;
    view.drawImage(scene, 0, 0, worldWidth, worldHeight, Math.round((width - w) / 2), Math.round((height - 44 * dpr - h) / 2), w, h);
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
  }
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
  text('viewLabel', mode === 'full-map' ? 'Full Map · Soft 3D · 24 × 18' : 'Follow · Soft 3D');
  draw(performance.now());
}
function setPaused(value) { paused = value; draw(performance.now()); }
function restart() { if (!owner) return; state = freshGame(state.seed); state.name = heroName; state.hero = hero; state.heroColour = heroColour; state.characterCreated = true; world = worldFor(state); persist(); refreshMap(); camera = null; eventKey = ''; questKey = ''; portraitsKey = ''; updateGuide(); updateUI(); }

document.querySelectorAll('[data-zoom]').forEach(button => button.onclick = () => setMode(button.dataset.zoom === 'full' ? 'full-map' : 'follow-view'));
document.querySelectorAll('[data-speed]').forEach(button => button.onclick = () => {
  speed = Number(button.dataset.speed);
  document.querySelectorAll('[data-speed]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === speed)));
});
$('restart').remove();
const regionLabel = document.createElement('label'); regionLabel.textContent = 'Region ';
const regionSelect = document.createElement('select'); regionSelect.id = 'region'; regionSelect.setAttribute('aria-label', 'Terrain palette'); regionSelect.disabled = true;
for (const name of REGIONS) { const option = document.createElement('option'); option.value = name; option.textContent = titleCase(name); regionSelect.append(option); }
regionLabel.append(regionSelect); regionLabel.hidden = true; $('zoomControl').before(regionLabel);
$('zoomControl').remove();
regionSelect.onchange = () => selectRegion(regionSelect.value).catch(error => { console.error(error); alert('This palette could not load. Please try again.'); });

const music = new Audio(); music.preload='none'; music.loop = true; music.volume = .22;
// Keep the map itself clear: the view controls belong with the rest of the adventure controls.
const mapToolbar = document.querySelector('.demo-toolbar');
if (mapToolbar) {
  document.querySelector('.header-tools')?.append(mapToolbar);
}
$('music').onclick = async () => {
  if(!music.getAttribute('src'))music.src='meadow.wav';
  if (music.paused) { try { await music.play(); } catch { text('music', '♫ Retry sound'); return; } } else music.pause();
  text('music', music.paused ? '♫ Sound off' : '♫ Sound on'); $('music').setAttribute('aria-pressed', String(!music.paused));
};
$('deleteCharacter').onclick = () => { $('deleteWarning').hidden = false; $('deleteActions').hidden = false; $('cancelDelete').focus(); };
$('cancelDelete').onclick = () => { $('deleteWarning').hidden = true; $('deleteActions').hidden = true; $('deleteCharacter').focus(); };
$('confirmDelete').onclick = () => {
  if (!owner) return; try { localStorage.removeItem(SAVE_KEY); if(SAVE_KEY===LIVE_SAVE_KEY)localStorage.removeItem('infinite-adventure-v1'); } catch { text('deleteError','The browser could not remove this save.'); return; } creating = true; $('deleteWarning').hidden = true; $('deleteActions').hidden = true;
  openCreator();
};
function needsCreation(loaded) { return !loaded || (!loaded.state.characterCreated && loaded.state.name.trim().toLowerCase() === 'rowan'); }
function openCreator() {
  creating=true; pendingSummary=null; $('recap').hidden=true; text('creationStatus',ready?'':'Loading the adventure artwork…');
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
$('dismiss').onclick = () => { $('recap').hidden = true; };
new ResizeObserver(() => draw(performance.now())).observe(canvas);
document.addEventListener('visibilitychange', () => {
  lastTime = 0; if (!owner || creating || saveBlocked || loadingRegion || artworkFailed) return;
  if (document.hidden) persist();
  else { const oldSeed=world.seed; pendingSummary = catchUp(state, Math.max(0, Date.now() - savedAt)); world = worldFor(state); persist(); if(world.seed!==oldSeed) refreshMap(); showSummary(pendingSummary); }
});
window.addEventListener('pagehide', () => { if (!document.hidden) persist(); });
setInterval(() => { if (!document.hidden && ready && !creating) persist(); }, 5000);
window.addEventListener('storage', event => { if (!owner && event.key === SAVE_KEY && event.newValue) { const loaded = decode(event.newValue); if (loaded && !needsCreation(loaded)) { closeCreator(); const oldSeed=state.seed; state = loaded.state; world = worldFor(state); heroName = state.name; hero = state.hero; heroColour=state.heroColour || 'original'; if(oldSeed!==state.seed)refreshMap(); updateGuide(); updateUI(); } } });


function loop(now) {
  if (now-frameTime < 1000/30) { requestAnimationFrame(loop); return; }
  frameTime=now;
  const dt = lastTime ? Math.max(0, (now - lastTime) / 1000) : 0; lastTime = now;
  if (ready && !creating && !document.hidden) {
    if (!paused && owner && !loadingRegion) { if (dt > 5) { const oldSeed=world.seed; pendingSummary = catchUp(state, dt * 1000); world = worldFor(state); if(world.seed!==oldSeed) refreshMap(); showSummary(pendingSummary); persist(); } else if (advanceGame(state, world, dt * speed, dt)) { world = worldFor(state); refreshMap(); persist(); } }
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
  $('reportLevels').hidden = true; $('reportDream').hidden = true; text('reportTimer', ''); $('recap').hidden = false;
}
$('closeCard').onclick = () => { state.card = null; $('eventCard').hidden = true; };
async function boot() {
  let loaded=loadSavedAdventure();
  if (needsCreation(loaded)) { loaded=null; openCreator(); }
  if (loaded) { state = loaded.state; savedAt = loaded.savedAt; }
  world = worldFor(state); heroName = state.name; hero = state.hero; heroColour=state.heroColour || 'original';
  if (loaded && owner) { pendingSummary = catchUp(state, Math.max(0, Date.now() - savedAt)); world=worldFor(state); }
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
    if (loaded && !needsCreation(loaded)) { closeCreator(); state = loaded.state; pendingSummary = catchUp(state, Math.max(0,Date.now()-loaded.savedAt)); world = worldFor(state); heroName=state.name;hero=state.hero;heroColour=state.heroColour || 'original'; }
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
