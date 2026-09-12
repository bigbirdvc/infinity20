// The approved Soft 3D halves from Restart, plus its final balanced hero tiles.
// Rectangles are source pixels; these review sheets are not uniform atlases.
// Both camera modes use this single catalog.
const ROOT = 'bible-remake-sets/';
export const SOURCES = {
  knight: { file: ROOT + 'heroes-soft-3d-balanced/knight.png', size: [1254, 1254] },
  elf: { file: ROOT + 'heroes-soft-3d-balanced/elf.png', size: [1254, 1254] },
  mage: { file: ROOT + 'heroes-soft-3d-balanced/mage.png', size: [1254, 1254] },
  enemiesA: { file: ROOT + 'concepts/enemies-2d-and-soft-3d-a.png', size: [1536, 1024] },
  enemiesB: { file: ROOT + 'concepts/enemies-2d-and-soft-3d-b.png', size: [1536, 1024] },
  terrain: { file: ROOT + 'concepts/terrain-and-navigation-2d-and-soft-3d.png', size: [1536, 1024] },
  buildings: { file: ROOT + 'concepts/buildings-2d-and-soft-3d.png', size: [1536, 1024] },
  props: { file: ROOT + 'concepts/props-npcs-and-dressing-2d-and-soft-3d.png', size: [1536, 1024] },
};
const actor = (source, rect) => ({ source, rect, matte: true, normalize: true });
const ground = rect => ({ source: 'terrain', rect, matte: false, normalize: false });
const scenery = (source, rect) => ({ source, rect, matte: true, normalize: false });
export const SPRITES = {
  'hero-sprites': Object.fromEntries(['knight', 'elf', 'mage'].map(name => [name, { source: name, rect: [0, 0, 1254, 1254], matte: false, normalize: true }])),
  'enemy-sprites': {
    skeleton: actor('enemiesA', [256, 24, 246, 270]),
    slime: actor('enemiesA', [748, 96, 193, 190]),
    bat: actor('enemiesA', [1240, 74, 292, 220]),
    treant: actor('enemiesA', [291, 304, 282, 320]),
    goblin: actor('enemiesA', [801, 342, 244, 290]),
    wolf: actor('enemiesA', [1280, 342, 247, 295]),
    orc: actor('enemiesA', [357, 642, 380, 338]),
    troll: actor('enemiesA', [1120, 634, 408, 344]),
    spider: actor('enemiesB', [203, 132, 199, 281]),
    golem: actor('enemiesB', [580, 105, 214, 303]),
    drake: actor('enemiesB', [978, 120, 165, 288]),
    'fallen-knight': actor('enemiesB', [1330, 104, 204, 308]),
    warlock: actor('enemiesB', [209, 492, 190, 347]),
    bandit: actor('enemiesB', [585, 510, 169, 323]),
    ogre: actor('enemiesB', [989, 479, 239, 358]),
    wraith: actor('enemiesB', [1375, 504, 155, 332]),
  },
  'terrain-tiles': {
    'meadow-a': ground([845, 66, 138, 130]),
    'meadow-b': ground([1087, 70, 139, 130]),
    'meadow-c': ground([1325, 68, 140, 128]),
    'water-clear': ground([840, 285, 148, 141]),
    'water-marsh': ground([1085, 286, 144, 138]),
    'water-cool': ground([1320, 283, 151, 143]),
    path: ground([883, 510, 71, 143]),
    bridge: scenery('terrain', [1041, 473, 241, 233]),
    'river-bank': ground([1301, 490, 188, 190]),
    'tree-small': scenery('terrain', [787, 775, 151, 174]),
    'tree-large': scenery('terrain', [937, 706, 230, 267]),
    'rock-small': scenery('terrain', [1174, 812, 132, 134]),
    'rock-large': scenery('terrain', [1307, 751, 211, 224]),
  },
  'building-sprites': {
    'house-small': scenery('buildings', [844, 45, 200, 203]),
    house: scenery('buildings', [1080, 10, 395, 241]),
    'inn-small': scenery('buildings', [844, 299, 206, 190]),
    inn: scenery('buildings', [1080, 256, 424, 235]),
    'tower-small': scenery('buildings', [845, 550, 195, 203]),
    tower: scenery('buildings', [1080, 492, 393, 272]),
    'ruins-small': scenery('buildings', [823, 831, 224, 161]),
    ruins: scenery('buildings', [1070, 763, 430, 238]),
  },
  'prop-sprites': {
    chest: actor('props', [195, 100, 194, 197]),
    npc: actor('props', [593, 27, 172, 275]),
    flower: { ...actor('props', [965, 119, 160, 158]), matteEdge: 1 },
    mushroom: actor('props', [1337, 112, 184, 188]),
    shrine: actor('props', [200, 319, 212, 258]),
    well: actor('props', [611, 328, 202, 253]),
    campfire: actor('props', [978, 360, 191, 222]),
    sign: actor('props', [1350, 357, 177, 215]),
    grave: actor('props', [194, 585, 186, 222]),
    bench: actor('props', [405, 620, 344, 189]),
    exit: actor('props', [1008, 578, 233, 235]),
    bush: actor('props', [1371, 636, 158, 172]),
    log: actor('props', [257, 822, 274, 163]),
    pebble: actor('props', [715, 864, 141, 107]),
  },
};
export const MEADOW_VARIANTS = ['meadow-a', 'meadow-b', 'meadow-c'];
export function meadowVariant(x, y) {
  return MEADOW_VARIANTS[((Math.imul(x + 19, 73856093) ^ Math.imul(y + 37, 19349663)) >>> 0) % 3];
}
