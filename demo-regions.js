export const REGIONS = ['fresh', 'dry', 'cool', 'lush', 'desert', 'volcanic', 'twilight'];
export const TERRAIN_ROOT = 'bible-remake-sets/palette-sets-v1/';
export const PROPS_ROOT = 'bible-remake-sets/props-regional-v1/';
export const MANIFESTS = [TERRAIN_ROOT + 'palette-manifest.json', PROPS_ROOT + 'regional-props-manifest.json'];
export const REGIONAL_NAMES = { trees: 'terrain-tiles/tree-small', boulders: 'terrain-tiles/rock-small', shrubs: 'prop-sprites/bush', flowers: 'prop-sprites/flower', crystals: 'prop-sprites/crystal' };
export function regionFiles(terrain, props, region) {
  if (!REGIONS.includes(region)) throw new Error('Unknown region');
  return { terrain: TERRAIN_ROOT + terrain.selectedAtlases[region], ...Object.fromEntries(Object.keys(REGIONAL_NAMES).map(family => [family, PROPS_ROOT + props[family][region]])) };
}
