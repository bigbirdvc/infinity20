// Approved production frames replace presentation-sheet cutouts. Preserve PNG alpha.
export const PRODUCTION_ROOT = 'bible-remake-sets/runtime-exports-v1/';
export const PRODUCTION_FRAMES = {
  ...Object.fromEntries(['skeleton','slime','bat','goblin','wolf','orc','ogre','troll','spider','wraith','golem','drake','fallen-knight','warlock','bandit'].map(name => [`enemy-sprites/${name}`, `enemies/${name}${name === 'skeleton' ? '' : '-canonical'}`])),
  ...Object.fromEntries(Object.entries({chest:'chest',npc:'npc-villager-basket',flower:'quest-flower',mushroom:'mushroom',shrine:'shrine',well:'well',campfire:'campfire',sign:'signpost',grave:'grave',bench:'bench',exit:'exit-arch'}).map(([name,id]) => [`prop-sprites/${name}`, `${name === 'npc' ? 'npcs' : 'interactables'}/${id}-1x1`])),
  'prop-sprites/log': 'environment/log-fallen-1x1-fresh',
  'prop-sprites/pebble': 'environment/pebbles-1x1-fresh',
  'prop-sprites/bush': 'environment/shrubs-1x1-fresh',
  'terrain-tiles/bridge': 'navigation/bridge-wood-ew-1x1',
  'terrain-tiles/tree-small': 'environment/trees-1x1-fresh',
  'terrain-tiles/tree-large': 'environment/tree-broadleaf-2x2-fresh',
  'terrain-tiles/tree-conifer-large': 'environment/tree-conifer-2x2-fresh',
  'terrain-tiles/tree-crooked-large': 'environment/tree-crooked-2x2-fresh',
  'terrain-tiles/rock-layered-large': 'environment/rock-layered-2x2-fresh',
  'terrain-tiles/rock-small': 'environment/boulders-1x1-fresh',
  'terrain-tiles/rock-large': 'environment/rock-rounded-2x2-fresh',
  ...Object.fromEntries(Object.entries({house:'home',inn:'shop',tower:'tower',ruins:'ruin'}).flatMap(([name,id]) => [[`building-sprites/${name}`,`buildings/${id}-2x2-fresh`],[`building-sprites/${name}-small`,`buildings/${id}-1x1-fresh`]])),
};
export async function loadProductionFrames(frames, region='fresh', regionalOnly=false) {
  const response = await fetch(PRODUCTION_ROOT + 'manifest.json');
  if (!response.ok) throw new Error('Production sprite manifest could not load');
  const manifest = await response.json(), images = new Map();
  for (const [key,baseId] of Object.entries(PRODUCTION_FRAMES)) {
    if(regionalOnly && !key.startsWith('building-sprites/') && !key.endsWith('-large'))continue;
    const id=regionalOnly?baseId.replace(/-fresh$/, '-'+region):baseId;
    const asset = manifest.assets.find(a => a.id === id);
    if (!asset) throw new Error(`Missing production sprite: ${id}`);
    const {atlas,atlasRect:r} = asset.runtime;
    if (!images.has(atlas)) { const image = new Image(); image.src = PRODUCTION_ROOT + atlas; await image.decode(); images.set(atlas,image); }
    frames.set(key,{image:images.get(atlas),x:r.x,y:r.y,w:r.width,h:r.height});
  }
}
