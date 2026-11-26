// World generation 8: destinations first, then roads routed between them.
// The world is still a 24×18 grid underneath. Roads are found with an
// eight-way search over a gently noisy cost field, so they bend, merge and
// run diagonally; the renderer then draws them (and walks the hero along
// them) as smooth curves through the tile centres. Scenery is placed in
// small scenes — a village, a camp, a graveyard, forest clumps, rock
// outcrops — instead of being spread evenly.
import { WIDTH, HEIGHT, ENEMIES, findPath, titleCase } from './demo-world.js';
import { borderTrees as classicBorderTrees } from './adventure-world-v7.js';
export { WIDTH, HEIGHT, ENEMIES, titleCase };
export const REGIONS = ['fresh','dry','cool','lush','desert','volcanic','twilight'];
export function rng(seed) { let n=seed>>>0; return () => { n=(Math.imul(n,1664525)+1013904223)>>>0; return n/4294967296; }; }
export const nextSeed = seed => (Math.imul(seed,1664525)+1013904223)>>>0;
// Generation 6–7 maps still draw their original perimeter.
export const borderTrees = classicBorderTrees;
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
// Per-region mood for big trees and the weather a map may have.
const BIG_TREES={fresh:['tree-large','tree-large','tree-crooked-large'],dry:['tree-crooked-large','tree-large'],cool:['tree-conifer-large','tree-conifer-large','tree-large'],
 lush:['tree-large','tree-crooked-large','tree-large'],desert:['tree-crooked-large'],volcanic:['tree-crooked-large','tree-conifer-large'],twilight:['tree-crooked-large','tree-conifer-large','tree-large']};
const FOREST={fresh:.58,dry:.66,cool:.56,lush:.52,desert:.74,volcanic:.68,twilight:.56};
const WEATHER={fresh:['clear','clear','clear','cloudy','rain'],dry:['clear','clear','cloudy'],cool:['clear','cloudy','snow','snow','fog'],lush:['clear','cloudy','rain','rain','fog'],
 desert:['clear','clear','clear','haze'],volcanic:['clear','haze','haze'],twilight:['clear','fog','fog','cloudy']};

