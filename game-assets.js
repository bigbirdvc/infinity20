// Content-hashed, lossless artwork. Persistent cache is optional, never required.
let manifestPromise;
const inFlight=new Map();
async function manifest(){return manifestPromise??=fetch('web-assets/manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Artwork manifest could not load');return r.json();}).catch(e=>{manifestPromise=null;throw e;});}
async function responseFor(file){
 let cache;try{cache=await caches.open('infinite-adventure-art-v1');const hit=await cache.match(file);if(hit)return hit;}catch{}
 const response=await fetch(file);if(!response.ok)throw Error('Artwork could not load');
 if(cache)try{await cache.put(file,response.clone());}catch{}
 return response;
}
async function frame(spec){
 if(!inFlight.has(spec.file))inFlight.set(spec.file,(async()=>{
 const response=await responseFor(spec.file),url=URL.createObjectURL(await response.blob());
 try{const image=new Image();image.src=url;await image.decode();if(image.naturalWidth!==spec.w||image.naturalHeight!==spec.h)throw Error('Artwork dimensions differ');const canvas=document.createElement('canvas');canvas.width=spec.w;canvas.height=spec.h;canvas.getContext('2d').drawImage(image,0,0);return {image:canvas,x:0,y:0,w:spec.w,h:spec.h};}catch(e){try{const cache=await caches.open('infinite-adventure-art-v1');await cache.delete(spec.file);}catch{}throw e;}finally{URL.revokeObjectURL(url);}
 })().finally(()=>inFlight.delete(spec.file)));
 return inFlight.get(spec.file);
}
export async function loadArt(group,region){const m=await manifest(),specs=region?m.regions[region]:m[group];if(!specs)throw Error('Unknown artwork group');return new Map(await Promise.all(Object.entries(specs).map(async([key,spec])=>[key,await frame(spec)])));}
export async function prefetchRegion(region){if(navigator.connection?.saveData)return;const m=await manifest();for(const spec of Object.values(m.regions[region]||{}))await responseFor(spec.file);}
