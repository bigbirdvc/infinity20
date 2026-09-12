import { WIDTH, HEIGHT, ENEMIES, findPath, titleCase } from './demo-world.js';
export { WIDTH, HEIGHT, ENEMIES, titleCase };
export const REGIONS = ['fresh','dry','cool','lush','desert','volcanic','twilight'];
export function rng(seed) { let n=seed>>>0; return () => { n=(Math.imul(n,1664525)+1013904223)>>>0; return n/4294967296; }; }
export const nextSeed = seed => (Math.imul(seed,1664525)+1013904223)>>>0;
const words = {
 fresh:['Apple','Clover','Morning','Moss'], dry:['Amber','Briar','Ochre','Dust'], cool:['Silver','Frost','Pine','Snow'],
 lush:['Fern','Willow','Emerald','Rain'], desert:['Saffron','Dune','Mirage','Copper'], volcanic:['Cinder','Ember','Basalt','Ash'], twilight:['Moon','Star','Violet','Dusk']
};
const endings=['brook','haven','hollow','reach','ford','vale','wood','rest'];
const weights={fresh:['slime','goblin','wolf'],dry:['bandit','orc','spider'],cool:['wolf','troll','golem'],lush:['treant','spider','slime'],desert:['skeleton','bandit','golem'],volcanic:['drake','ogre','warlock'],twilight:['wraith','bat','fallen-knight']};
export const OPTIONAL_TYPES=['discovery','treasure','rest','traveller','shrine'];
const questText=[
 ['The missing kettle','A cottage has misplaced its kettle. Rowan follows the hopeful smell of tea.','The kettle returns home. Its owner insists it was exploring.'],
 ['A light for the lane','The pathkeeper asks Rowan to carry a lantern to the far end of the lane.','A warm light welcomes the next weary traveller.'],
 ['Letters in the rain','A little bundle of letters needs a reliable pair of boots. Rowan volunteers both.','The letters arrive dry, though the boots decline to comment.'],
 ['The patient garden','A gardener asks Rowan to bring a handful of seeds to the village beds.','Tomorrow has been planted. The gardener promises to water it.'],
 ['A song for the bridge','The ferryman has forgotten the end of an old song. Someone across the river remembers.','The song is whole again. The river supplies the accompaniment.']
];
export function generateWorld(seed, mapNumber=1n, previous='', recent=[], boss=false) {
 const r=rng(seed), pick=a=>a[Math.floor(r()*a.length)];
 const region=pick(REGIONS.filter(x=>x!==previous));
 let name=pick(words[region])+pick(endings); for(let i=0;recent.includes(name)&&i<32;i++) name=pick(words[region])+pick(endings);
 if(recent.includes(name)) name=words[region].flatMap(prefix=>endings.map(ending=>prefix+ending)).find(candidate=>!recent.includes(candidate));
 const riverX=9+Math.floor(r()*9), top=3+Math.floor(r()*3), bottom=11+Math.floor(r()*4), left=3+Math.floor(r()*3), right=19+Math.floor(r()*3);
 const tiles=Array.from({length:HEIGHT},(_,y)=>Array.from({length:WIDTH},(_,x)=>({x,y,kind:x===riverX?'water':'meadow',path:false})));
 const road=(x1,y1,x2,y2)=>{let x=x1,y=y1;while(true){tiles[y][x].path=true;tiles[y][x].kind=x===riverX?'bridge':'path';if(x===x2&&y===y2)break;if(x!==x2)x+=Math.sign(x2-x);else y+=Math.sign(y2-y);}};
 // Two crossings joined by irregular branches; bank-side trails can end naturally.
 road(left,top,right,top);
 road(left+1,bottom,right-1,bottom);
 road(left,top,left,8); road(left,8,left+1,8); road(left+1,8,left+1,bottom);
 road(right,top,right,7); road(right,7,right-1,7); road(right-1,7,right-1,bottom);
 for(let i=0;i<7;i++) {
   const bank=r()<.5, x=bank?left:right-1, y=top+Math.floor(r()*(bottom-top+1));
   const end=bank?2+Math.floor(r()*(riverX-4)):riverX+2+Math.floor(r()*(21-riverX));
   road(x,y,end,y);
   if(r()<.6)road(end,y,end,Math.max(2,Math.min(15,y+(r()<.5?-2:2))));
 }
 const world={generation:3,seed,region,name,mapNumber,riverX,tiles,blocked:new Set(),trees:[],buildings:[],objects:[],quests:[],stops:[],entrance:{x:left,y:top}};
 const add=(kind,type,extra={})=>{const o={id:'stop-'+world.stops.length,kind,type,group:type==='combat'?'enemy-sprites':'prop-sprites',...extra};world.objects.push(o);world.stops.push(o);return o;};
 const quests=1+Math.floor(r()*3), combats=3+Math.floor(r()*5);
 for(let i=0;i<quests;i++){const q=pick(questText.filter(q=>!world.quests.some(existing=>existing.title===q[0])));world.quests.push({title:q[0]});add('npc','quest-start',{quest:i,title:q[0],text:q[1]});add('chest','quest',{quest:i,title:q[0],text:q[2]});}
 let enemy='';for(let i=0;i<combats;i++){const pool=r()<.75?weights[region]:ENEMIES;const available=pool.filter(x=>x!==enemy);enemy=pick(available);add(enemy,'combat',{boss:boss&&i===combats-1,roll:Math.floor(r()*4294967296)});}
 // Shuffle quest pairs and combats, then order quests so each acceptance precedes completion.
 for(let i=world.stops.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[world.stops[i],world.stops[j]]=[world.stops[j],world.stops[i]];}
 for(let q=0;q<quests;q++){const a=world.stops.findIndex(o=>o.type==='quest-start'&&o.quest===q),b=world.stops.findIndex(o=>o.type==='quest'&&o.quest===q);if(a>b)[world.stops[a],world.stops[b]]=[world.stops[b],world.stops[a]];}
 // Combat adjacency is checked in visit order, including across non-combat stops.
 enemy='';for(const o of world.stops.filter(o=>o.type==='combat')){if(o.kind===enemy)o.kind=pick(ENEMIES.filter(x=>x!==enemy));enemy=o.kind;}
 const shuffled=[...OPTIONAL_TYPES];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}const optional=shuffled.slice(0,1+Math.floor(r()*4));world.encounterTypes=['combat','quest',...optional];
 for(const type of optional)add({discovery:'crystal',treasure:'chest',rest:'campfire',traveller:'bench',shrine:'shrine'}[type],type);
 add('exit','exit');
 // Houses and inns have a front doorstep connected to the existing road network.
 const clear=(x,y,w,h)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(xx<1||yy<1||xx>=WIDTH-1||yy>=HEIGHT-1||!tiles[yy]?.[xx]||tiles[yy][xx].path||xx===riverX||world.blocked.has(`${xx},${yy}`))return false;return true;};
 for(let i=0;i<150&&world.buildings.length<6;i++) {
   const x=2+Math.floor(r()*19),y=2+Math.floor(r()*12);
   if(!clear(x-1,y-1,4,4))continue;
   const kind=pick(['house','inn','tower','ruins']),building={kind,x,y,w:2,h:2};
   world.buildings.push(building);
   for(let yy=y;yy<y+2;yy++)for(let xx=x;xx<x+2;xx++)world.blocked.add(`${xx},${yy}`);
   if(kind==='house'||kind==='inn') {
     building.door={x:x+1,y:y+2};
     const nearest=tiles.flat().filter(t=>t.path&&t.x!==riverX).sort((a,b)=>Math.abs(a.x-building.door.x)+Math.abs(a.y-building.door.y)-Math.abs(b.x-building.door.x)-Math.abs(b.y-building.door.y))[0];
     const route=findPath(world,building.door,nearest);
     for(const p of [building.door,...route]){tiles[p.y][p.x].path=true;tiles[p.y][p.x].kind=p.x===riverX?'bridge':'path';}
   }
 }
 // Match the previous scene's 30 objects and 20% on-road / 80% off-road mix.
 const dressing=['sign','bench','mushroom','flower','log','well','shrine','pebble','grave','campfire','bush','crystal'];
 while(world.objects.length<30)world.objects.push({id:'scenery-'+world.objects.length,kind:pick(dressing),group:'prop-sprites',type:'scenery'});
 const available=tiles.flat().filter(t=>t.x>1&&t.x<WIDTH-2&&t.y>1&&t.y<HEIGHT-2&&t.x!==riverX&&!world.blocked.has(`${t.x},${t.y}`)&&!(t.x===left&&t.y===top)&&!world.buildings.some(b=>b.door&&b.door.x===t.x&&b.door.y===t.y));
 const used=new Set(), protectedCells=new Set();
 // Shuffle placement order so quest and combat objects share the same ratio.
 const placements=[...world.objects];for(let i=placements.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[placements[i],placements[j]]=[placements[j],placements[i]];}
 for(let i=0;i<placements.length;i++) {
   const choices=available.filter(t=>Boolean(t.path)===(i<6)&&!used.has(`${t.x},${t.y}`));
   const p=pick(choices);Object.assign(placements[i],{x:p.x,y:p.y});used.add(`${p.x},${p.y}`);
   for(const [dx,dy]of [[0,0],[1,0],[-1,0],[0,1],[0,-1]])protectedCells.add(`${p.x+dx},${p.y+dy}`);
 }
 let p=world.entrance,total=0;
 for(const stop of world.stops){const route=approachPath(world,p,stop);if(!route)throw Error('Disconnected encounter');stop.route=route;stop.approach=route.at(-1)||{x:p.x,y:p.y};total+=route.length;for(const pt of [p,...route])protectedCells.add(`${pt.x},${pt.y}`);p=stop.approach;}
 // Keep the verified approaches clear when adding solid trees and boulders.
 for(let y=1;y<HEIGHT-1;y++)for(let x=1;x<WIDTH-1;x++)if(r()<.15&&clear(x-1,y-1,3,3)&&!protectedCells.has(`${x},${y}`)){
   world.trees.push({x,y,size:1,kind:r()<.18?'rock-small':'tree-small'});world.blocked.add(`${x},${y}`);
 }
 // Large scenery blocks its full footprint; reserve all already verified routes.
 for(const kind of ['tree-large','rock-large'])for(let attempt=0;attempt<100;attempt++){
   const x=2+Math.floor(r()*20),y=2+Math.floor(r()*14);
   if(!clear(x-2,y-2,4,4))continue;
   const footprint=[{x:x-1,y:y-1},{x,y:y-1},{x:x-1,y},{x,y}];
   if(footprint.some(p=>protectedCells.has(`${p.x},${p.y}`)))continue;
   world.trees.push({x,y,size:2,kind});for(const p of footprint)world.blocked.add(`${p.x},${p.y}`);break;
 }
 world.walkStep=.48;
 world.duration=total*.48+combats*5+(world.stops.length-combats)*3;
 return world;
}

// Small props remain passable, but interactions happen beside them as before.
export function approachPath(world,from,target) {
 const routes=[[ -1,0],[0,1],[1,0],[0,-1]].map(([dx,dy])=>findPath(world,from,{x:target.x+dx,y:target.y+dy})).filter(Boolean);
 return routes.sort((a,b)=>a.length-b.length)[0]||null;
}
