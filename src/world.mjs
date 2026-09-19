import { CONFIG as C, clamp } from './config.mjs';

export function randomSource(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let n = Math.imul(state ^ state >>> 15, 1 | state);
    n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}
export function newSeed() {
  if (globalThis.crypto?.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0];
  return (Math.random() * 4294967296) >>> 0;
}
export function windAt(time, seed = 1) {
  const phase = (seed % 10007) / 10007 * Math.PI * 2;
  return Math.sin(time * .025 + phase) * 2.8 + Math.sin(time * .057 + phase * 2) * .45;
}
export function chargeEnergy(seconds) {
  const wave = (Math.max(0, seconds) / C.chargeSeconds) % 2;
  const fraction = wave <= 1 ? wave : 2 - wave;
  return C.limits.energy[0] + fraction * (C.maxEnergy - C.limits.energy[0]);
}
export function aimAngle(x, y, originX, originY) {
  return clamp(Math.atan2(originY - y, Math.max(8, x - originX)) * 180 / Math.PI, ...C.limits.angle);
}

// Independent random streams per section keep pickups stable across camera/query windows.
export function pickupsBetween(left, right, level = 'ground', seed = 1) {
  const result = [];
  for (let cycle=Math.max(0,Math.floor(left/C.trackPeriod));cycle<=Math.floor(right/C.trackPeriod);cycle++) {
    const random=randomSource((seed^Math.imul(cycle+1,0x9e3779b1))>>>0);
    for(let group=0;group<C.pickupGroups;group++){
      const cell=C.trackPeriod/C.pickupGroups;
      const start=cycle*C.trackPeriod+group*cell+10+random()*10;
      const height=C.pickupHeights[0]+random()*(C.pickupHeights[1]-C.pickupHeights[0]);
      const count=3+Math.floor(random()*3),spacing=7+random()*3,curve=random()*Math.PI*2;
      for(let index=0;index<count;index++){
        const x=start+index*spacing;
        const groundY=Math.max(4,height+Math.sin(curve+index*.65)*7);
        const y=level==='sky'?55+groundY*(2+cycle%4):level==='space'?80+groundY*(4+cycle%6):groundY;
        const value=random()<.08?12:3+Math.floor(random()*4);
        if(x>=left&&x<=right){
          result.push({x,y,value,id:`p${cycle}:${group}:${index}`});
          if(level==='ground')result.push({x,y:y+C.airbornePickupOffsets[group%C.airbornePickupOffsets.length],value,id:`a${cycle}:${group}:${index}`});
        }
      }
    }
  }
  return result;
}
// Distance from a pickup to the travelled segment; high-speed shots cannot skip it.
export function segmentDistance(x, y, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
}
export function trafficBetween(left, right, elapsed, seed = 1, level = 'ground') {
  const shift = elapsed * C.trafficSpeed;
  const offset = (seed % 80);
  const result = [];
  for (let i = Math.max(0, Math.floor((left + shift - C.trafficStart - offset) / 240)); i <= Math.ceil((right + shift - C.trafficStart - offset) / 240); i++) {
    const x = C.trafficStart + offset + i * 240 - shift;
    const height = level === 'sky' ? 110 + (i % 3) * 110 : level === 'space' ? 150 + (i % 5) * 170 : 18 + (i % 3) * 13;
    if (x >= C.trafficSafeDistance && x > left - 20 && x < right + 20) result.push({ id: `t${i}`, x, y: height + Math.sin(elapsed * .8 + i) * 2, radius: C.trafficRadius });
  }
  return result;
}

// Stable world identities: crossing a tile boundary never changes visible scenery.
export function parallaxTiles(camera, factor, spacing, width, padding = 2) {
  const offset = camera * factor, first = Math.floor(offset / spacing) - padding;
  const last = Math.ceil((offset + width) / spacing) + padding;
  return Array.from({ length: last - first + 1 }, (_, n) => {
    const index = first + n; return { index, x: index * spacing - offset };
  });
}

// Irregular but seeded: revisiting a location never relocates a thermal.
const thermalZones = (() => {
  const random = randomSource(C.thermalSeed), zones = [];
  let x = 151;
  for (let i = 0; i < C.thermalCount; i++) {
    const width = i === 0 ? 42 : 28 + Math.floor(random() * 31);
    const height = i === 0 ? 320 : 250 + Math.floor(random() * 151);
    zones.push({type:'wind', x, width, height, id:`wind:${i}`});
    x += width + C.thermalGap[0] + Math.floor(random() * (C.thermalGap[1] - C.thermalGap[0]));
  }
  return zones;
})();
export function updraftsBetween(left, right) {
  return thermalZones.filter(o => o.x + o.width >= left && o.x <= right).map(o => ({...o}));
}
