// Shared dimensions, approved sprite names and road routing.
export const WIDTH = 24;
export const HEIGHT = 18;
export const ENEMIES = ['skeleton', 'slime', 'bat', 'treant', 'goblin', 'wolf', 'orc', 'ogre', 'troll', 'spider', 'wraith', 'golem', 'drake', 'fallen-knight', 'warlock', 'bandit'];
export const PROPS = ['chest', 'sign', 'bench', 'mushroom', 'flower', 'log', 'well', 'shrine', 'pebble', 'grave', 'campfire', 'bush', 'exit', 'npc', 'east-sign', 'south-bench'];
const key = (x, y) => `${x},${y}`;
export const titleCase = s => s.replaceAll('-', ' ').replace(/\b\w/g, c => c.toUpperCase());

export function isWalkable(world, x, y) {
  return x >= 1 && y >= 1 && x < WIDTH - 1 && y < HEIGHT - 1 && world.tiles[y][x].kind !== 'water' && !world.blocked.has(key(x, y));
}

// Road-preferring Dijkstra keeps walking on the visible paths where possible.
export function findPath(world, from, to) {
  if (!isWalkable(world,to.x,to.y)) return null;
  const index=(x,y)=>y*WIDTH+x, start=index(from.x,from.y), goal=index(to.x,to.y);
  const costs=new Float64Array(WIDTH*HEIGHT).fill(Infinity), parents=new Int16Array(WIDTH*HEIGHT).fill(-1);
  const heap=[];let serial=0;
  const less=(a,b)=>a.cost<b.cost||(a.cost===b.cost&&a.order<b.order);
  const push=node=>{node.order=serial++;heap.push(node);let i=heap.length-1;while(i){const p=(i-1)>>1;if(!less(heap[i],heap[p]))break;[heap[i],heap[p]]=[heap[p],heap[i]];i=p;}};
  const pop=()=>{const node=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;while(true){let child=i*2+1;if(child>=heap.length)break;if(child+1<heap.length&&less(heap[child+1],heap[child]))child++;if(!less(heap[child],heap[i]))break;[heap[i],heap[child]]=[heap[child],heap[i]];i=child;}}return node;};
  costs[start]=0;push({id:start,cost:0});
  while(heap.length){const node=pop();if(node.cost!==costs[node.id])continue;
    if(node.id===goal){const route=[];for(let id=goal;id!==start;id=parents[id])route.push({x:id%WIDTH,y:Math.floor(id/WIDTH)});return route.reverse();}
    const x=node.id%WIDTH,y=Math.floor(node.id/WIDTH);
    for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){const xx=x+dx,yy=y+dy;if(!isWalkable(world,xx,yy))continue;const id=index(xx,yy),cost=node.cost+(world.tiles[yy][xx].path?1:2.8);if(cost<costs[id]){costs[id]=cost;parents[id]=node.id;push({id,cost});}}
  }
  return null;
}