const STEPS=[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
const K=(x,y)=>`${x},${y}`;
function noise(seed){
 const hash=(x,y)=>{let n=Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(seed|0,1442695041);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296;};
 const s=t=>t*t*(3-2*t);
 return(x,y)=>{const x0=Math.floor(x),y0=Math.floor(y),fx=s(x-x0),fy=s(y-y0),a=hash(x0,y0),b=hash(x0+1,y0),c=hash(x0,y0+1),d=hash(x0+1,y0+1);return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy;};
}

export function generateWorld(seed, mapNumber=1n, previous='', recent=[], boss=false, generation=8) {
 for(let attempt=0;attempt<12;attempt++){
   try{return buildWorld(seed,attempt,mapNumber,previous,recent,boss,generation);}catch(error){if(attempt===11)throw error;}
 }
}

function buildWorld(seed, attempt, mapNumber, previous, recent, boss, generation) {
 // The first draw picks the region; the page predicts the next region with it.
 const r=rng(seed), pick=a=>a[Math.floor(r()*a.length)];
 const region=pick(REGIONS.filter(x=>x!==previous));
 let name=pick(words[region])+pick(endings); for(let i=0;recent.includes(name)&&i<32;i++) name=pick(words[region])+pick(endings);
 if(recent.includes(name)) name=words[region].flatMap(prefix=>endings.map(ending=>prefix+ending)).find(candidate=>!recent.includes(candidate));
 const R=rng((seed^0x2f6b1d93)+attempt*7919), int=(lo,hi)=>lo+Math.floor(R()*(hi-lo+1)), chance=p=>R()<p, choose=a=>a[Math.floor(R()*a.length)];
 const nA=noise(seed^0x51ed), nB=noise(seed^0xbeef), nC=noise(seed^0x7a11), nD=noise(seed^0x0dd5);
 const forestField=(x,y)=>nA(x/4.1,y/4.1)*.72+nA(x/1.8+31,y/1.8+17)*.28;
 const rockField=(x,y)=>nB(x/3.3,y/3.3)*.75+nB(x/1.5+9,y/1.5+3)*.25;
 const flowerField=(x,y)=>nC(x/2.6,y/2.6);
 const W=WIDTH,H=HEIGHT;
 const tiles=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>({x,y,kind:'meadow',path:false})));
 const tile=(x,y)=>tiles[y]?.[x];
 const world={generation,diagonal:true,seed,region,name,mapNumber,tiles,blocked:new Set(),trees:[],border:[],buildings:[],objects:[],quests:[],stops:[],roads:[],
   water:{kind:'none',rivers:[],pools:[]},bridges:[],scenes:[],weather:choose(WEATHER[region])};
 const inside=(x,y)=>x>=1&&y>=1&&x<W-1&&y<H-1;
 const water=(x,y)=>tile(x,y)?.kind==='water';
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const reserved=new Set(), soft=new Map(); // reserved: roads may not pass; soft: extra road cost

 // ---- Water -------------------------------------------------------------
 const waterRoll=R();
 const waterKind=region==='desert'?(waterRoll<.55?'ponds':waterRoll<.8?'lake':'river-v'):waterRoll<.33?'river-v':waterRoll<.58?'river-h':waterRoll<.82?'lake':'ponds';
 world.water.kind=waterKind;
 if(waterKind==='river-v'||waterKind==='river-h'){
   const vertical=waterKind==='river-v', length=vertical?H:W, across=vertical?W:H;
   const base=vertical?int(7,16):int(5,12), amp=.7+R()*(vertical?1.5:1.1), wave=Math.PI*2/(13+R()*12), phase=R()*Math.PI*2;
   const centre=t=>base+amp*Math.sin(t*wave+phase);
   const points=[];for(let t=-2;t<=length+1;t++)points.push(vertical?{x:centre(t),y:t}:{x:t,y:centre(t)});
   world.water.rivers.push({points,width:.96,vertical});
   for(let t=0;t<length;t++)for(let a=0;a<across;a++)if(Math.abs(a-centre(t))<=.56){const x=vertical?a:t,y=vertical?t:a;tiles[y][x].kind='water';}
   // Bridges cross where the river is a single, straight tile.
   const crossings=[];
   for(let t=3;t<length-3;t++){
     const a=Math.round(centre(t)),x=vertical?a:t,y=vertical?t:a;
     const along=vertical?[[0,-1],[0,1]]:[[-1,0],[1,0]], side=vertical?[[-1,0],[1,0],[-2,0],[2,0]]:[[0,-1],[0,1],[0,-2],[0,2]];
     if(!water(x,y)||along.some(([dx,dy])=>!water(x+dx,y+dy))||side.some(([dx,dy])=>!tile(x+dx,y+dy)||water(x+dx,y+dy)||!inside(x+dx,y+dy)))continue;
     crossings.push({x,y,t});
   }
   if(!crossings.length)throw Error('No river crossing');
   const first=choose(crossings.filter(c=>c.t>=4&&c.t<=length-5).length?crossings.filter(c=>c.t>=4&&c.t<=length-5):crossings);
   const chosen=[first],second=crossings.filter(c=>Math.abs(c.t-first.t)>=6);
   if(second.length&&chance(.42))chosen.push(choose(second));
   for(const c of chosen){tiles[c.y][c.x].kind='bridge';world.bridges.push({x:c.x,y:c.y,axis:vertical?'x':'y'});}
 } else {
   const pools=waterKind==='lake'?[{rx:2+R()*1.7,ry:1.5+R()*1.1}]:Array.from({length:int(1,2)},()=>{const rr=1.05+R()*.6;return {rx:rr,ry:rr*.85};});
   for(const pool of pools){
     for(let tries=0;tries<40;tries++){
       const cx=int(5,W-6),cy=int(4,H-5),cells=[];
       for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){const d=((x-cx)/pool.rx)**2+((y-cy)/pool.ry)**2+(nD(x*.8,y*.8)-.5)*.7;if(d<1)cells.push({x,y});}
       if(cells.length<2||cells.some(c=>water(c.x,c.y)||cells.length>40))continue;
       // Keep a dry ring around every pool so roads can pass.
       if(world.water.pools.some(p=>p.cells.some(a=>cells.some(b=>Math.abs(a.x-b.x)<=2&&Math.abs(a.y-b.y)<=2))))continue;
       for(const c of cells)tiles[c.y][c.x].kind='water';
       world.water.pools.push({cells,cx,cy});break;
     }
   }
 }
 const nearWater=(x,y,d=1)=>{for(let yy=y-d;yy<=y+d;yy++)for(let xx=x-d;xx<=x+d;xx++)if(water(xx,yy))return true;return false;};
 const dry=(x,y)=>tile(x,y)&&tile(x,y).kind!=='water';

 // ---- Entrance and exit on opposite edges -------------------------------
 const pairs=waterKind==='river-v'?[['left','right'],['right','left']]:waterKind==='river-h'?[['top','bottom'],['bottom','top']]:[['left','right'],['right','left'],['top','bottom'],['bottom','top']];
 const [inEdge,outEdge]=choose(pairs);
 const edgeTile=(edge,inset)=>{
   for(let tries=0;tries<60;tries++){
     const along=edge==='left'||edge==='right'?int(3,H-4):int(3,W-4);
     const x=edge==='left'?inset:edge==='right'?W-1-inset:along, y=edge==='top'?inset:edge==='bottom'?H-1-inset:along;
     if(dry(x,y)&&!nearWater(x,y,1))return {x,y};
   }
   throw Error('No edge tile');
 };
 const entrance=edgeTile(inEdge,1);
 const offMap={left:[-1.6,0],right:[1.6,0],top:[0,-1.6],bottom:[0,1.6]}[inEdge];
 world.entrance=entrance; world.entranceEdge=inEdge;
 // The exit arch stands two tiles in from its edge; the road ends just below it.
 let exitTile=null;
 for(let tries=0;tries<80&&!exitTile;tries++){
   const p=edgeTile(outEdge,outEdge==='bottom'?3:2);
   const front={x:p.x,y:p.y+1};
   if(dry(front.x,front.y)&&[[-1,0],[1,0],[0,-1]].every(([dx,dy])=>dry(p.x+dx,p.y+dy))&&dist(p,entrance)>11)exitTile=p;
 }
 if(!exitTile)throw Error('No exit');
 const exitFront={x:exitTile.x,y:exitTile.y+1};
 for(const [dx,dy] of [[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1]])reserved.add(K(exitTile.x+dx,exitTile.y+dy));

 // ---- Settlement --------------------------------------------------------
 const clear=(x,y,w,h,margin=1)=>{for(let yy=y-margin;yy<y+h+margin;yy++)for(let xx=x-margin;xx<x+w+margin;xx++){if(!tile(xx,yy)||water(xx,yy)||tile(xx,yy).kind==='bridge'||world.blocked.has(K(xx,yy))||reserved.has(K(xx,yy)))return false;if((xx<1||yy<1||xx>=W-1||yy>=H-1)&&yy>=y&&yy<y+h&&xx>=x&&xx<x+w)return false;}return true;};
 let plaza=null;
 {const candidates=[];for(let y=4;y<H-4;y++)for(let x=4;x<W-4;x++){const p={x,y};if(!dry(x,y)||nearWater(x,y,1)||dist(p,entrance)<4.5||dist(p,exitFront)<5||reserved.has(K(x,y)))continue;candidates.push({...p,score:R()+(nearWater(x,y,3)?.35:0)-dist(p,{x:W/2,y:H/2})*.03});}
  if(!candidates.length)throw Error('No village');candidates.sort((a,b)=>b.score-a.score);plaza={x:candidates[0].x,y:candidates[0].y};}
 reserved.add(K(plaza.x,plaza.y-1)); // keep a little square clear for the well
 const buildingKinds=[chance(.5)?'inn':'inn-small',...Array.from({length:int(1,3)},()=>choose(['house','house','house-small','house-small','inn-small']))];
 for(const kind of buildingKinds){
   const size=kind.endsWith('-small')?1:2;
   for(let tries=0;tries<90;tries++){
     const x=plaza.x+int(-4,3),y=plaza.y+int(-4,2)-size+1;
     if(!clear(x,y,size,size))continue;
     const door={x:x+(size===2?int(0,1):0),y:y+size};
     if(!dry(door.x,door.y)||!inside(door.x,door.y)||world.blocked.has(K(door.x,door.y))||reserved.has(K(door.x,door.y))||dist(door,plaza)>4.6||(door.x===plaza.x&&door.y===plaza.y))continue;
     world.buildings.push({kind,x,y,w:size,h:size,door,scene:'village'});
     for(let yy=y;yy<y+size;yy++)for(let xx=x;xx<x+size;xx++)world.blocked.add(K(xx,yy));
     reserved.add(K(door.x-1,door.y)); // a doorstep flower bed
     break;
   }
 }
 if(world.buildings.length<2)throw Error('Village too small');
 world.scenes.push({kind:'village',x:plaza.x,y:plaza.y});

 // ---- Landmarks ---------------------------------------------------------
 const farFrom=(p,list,d)=>list.every(q=>dist(p,q)>=d);
 const anchors=[plaza,entrance,exitFront];
 const landmarkKinds=[choose(['tower','tower-small']),choose(['ruins','ruins-small'])].slice(0,chance(.7)?2:1);
 for(const kind of landmarkKinds){
   const size=kind.endsWith('-small')?1:2;
   for(let tries=0;tries<120;tries++){
     const x=int(2,W-2-size),y=int(2,H-3-size);
     if(!clear(x,y,size,size))continue;
     const front={x:x+(size===2?int(0,1):0),y:y+size};
     if(!dry(front.x,front.y)||!inside(front.x,front.y)||reserved.has(K(front.x,front.y))||!farFrom(front,anchors,5))continue;
     world.buildings.push({kind,x,y,w:size,h:size,door:front,scene:kind.startsWith('ruins')?'ruins':'tower'});
     for(let yy=y;yy<y+size;yy++)for(let xx=x;xx<x+size;xx++)world.blocked.add(K(xx,yy));
     anchors.push(front);world.scenes.push({kind:kind.startsWith('ruins')?'ruins':'tower',x:front.x,y:front.y});break;
   }
 }
 // ---- Small scenes: graveyard and camp ---------------------------------
 let graveyard=null,camp=null;
 if(chance(region==='twilight'?.85:.45)){
   for(let tries=0;tries<120&&!graveyard;tries++){
     const w=int(2,3),h=2,x=int(2,W-2-w),y=int(2,H-4-h);
     if(!clear(x,y,w,h)||!farFrom({x:x+1,y:y+1},anchors,3.5))continue;
     const gate={x:x+Math.floor(w/2),y:y+h};
     if(!dry(gate.x,gate.y)||!inside(gate.x,gate.y)||reserved.has(K(gate.x,gate.y)))continue;
     graveyard={x,y,w,h,gate};for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)reserved.add(K(xx,yy));
     anchors.push(gate);world.scenes.push({kind:'graveyard',x:gate.x,y:gate.y,w,h,ox:x,oy:y});
   }
 }
 for(let tries=0;tries<120&&!camp;tries++){
   const p={x:int(2,W-3),y:int(2,H-3)};
   if(!dry(p.x,p.y)||nearWater(p.x,p.y,1)||!clear(p.x-1,p.y-1,3,2,0)||!farFrom(p,anchors,4))continue;
   camp=p;anchors.push(p);world.scenes.push({kind:'camp',x:p.x,y:p.y});
 }

 // ---- Roads: grow a network outward from the entrance ------------------
 const network=new Set(),addRoad=route=>{for(const p of route){network.add(K(p.x,p.y));tiles[p.y][p.x].path=true;if(tiles[p.y][p.x].kind!=='bridge')tiles[p.y][p.x].kind='path';}};
 const bridgeAt=(x,y)=>world.bridges.find(b=>b.x===x&&b.y===y);
 const passable=(x,y)=>inside(x,y)&&!world.blocked.has(K(x,y))&&!reserved.has(K(x,y))&&(!water(x,y));
 const stepCost=(x,y,dx,dy,reuse)=>{
   if(!passable(x,y))return Infinity;
   const b=bridgeAt(x,y);
   if(b&&(b.axis==='x'?dy!==0:dx!==0))return Infinity;
   let c=network.has(K(x,y))?reuse:1+1.7*nC(x*.47+5,y*.47+11);
   if(!b&&nearWater(x,y,1))c+=1.3;
   c+=soft.get(K(x,y))||0;
   return c*(dx&&dy?Math.SQRT2:1);
 };
 const route=(from,isGoal,reuse=.4)=>{
   const N=W*H,cost=new Float64Array(N).fill(Infinity),parent=new Int32Array(N).fill(-1),done=new Uint8Array(N),start=from.y*W+from.x;cost[start]=0;
   for(;;){
     let best=-1,bc=Infinity;for(let i=0;i<N;i++)if(!done[i]&&cost[i]<bc){bc=cost[i];best=i;}
     if(best<0)return null;done[best]=1;const x=best%W,y=Math.floor(best/W);
     if(best!==start&&isGoal(x,y)){const out=[];for(let id=best;id!==-1;id=parent[id])out.push({x:id%W,y:Math.floor(id/W)});return out.reverse();}
     const fromBridge=bridgeAt(x,y);
     for(const [dx,dy] of STEPS){
       const xx=x+dx,yy=y+dy;
       if(dx&&dy&&(fromBridge||!passable(x+dx,y)||!passable(x,y+dy)))continue;
       if(fromBridge&&(fromBridge.axis==='x'?dy!==0:dx!==0))continue;
       const c=stepCost(xx,yy,dx,dy,reuse);if(c===Infinity)continue;
       const id=yy*W+xx;if(bc+c<cost[id]){cost[id]=bc+c;parent[id]=best;}
     }
   }
 };
 // Graveyards are walked around, never through.
 if(graveyard)for(let yy=graveyard.y;yy<graveyard.y+graveyard.h;yy++)for(let xx=graveyard.x;xx<graveyard.x+graveyard.w;xx++){reserved.delete(K(xx,yy));soft.set(K(xx,yy),9);}
 reserved.delete(K(plaza.x,plaza.y-1));soft.set(K(plaza.x,plaza.y-1),4);
 for(const b of world.buildings)reserved.delete(K(b.door.x-1,b.door.y));
 addRoad([entrance]);
 world.roads.push([{x:entrance.x+offMap[0],y:entrance.y+offMap[1],edge:true},{...entrance}]);
 const destinations=[plaza,exitFront,...world.buildings.map(b=>b.door),...(graveyard?[graveyard.gate]:[]),...(camp?[camp]:[])];
 const pending=destinations.filter((p,i)=>destinations.findIndex(q=>q.x===p.x&&q.y===p.y)===i);
 while(pending.length){
   // Nearest destination first keeps the network tree-like and short.
   pending.sort((a,b)=>Math.min(...[...network].map(k=>{const [x,y]=k.split(',').map(Number);return Math.hypot(a.x-x,a.y-y);}))-Math.min(...[...network].map(k=>{const [x,y]=k.split(',').map(Number);return Math.hypot(b.x-x,b.y-y);})));
   const next=pending.shift();
   if(network.has(K(next.x,next.y)))continue;
   const path=route(next,(x,y)=>network.has(K(x,y)));
   if(!path)throw Error('Unreachable destination');
   addRoad(path);world.roads.push(path);
 }
 // Every bridge carries a road: link both banks into the network.
 for(const b of world.bridges)if(!network.has(K(b.x,b.y))){
   const sides=b.axis==='x'?[{x:b.x-1,y:b.y},{x:b.x+1,y:b.y}]:[{x:b.x,y:b.y-1},{x:b.x,y:b.y+1}];
   // Each bank must reach the network on its own side, not back across this bridge.
   reserved.add(K(b.x,b.y));
   const legs=sides.map(s=>network.has(K(s.x,s.y))?[s]:route(s,(x,y)=>network.has(K(x,y))));
   reserved.delete(K(b.x,b.y));
   if(legs.some(l=>!l)){tiles[b.y][b.x].kind='water';world.bridges.splice(world.bridges.indexOf(b),1);continue;}
   addRoad([sides[0],b,sides[1]]);world.roads.push([sides[0],{x:b.x,y:b.y},sides[1]]);
   for(const leg of legs)if(leg.length>1){addRoad(leg);world.roads.push(leg);}
 }
 // Sometimes a second way round: a loop between two parts of the network.
 if(chance(.55)){
   const cells=[...network].map(k=>{const [x,y]=k.split(',').map(Number);return {x,y};}).filter(p=>!bridgeAt(p.x,p.y));
   const hops=(a)=>{const seen=new Map([[K(a.x,a.y),0]]),queue=[a];for(let i=0;i<queue.length;i++){const p=queue[i];for(const [dx,dy] of STEPS){const k=K(p.x+dx,p.y+dy);if(network.has(k)&&!seen.has(k)){seen.set(k,seen.get(K(p.x,p.y))+1);queue.push({x:p.x+dx,y:p.y+dy});}}}return seen;};
   for(let tries=0;tries<30;tries++){
     const a=choose(cells),b=choose(cells),d=dist(a,b);if(d<4.5||d>9)continue;
     const via=hops(a).get(K(b.x,b.y));if(!via||via<d*2.3)continue;
     const path=route(a,(x,y)=>x===b.x&&y===b.y,4.5);
     if(!path)continue;const fresh=path.filter(p=>!network.has(K(p.x,p.y))).length;if(fresh<3||fresh>16)continue;
     addRoad(path);world.roads.push(path);world.loop=true;break;
   }
 }
 for(const k of soft.keys())soft.delete(k);
 // Draw the road on into the arch itself.
 world.roads.push([{...exitFront},{x:exitTile.x,y:exitTile.y+.3,edge:true}]);

 // ---- Encounters --------------------------------------------------------
 const add=(kind,type,extra={})=>{const o={id:'stop-'+world.stops.length,kind,type,group:type==='combat'?'enemy-sprites':'prop-sprites',...extra};world.objects.push(o);world.stops.push(o);return o;};
 const quests=1+Math.floor(r()*3), combats=3+Math.floor(r()*5);
 for(let i=0;i<quests;i++){const q=pick(questText.filter(q=>!world.quests.some(existing=>existing.title===q[0])));world.quests.push({title:q[0]});add('npc','quest-start',{quest:i,title:q[0],text:q[1]});add('chest','quest',{quest:i,title:q[0],text:q[2]});}
 let enemy='';for(let i=0;i<combats;i++){const pool=r()<.75?weights[region]:ENEMIES;const available=pool.filter(x=>x!==enemy);enemy=pick(available);add(enemy,'combat',{boss:boss&&i===combats-1,roll:Math.floor(r()*4294967296)});}
 for(let i=world.stops.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[world.stops[i],world.stops[j]]=[world.stops[j],world.stops[i]];}
 for(let q=0;q<quests;q++){const a=world.stops.findIndex(o=>o.type==='quest-start'&&o.quest===q),b=world.stops.findIndex(o=>o.type==='quest'&&o.quest===q);if(a>b)[world.stops[a],world.stops[b]]=[world.stops[b],world.stops[a]];}
 {const finalQuest=world.stops.findLastIndex(o=>o.type==='quest'),lastCombat=world.stops.findLastIndex(o=>o.type==='combat');if(lastCombat>finalQuest){const [quest]=world.stops.splice(finalQuest,1);world.stops.splice(lastCombat,0,quest);}}
 enemy='';for(const o of world.stops.filter(o=>o.type==='combat')){if(o.kind===enemy)o.kind=pick(ENEMIES.filter(x=>x!==enemy));enemy=o.kind;}
 const shuffled=[...OPTIONAL_TYPES];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
 const optional=shuffled.slice(0,3+Math.floor(r()*3));world.encounterTypes=['combat','quest',...optional];
 for(const type of optional)add({discovery:'crystal',treasure:'chest',rest:'campfire',traveller:'bench',shrine:'shrine'}[type],type);
 const exit=add('exit','exit');Object.assign(exit,{x:exitTile.x,y:exitTile.y,arch:true});

 // Reachable ground (same rules as walking) for every placement.
 const reach=new Set([K(entrance.x,entrance.y)]),queue=[entrance];
 const walk=(x,y)=>inside(x,y)&&!water(x,y)&&!world.blocked.has(K(x,y));
 for(let i=0;i<queue.length;i++){const p=queue[i];for(const [dx,dy] of STEPS){const x=p.x+dx,y=p.y+dy;if(!walk(x,y)||reach.has(K(x,y)))continue;if(dx&&dy&&(!walk(p.x+dx,p.y)||!walk(p.x,p.y+dy)))continue;reach.add(K(x,y));queue.push({x,y});}}
 const used=new Set([K(entrance.x,entrance.y),K(exitTile.x,exitTile.y),...world.bridges.flatMap(b=>[K(b.x,b.y),K(b.x-1,b.y),K(b.x+1,b.y),K(b.x,b.y-1),K(b.x,b.y+1)]),...world.buildings.map(b=>K(b.door.x,b.door.y)),K(plaza.x,plaza.y)]);
 for(const k of reserved)used.add(k);
 if(graveyard)for(let yy=graveyard.y;yy<graveyard.y+graveyard.h;yy++)for(let xx=graveyard.x;xx<graveyard.x+graveyard.w;xx++)used.add(K(xx,yy));
 const roadside=(x,y)=>!tile(x,y).path&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>tile(x+dx,y+dy)?.path);
 const open=(x,y)=>reach.has(K(x,y))&&!used.has(K(x,y))&&x>=1&&y>=1&&x<W-1&&y<H-1;
 const all=[];for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)all.push({x,y});
 const placeNear=(o,filter,score)=>{
   const options=all.filter(p=>open(p.x,p.y)&&filter(p));
   if(!options.length)return false;
   options.forEach(p=>p.s=score(p)+R()*.6);options.sort((a,b)=>b.s-a.s);
   const p=options[0];Object.assign(o,{x:p.x,y:p.y});used.add(K(p.x,p.y));return true;
 };
 const placed=()=>world.objects.filter(o=>o.x!==undefined);
 const spacing=p=>Math.min(4,...placed().map(o=>dist(o,p)));
 const sceneAnchors=world.scenes.filter(s=>s.kind!=='village');
 let questAnchor=0;
 const order=[...world.stops].sort((a,b)=>({rest:0,shrine:1,'quest-start':2,quest:3,traveller:4,discovery:5,treasure:6,combat:7,exit:8}[a.type])-({rest:0,shrine:1,'quest-start':2,quest:3,traveller:4,discovery:5,treasure:6,combat:7,exit:8}[b.type]));
 for(const o of order){
   if(o.type==='exit')continue;
   let ok=false;
   if(o.type==='rest'&&camp)ok=placeNear(o,p=>dist(p,camp)<=1.5&&!tile(p.x,p.y).path,p=>-dist(p,camp));
   else if(o.type==='shrine')ok=placeNear(o,p=>roadside(p.x,p.y),p=>graveyard?-dist(p,graveyard.gate)*1.5:-Math.min(...sceneAnchors.map(s=>dist(s,p)),9));
   else if(o.type==='quest-start')ok=placeNear(o,p=>roadside(p.x,p.y)&&dist(p,plaza)<=4.5,p=>-dist(p,plaza)*.4+spacing(p)*.5);
   else if(o.type==='quest'){
     const anchor=sceneAnchors.length?sceneAnchors[questAnchor++%sceneAnchors.length]:exitFront;
     ok=placeNear(o,p=>roadside(p.x,p.y),p=>-dist(p,anchor)+spacing(p)*.3);
   }
   else if(o.type==='traveller')ok=placeNear(o,p=>roadside(p.x,p.y),p=>-Math.abs(dist(p,plaza)-3)+spacing(p)*.3);
   else if(o.type==='discovery')ok=placeNear(o,p=>!tile(p.x,p.y).path&&[...STEPS].some(([dx,dy])=>tile(p.x+dx*2,p.y+dy*2)?.path||tile(p.x+dx,p.y+dy)?.path),p=>rockField(p.x,p.y)*3+spacing(p)*.4);
   else if(o.type==='treasure')ok=placeNear(o,p=>roadside(p.x,p.y)||(!tile(p.x,p.y).path&&STEPS.some(([dx,dy])=>tile(p.x+dx*2,p.y+dy*2)?.path)),p=>forestField(p.x,p.y)*3+spacing(p)*.5);
   else if(o.type==='combat')ok=placeNear(o,p=>tile(p.x,p.y).path&&dist(p,plaza)>=3&&dist(p,entrance)>=2.5,p=>spacing(p)*1.2);
   if(!ok)ok=placeNear(o,p=>true,p=>spacing(p));
   if(!ok)throw Error('No room for '+o.type);
 }

 // Walk the stops in order and protect each approach from later scenery.
 const protectedCells=new Set();
 for(const o of world.objects)for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]])protectedCells.add(K(o.x+dx,o.y+dy));
 let p=entrance,total=0;
 for(const stop of world.stops){const r2=approachPath(world,p,stop);if(!r2)throw Error('Disconnected encounter');stop.route=r2;stop.approach=r2.at(-1)||{x:p.x,y:p.y};total+=r2.reduce((sum,q,i)=>{const a=i?r2[i-1]:p;return sum+(a.x!==q.x&&a.y!==q.y?Math.SQRT2:1);},0);for(const q of [p,...r2])protectedCells.add(K(q.x,q.y));p=stop.approach;}
 for(const k of network)protectedCells.add(k);

 // ---- Scenery scenes (passable dressing) --------------------------------
 const dress=(kind,x,y,extra={})=>{if(!tile(x,y)||water(x,y)||world.blocked.has(K(x,y))||used.has(K(x,y))&&!extra.force)return false;used.add(K(x,y));world.objects.push({id:'scenery-'+world.objects.length,kind,group:'prop-sprites',type:'scenery',x,y,...extra});return true;};
 const around=(c,rad)=>all.filter(p=>dist(p,c)<=rad).sort((a,b)=>dist(a,c)-dist(b,c));
 // Village: a well on the square, a bench beside it, flowers at doorsteps, a signpost.
 {const spot=[{x:plaza.x,y:plaza.y-1},...around(plaza,1.5)].find(q=>!tile(q.x,q.y).path&&dress('well',q.x,q.y));
  around(plaza,2.3).filter(q=>!tile(q.x,q.y).path).slice(0,4).some(q=>dress('bench',q.x,q.y));
  for(const b of world.buildings.filter(b=>b.scene==='village')){dress('flower',b.door.x-1,b.door.y,{cluster:true})||dress('flower',b.door.x+1,b.door.y,{cluster:true});if(chance(.5))dress('bush',b.x+b.w,b.y+b.h-1);}
  const signSpot=around(plaza,3.6).filter(q=>dist(q,plaza)>=2.2&&roadside(q.x,q.y)&&open(q.x,q.y))[0];if(signSpot)dress('sign',signSpot.x,signSpot.y);}
 // Graveyard: neat rows of headstones.
 if(graveyard){for(let yy=graveyard.y;yy<graveyard.y+graveyard.h;yy++)for(let xx=graveyard.x;xx<graveyard.x+graveyard.w;xx++)if(!tile(xx,yy).path)dress('grave',xx,yy,{force:true,jx:(R()-.5)*.12});}
 // Camp: a fire ringed by a log and a bench.
 if(camp){const fire=world.objects.find(o=>o.kind==='campfire'&&dist(o,camp)<=2);const c=fire||camp;if(!fire)dress('campfire',camp.x,camp.y)||around(camp,1.5).some(q=>!tile(q.x,q.y).path&&dress('campfire',q.x,q.y));
   around(c,1.5).filter(q=>!tile(q.x,q.y).path).slice(0,4).some(q=>dress('log',q.x,q.y));around(c,1.9).filter(q=>!tile(q.x,q.y).path).some(q=>dress('pebble',q.x,q.y));}
 // Ruins and towers gather stones, mushrooms and the odd crystal.
 for(const b of world.buildings.filter(b=>b.scene!=='village')){
   const c={x:b.x+b.w/2,y:b.y+b.h/2};const ring=around(c,2.8).filter(q=>!tile(q.x,q.y).path&&!world.blocked.has(K(q.x,q.y)));
   let n=0;for(const q of ring){if(n>=3)break;if(R()<.5&&dress(b.scene==='ruins'?choose(['pebble','mushroom','pebble','crystal']):choose(['sign','pebble','bush']),q.x,q.y))n++;}
 }
 // Signposts at real junctions.
 {let signs=0;for(const k of network){if(signs>=2)break;const [x,y]=k.split(',').map(Number);const arms=STEPS.filter(([dx,dy])=>network.has(K(x+dx,y+dy))&&!(dx&&dy)).length;if(arms<3||dist({x,y},plaza)<3)continue;const spot=STEPS.map(([dx,dy])=>({x:x+dx,y:y+dy})).find(q=>roadside(q.x,q.y)&&open(q.x,q.y)&&world.objects.filter(o=>o.kind==='sign').every(o=>dist(o,q)>=4));if(spot&&dress('sign',spot.x,spot.y))signs++;}}
 // Flower meadows and mushroom rings in their own patches.
 {let flowers=0,mush=0;for(const q of all){if(tile(q.x,q.y).path||water(q.x,q.y))continue;
   if(flowerField(q.x,q.y)>.7&&flowers<9&&R()<.55&&!protectedCells.has(K(q.x,q.y))){if(dress('flower',q.x,q.y))flowers++;}
   else if(forestField(q.x,q.y)>FOREST[region]-.06&&forestField(q.x,q.y)<FOREST[region]+.02&&mush<5&&R()<.22&&!protectedCells.has(K(q.x,q.y))){if(dress(chance(.6)?'mushroom':'bush',q.x,q.y))mush++;}}}

 // ---- Solid scenery: forest clumps and rock outcrops --------------------
 const free=(x,y)=>inside(x,y)&&!water(x,y)&&tile(x,y).kind!=='bridge'&&!tile(x,y).path&&!world.blocked.has(K(x,y))&&!protectedCells.has(K(x,y))&&!used.has(K(x,y))&&!reserved.has(K(x,y));
 const solid=(x,y,size,kind)=>{world.trees.push(size===1?{x,y,size,kind,jx:(R()-.5)*.42,jy:(R()-.5)*.3,scale:kind==='tree-small'?.82+R()*.42:.8+R()*.5}:{x,y,size,kind,scale:.92+R()*.18});for(let yy=y+1-size;yy<=y;yy++)for(let xx=x+1-size;xx<=x;xx++)world.blocked.add(K(xx,yy));};
 const freeBlock=(x,y,size)=>{for(let yy=y+1-size;yy<=y;yy++)for(let xx=x+1-size;xx<=x;xx++)if(!free(xx,yy))return false;
   // Keep a lane around large pieces so they never wall in a stop.
   if(size===2)for(let yy=y-2;yy<=y+1;yy++)for(let xx=x-2;xx<=x+1;xx++)if(tile(xx,yy)?.path)return false;return true;};
 const threshold=FOREST[region];
 for(let i=0;i<70;i++){const x=int(2,W-2),y=int(2,H-2);if(forestField(x,y)>threshold+.08&&freeBlock(x,y,2))solid(x,y,2,choose(BIG_TREES[region]));}
 for(const q of all){
   if(!free(q.x,q.y))continue;const f=forestField(q.x,q.y),g=rockField(q.x,q.y);
   if(f>threshold&&R()<.62+((f-threshold)*2))solid(q.x,q.y,1,'tree-small');
   else if(g>.75&&R()<.8)solid(q.x,q.y,1,'rock-small');
   else if(f<threshold-.18&&g<.6&&R()<.035)solid(q.x,q.y,1,'tree-small');
 }
 for(let i=0;i<40;i++){const x=int(2,W-2),y=int(2,H-2);if(rockField(x,y)>.72&&freeBlock(x,y,2)){solid(x,y,2,chance(.5)?'rock-large':'rock-layered-large');break;}}
 // Organic forest edge: an outer ring of mixed trees, thickened inward where the noise says.
 const exitsAt=new Set([K(Math.round(entrance.x+offMap[0]/1.6),Math.round(entrance.y+offMap[1]/1.6))]);
 for(const river of world.water.rivers)for(const q of river.points){const x=Math.round(q.x),y=Math.round(q.y);for(let d=-1;d<=1;d++)exitsAt.add(river.vertical?K(x+d,Math.max(0,Math.min(H-1,y))):K(Math.max(0,Math.min(W-1,x)),y+d));}
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   if(x>0&&y>0&&x<W-1&&y<H-1)continue;if(exitsAt.has(K(x,y)))continue;
   const gap=R();if(gap<.1)continue;
   world.border.push({x,y,kind:gap<.13?'rock-small':'tree-small',scale:.85+R()*.5,jx:(R()-.5)*.4,jy:(R()-.5)*.34});
 }
 const edgeNoise=(x,y)=>nD(x/2.3+40,y/2.3+40);
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
   const ring=Math.min(x,y,W-1-x,H-1-y);if(ring>2||!free(x,y))continue;
   const n=edgeNoise(x,y);
   if(ring===1&&n>.5)solid(x,y,1,chance(.07)?'rock-small':'tree-small');
   else if(ring===2&&n>.72)solid(x,y,1,'tree-small');
 }
 for(const [x,y] of [[2,2],[W-2,2],[2,H-2],[W-2,H-2]])if(freeBlock(x,y,2)&&chance(.75))solid(x,y,2,choose(BIG_TREES[region]));

 // Final check: every stop must still be reachable in order.
 p=entrance;for(const stop of world.stops){if(!approachPath(world,p,stop))throw Error('Scenery blocked a stop');p=stop.approach;}
 world.walkStep=.48;
 world.duration=total*.48+combats*5+(world.stops.length-combats)*3;
 return world;
}

// Small props remain passable, but interactions happen beside them.
export function approachPath(world,from,target) {
 const routes=[[ -1,0],[0,1],[1,0],[0,-1]].map(([dx,dy])=>findPath(world,from,{x:target.x+dx,y:target.y+dy})).filter(Boolean);
 return routes.sort((a,b)=>a.length-b.length)[0]||null;
}
