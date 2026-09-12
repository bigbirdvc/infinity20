import {freshGame,COUNTERS,levelFor,worldFor,startMap,loot,gainXP,tale,combatRemaining} from './adventure-engine.js';
import {nextSeed,REGIONS,ENEMIES,approachPath} from './adventure-world.js';
import {findPath,isWalkable} from './demo-world.js';
export const SAVE_KEY='infinite-adventure-v2';
export function encode(s,now=Date.now()){return JSON.stringify({version:2,savedAt:now,state:s},(key,value)=>typeof value==='bigint'?{integer:String(value)}:value instanceof Set?{set:[...value]}:value);}
export function decode(raw,now=Date.now()){
 try{if(typeof raw!=='string'||raw.length>100000)return null;const data=JSON.parse(raw,(k,v)=>{if(v&&typeof v==='object'&&Object.keys(v).length===1){if(typeof v.integer==='string'&&/^\d+$/.test(v.integer))return BigInt(v.integer);if(Array.isArray(v.set)&&v.set.length<=40)return new Set(v.set);}return v;});
 if(data.version!==2){const old=data.state||data;if(!Number.isSafeInteger(old.level)||old.level<1)return null;const s=freshGame();s.name=typeof old.name==='string'?old.name.slice(0,24):'Rowan';s.hero=['knight','elf','mage'].includes(old.hero)?old.hero:'knight';s.level=BigInt(old.level);s.xpTotal=2n*(s.level-1n)**2n+22n*(s.level-1n);for(const k of ['gold','wins','circuits','completed','discoveries'])if(Number.isSafeInteger(old[k])&&old[k]>=0)s[k]=BigInt(old[k])*(k==='gold'?10n:1n);if(Number.isSafeInteger(old.rations)&&old.rations>=0)s.potions=BigInt(old.rations);return {state:s,savedAt:now,migrated:true};}
 const s=data.state;if(!s||!Number.isFinite(data.savedAt)||data.savedAt<0)return null;
 if(s.heroColour!==undefined&&!['original','crimson','emerald','violet','blue'].includes(s.heroColour))return null;
 if(s.characterCreated!==undefined&&typeof s.characterCreated!=='boolean')return null;
 for(const k of COUNTERS)if(typeof s[k]!=='bigint'||s[k]<0n)return null;
 if(typeof s.mapNumber!=='bigint'||s.mapNumber<1n||typeof s.mapGold!=='bigint'||s.mapGold<0n||typeof s.level!=='bigint'||s.level!==levelFor(s.xpTotal))return null;
 if(!Number.isInteger(s.seed)||s.seed<0||s.seed>4294967295||!Number.isFinite(s.hp)||s.hp<0||s.hp>1||!['knight','elf','mage'].includes(s.hero)||typeof s.name!=='string'||s.name.length>24)return null;
 if(!Array.isArray(s.log)||s.log.length>10||s.log.some(e=>!e||typeof e.title!=='string'||typeof e.text!=='string'||e.text.length>1000||(e.quality&&!['Common','Fine','Rare','Mythic'].includes(e.quality)))||!Array.isArray(s.recentNames)||s.recentNames.length>10||s.recentNames.some(n=>typeof n!=='string'||n.length>500))return null;
 if(!s.gear||Object.values(s.gear).some(g=>g&&(typeof g.level!=='bigint'||g.level<1n||!Number.isInteger(g.tier)||g.tier<0||g.tier>3||typeof g.name!=='string'||g.name.length>100)))return null;
 if(!['',...REGIONS].includes(s.previousRegion)||!Number.isInteger(s.bossIn)||s.bossIn<1||s.bossIn>3||typeof s.mapBoss!=='boolean'||!['',...ENEMIES].includes(s.lastEnemy))return null;
 if(!s.event||typeof s.event.title!=='string'||typeof s.event.text!=='string'||s.event.title.length>200||s.event.text.length>1000||(s.event.quality&&!['Common','Fine','Rare','Mythic'].includes(s.event.quality)))return null;
 if(s.offlineRemainders&&(typeof s.offlineRemainders!=='object'||Object.keys(s.offlineRemainders).length>20||Object.entries(s.offlineRemainders).some(([k,v])=>!Object.hasOwn(OFFLINE_RATES,k)||typeof v!=='string'||!/^\d{1,10}$/.test(v)||BigInt(v)>=3600000000n)))return null;
 if(s.enemyOverrides&&(typeof s.enemyOverrides!=='object'||Array.isArray(s.enemyOverrides)||Object.keys(s.enemyOverrides).length>7||Object.values(s.enemyOverrides).some(kind=>!ENEMIES.includes(kind))))return null;
 // Earlier saves used a different generated layout. Preserve accumulated progress,
 // equipment and identity, and begin the current map safely on the new layout.
 if(![3,4,5,6,7].includes(s.generation)){startMap(s);s.card=null;return {state:s,savedAt:Math.min(now,data.savedAt),migrated:true};}
 const w=worldFor(s);if(Object.keys(s.enemyOverrides||{}).some(id=>!w.stops.some(o=>o.id===id&&o.type==='combat')))return null;
 if(!Number.isInteger(s.stop)||s.stop<0||s.stop>=w.stops.length||!(s.visited instanceof Set)||!(s.completedQuests instanceof Set)||!['plan','walk','combat','visit','return','recovery'].includes(s.stage))return null;
 if(s.walkStep!==undefined&&(!Number.isFinite(s.walkStep)||s.walkStep<=0||s.walkStep>10))return null;
 for(const k of ['x','y','fraction','timer','duration','mapElapsed','recovery'])if(!Number.isFinite(s[k]))return null;
 if(s.fraction<0||s.fraction>1||s.timer<0||s.recovery<0||s.recovery>10||s.mapElapsed<0||s.mapElapsed>1000||!Number.isInteger(s.x)||!Number.isInteger(s.y)||!w.tiles[s.y]?.[s.x]||!Array.isArray(s.route)||s.route.length>500||s.route.some(p=>!Number.isInteger(p.x)||!Number.isInteger(p.y)||!w.tiles[p.y]?.[p.x]||!isWalkable(w,p.x,p.y)))return null;
 if([...s.completedQuests].some(q=>!Number.isInteger(q)||q<0||q>=w.quests.length)||[...s.visited].some(id=>!w.stops.some(o=>o.id===id)))return null;
 if(!s.checkpoint||!Number.isInteger(s.checkpoint.x)||!Number.isInteger(s.checkpoint.y)||!isWalkable(w,s.checkpoint.x,s.checkpoint.y))return null;
 let prior=s;for(const p of s.route){if(Math.abs(p.x-prior.x)+Math.abs(p.y-prior.y)!==1)return null;prior=p;}
 if(s.target&&s.target.type==='combat'&&!ENEMIES.includes(s.target.kind))return null;
 if(s.stage!=='plan'&&(!s.target||s.target.id!==w.stops[s.stop].id))return null;
 if(['combat','recovery','return'].includes(s.stage)&&(!s.enemy||!Number.isFinite(s.enemy.hp)||s.enemy.hp<=0||s.enemy.hp>1||typeof s.enemy.level!=='bigint'||!Number.isInteger(s.enemy.seed)||!Number.isFinite(s.enemy.offset)||s.enemy.offset< -2||s.enemy.offset>4||!Number.isInteger(s.enemy.retries)||s.enemy.retries<0||s.enemy.retries>1))return null;
 // Reconstruct trusted stop payload and validate route continuity rather than trusting saved text/targets.
 if(s.stage==='plan')s.target=null;
 if(s.target)s.target={...w.stops[s.stop],kind:w.stops[s.stop].type==='combat'?s.target.kind:w.stops[s.stop].kind};
 if(s.stage==='combat'&&s.duration<1)s.duration=s.enemy.round*.55+combatRemaining(s);
 s.card=null;return {state:s,savedAt:Math.min(now,data.savedAt),clockRollback:data.savedAt>now};
 }catch{return null;}
}
// Rates are measured expectations per Normal hour; earned is whole gold,
// converted to exact wallet tenths after rounding. Integer remainder accounting means
// even repeated short absences retain small gains. No loop scales with time away.
export const OFFLINE_RATES={wins:128,defeats:5,discoveries:61.5,earned:3900,spent:12310,xpTotal:2434,potionsFound:54,lootSold:42.3,upgrades:6.2,potionUses:181};
function expectation(s,key,ms,rate){s.offlineRemainders??={};let hash=s.seed;for(const c of key)hash=Math.imul(hash^c.charCodeAt(0),0x45d9f3b);hash=Math.imul(hash^(hash>>>16),0x45d9f3b);const initial=BigInt((hash^(hash>>>16))>>>0)*3600000000n/4294967296n;const prior=BigInt(s.offlineRemainders[key]??String(initial)),value=ms*BigInt(Math.round(rate*1000))+prior;const result=value/3600000000n;s.offlineRemainders[key]=String(value%3600000000n);return result;}
export function catchUp(s,elapsedMs){if(!Number.isFinite(elapsedMs)||elapsedMs<=0)return null;let ms=BigInt(Math.floor(elapsedMs));const before=Object.fromEntries([...COUNTERS,'level'].map(k=>[k,s[k]]));const original=worldFor(s),oldStop=s.stop,missingGear=Object.values(s.gear).filter(g=>!g).length;
 if(s.stage==='recovery'){
   const debt=BigInt(Math.ceil(s.recovery*1000)),paid=ms<debt?ms:debt;
   ms-=paid;s.recovery=Math.max(0,s.recovery-Number(paid)/1000);s.timer=s.recovery;s.mapElapsed+=Number(paid)/1000;s.card=null;
   if(s.recovery===0){s.hp=1;s.stage='return';s.route=approachPath(original,s,s.target);s.fraction=0;}
   if(ms===0n)return {elapsedMs,deltas:Object.fromEntries([...COUNTERS,'level'].map(k=>[k,s[k]-before[k]]))};
 }
 const firstRemaining=BigInt(Math.max(1000,Math.round((original.duration-s.mapElapsed)*1000))),mapMillis=140000n;
 const maps=ms<firstRemaining?0n:1n+(ms-firstRemaining)/mapMillis;
 const remainder=maps>0n?Number((ms-firstRemaining)%mapMillis)/1000:s.mapElapsed+Number(ms)/1000;
 if(maps>0n){s.completed+=BigInt(original.quests.length-s.completedQuests.size)+(maps-1n)*2n;s.circuits+=maps;s.mapNumber+=maps;s.previousRegion=original.region;s.recentNames=[original.name,...s.recentNames].slice(0,10);s.seed=nextSeed((s.seed+Number(maps%4294967296n))>>>0);s.mapBoss=s.mapNumber%5n===0n||s.mapNumber%5n===2n;s.bossIn=2+s.seed%2;startMap(s);}
 const w=worldFor(s);const stop=Math.min(w.stops.length-1,maps>0n?Math.floor(remainder/140*w.stops.length):oldStop+Math.floor(Number(ms)/Number(firstRemaining)*(w.stops.length-oldStop)));
 const from=maps>0n?0:oldStop;for(let i=from;i<stop;i++){const o=w.stops[i];if(o.type==='quest'&&!s.completedQuests.has(o.quest)){s.completedQuests.add(o.quest);s.completed++;}s.visited.add(o.id);if(['quest','rest','shrine'].includes(o.type))s.checkpoint={...o.approach};}
 if(stop>from||maps>0n){s.stop=stop;const p=stop?w.stops[stop-1].approach:w.entrance;s.x=p.x;s.y=p.y;s.fraction=0;s.route=[];s.target=null;s.enemy=null;s.stage='plan';}s.mapElapsed=maps>0n?remainder/140*w.duration:remainder;s.recovery=0;if(ms>=60000n)s.hp=.7;
 const gains={};for(const [key,rate]of Object.entries(OFFLINE_RATES))gains[key]=expectation(s,key,ms,rate);
 const generatedLoot=gains.lootSold;gains.earned*=10n;
 gains.lootSold=gains.lootSold>BigInt(missingGear)?gains.lootSold-BigInt(missingGear):0n;
 const min=(a,b)=>a<b?a:b,max=(a,b)=>a>b?a:b;
 const loss=min(gains.defeats*70n,gains.earned),funds=s.gold+gains.earned-loss;
 const needed=max(0n,gains.potionUses+3n-s.potions-gains.potionsFound);
 const opportunities=gains.wins+gains.discoveries+(s.completed-before.completed)*2n+maps;
 const purchases=min(needed,min(opportunities,max(0n,(funds-240n)/80n)));
 const afterPotions=funds-purchases*80n;
 gains.upgrades=min(s.circuits/4n-before.circuits/4n,max(0n,(afterPotions-1050n)/350n));
 gains.spent=purchases*80n+gains.upgrades*350n;
 s.potions=max(0n,s.potions+gains.potionsFound+purchases-gains.potionUses);
 for(const key of ['wins','defeats','discoveries','earned','spent','potionsFound','lootSold','upgrades'])s[key]+=gains[key];
 // Expected gold loss is based only on current-map earnings at each defeat.
 s.gold+=gains.earned-gains.spent-loss;s.mapGold=maps>0n?BigInt(Math.floor(s.mapElapsed/w.duration*140))*10n:s.mapGold+gains.earned;gainXP(s,gains.xpTotal);
 // One representative automatically equipped find, without retaining event payloads.
 if(generatedLoot>0n){const gold=s.gold,earned=s.earned,mapGold=s.mapGold,sold=s.lootSold;const slots=['weapon','armour','charm'].sort((a,b)=>Number(!!s.gear[a])-Number(!!s.gear[b]));for(let i=0;i<Number(generatedLoot<3n?generatedLoot:3n);i++)loot(s,nextSeed(s.seed+i*7919),slots[i]);s.gold=gold;s.earned=earned;s.mapGold=mapGold;s.lootSold=sold;}
 s.card=null;if(elapsedMs>=15000)tale(s,'The road remembered','There were warm windows, damp boots, and kindness along the way. Rowan returns to view with a little more road wisdom.');
 return {elapsedMs,deltas:Object.fromEntries([...COUNTERS,'level'].map(k=>[k,s[k]-before[k]]))};
}
