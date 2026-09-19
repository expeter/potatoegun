import { CONFIG as C, clamp } from './config.mjs';

export function equipmentStats(equipment = {}) {
  const armor = equipment.armor || 0, wings = equipment.wings || 0, pads = equipment.pads || 0;
  return {
    mass: C.baseMass + armor * C.upgrades.armor.mass + pads * C.upgrades.pads.mass,
    health: C.baseHealth + armor * C.upgrades.armor.health,
    safe: C.safeEnergy + armor * C.upgrades.armor.safeEnergy,
    lethal: C.lethalEnergy + armor * C.upgrades.armor.lethalEnergy,
    bounce: C.bounce + pads * C.upgrades.pads.bounce,
    damageFactor: 1 - pads * C.upgrades.pads.damageReduction,
    wings,
  };
}

export function launchStress(energy, equipment) {
  const stats = equipmentStats(equipment);
  const fraction = clamp((energy - stats.safe) / (stats.lethal - stats.safe), 0, 1);
  return { ...stats, damage: stats.health * fraction, zone: fraction >= 1 ? 'lethal' : fraction > 0 ? 'risky' : 'safe' };
}

export function obstaclesBetween(left, right) {
  const result = [];
  for (let cycle = Math.max(0, Math.floor((left - 60) / C.trackPeriod)); cycle <= Math.floor(right / C.trackPeriod); cycle++) {
    for (let index = 0; index < C.track.length; index++) {
      const template = C.track[index];
      const x = template.x + cycle * C.trackPeriod;
      if (x + template.width >= left && x <= right) result.push({ ...template, x, id: `${cycle}:${index}` });
    }
  }
  return result;
}

export function createFlight(settings, equipment = {}) {
  const stats = equipmentStats(equipment);
  const stress = launchStress(settings.energy, equipment);
  const speed = Math.sqrt(2 * settings.energy * C.energyMultiplier / stats.mass);
  const angle = settings.angle * Math.PI / 180;
  return {
    x: 0, y: C.launchHeight, previousX: 0, previousY: C.launchHeight,
    vx: speed * Math.cos(angle), vy: speed * Math.sin(angle),
    health: Math.max(0, stats.health - stress.damage), maxHealth: stats.health,
    stats, equipment: { armor: 0, wings: 0, pads: 0, ...equipment }, settings: { ...settings },
    wingHealth: 1, elapsed: 0, distance: 0, rest: 0, contacts: new Set(),
    ended: stress.zone === 'lethal', reason: stress.zone === 'lethal' ? 'launch' : null,
    event: stress.zone === 'lethal' ? 'destroyed' : 'launch', eventSerial: 1,
  };
}

function event(s, type) { s.event = type; s.eventSerial++; }

function impact(s, normalSpeed, damping = 1) {
  const damage = Math.max(0, normalSpeed - C.impactThreshold) * C.impactDamage * s.stats.damageFactor * damping;
  s.health = Math.max(0, s.health - damage);
  if (normalSpeed > C.wingBreakSpeed && s.stats.wings) s.wingHealth = Math.max(0, s.wingHealth - C.wingWear * damping);
  if (s.health <= 0) {
    s.ended = true;
    s.reason = 'impact';
    event(s, 'destroyed');
  }
}

// A segment against an expanded rectangle, including the contact normal.
// The swept test prevents tunnelling even at maximum launch speed.
export function sweepBox(x, y, dx, dy, box) {
  let entry = 0, exit = 1, nx = 0, ny = 0;
  for (const [origin, delta, min, max, axis] of [[x, dx, box.left, box.right, 'x'], [y, dy, box.bottom, box.top, 'y']]) {
    if (Math.abs(delta) < 1e-12) { if (origin < min || origin > max) return null; continue; }
    let near = (min - origin) / delta, far = (max - origin) / delta;
    if (near > far) [near, far] = [far, near];
    if (near > entry) { entry = near; nx = axis === 'x' ? -Math.sign(delta) : 0; ny = axis === 'y' ? -Math.sign(delta) : 0; }
    exit = Math.min(exit, far);
    if (entry > exit) return null;
  }
  if (exit < 0 || entry > 1) return null;
  return { t: entry, nx, ny };
}

export function stepFlight(s, dt = C.step) {
  if (s.ended) return s;
  s.previousX = s.x; s.previousY = s.y;
  s.elapsed += dt;
  const nearby = obstaclesBetween(s.x - 20, s.x + Math.abs(s.vx) * dt + 60);
  const inWind = nearby.some(o => o.type === 'wind' && s.x >= o.x && s.x <= o.x + o.width && s.y < o.height);
  const effectiveWings = s.stats.wings * s.wingHealth;
  const lift = s.vy < 0 ? Math.min(C.gravity * 0.7, effectiveWings * C.wingLift * Math.abs(s.vx)) : 0;
  s.vy += (-C.gravity + lift + (inWind ? C.updraftForce : 0)) * dt;
  s.vx *= Math.exp(-C.drag * dt / s.stats.mass);
  s.vy *= Math.exp(-C.drag * dt / s.stats.mass);
  let remaining = dt;
  const touching = new Set();
  let supported = false;
  // Resolve earliest contact first, then advance through the rest of the step.
  for (let iteration = 0; iteration < 4 && remaining > 1e-8; iteration++) {
    const dx = s.vx * remaining, dy = s.vy * remaining;
    let hit = null, obstacle = null;
    if (dy < 0 && s.y + dy <= C.radius) hit = { t: clamp((C.radius - s.y) / dy, 0, 1), nx: 0, ny: 1 };
    for (const o of nearby) {
      if (o.type === 'wind') continue;
      const candidate = sweepBox(s.x, s.y, dx, dy, { left: o.x - C.radius, right: o.x + o.width + C.radius, bottom: -C.radius, top: o.height + C.radius });
      if (!candidate || (!candidate.nx && !candidate.ny)) continue;
      if ((!hit || candidate.t < hit.t) && s.vx * candidate.nx + s.vy * candidate.ny < 0) { hit = candidate; obstacle = o; }
    }
    if (!hit) { s.x += dx; s.y += dy; break; }
    s.x += dx * hit.t; s.y += dy * hit.t;
    const id = obstacle?.id || 'ground';
    touching.add(id);
    const normalSpeed = -(s.vx * hit.nx + s.vy * hit.ny);
    const fresh = !s.contacts.has(id);
    if (fresh) impact(s, normalSpeed, obstacle?.type === 'hay' ? 0.18 : obstacle?.type === 'mushroom' ? 0.12 : 1);
    if (s.ended) break;
    let restitution = s.stats.bounce;
    if (obstacle?.type === 'hay') { restitution = 0.12; if (fresh) { s.vx *= C.hayDamping; s.vy *= C.hayDamping; event(s, 'hay'); } }
    const dot = s.vx * hit.nx + s.vy * hit.ny;
    s.vx -= (1 + restitution) * dot * hit.nx;
    s.vy -= (1 + restitution) * dot * hit.ny;
    if (obstacle?.type === 'mushroom' && fresh && normalSpeed >= C.mushroomMinSpeed) {
      s.vy = Math.max(s.vy, C.mushroomImpulse + s.equipment.pads * 2);
      s.vx = Math.abs(s.vx) + C.mushroomForward;
      event(s, 'mushroom');
    } else if (fresh && !obstacle && normalSpeed > 3) event(s, 'bounce');
    if (hit.ny > 0 && Math.abs(s.vy) < 1.3) { s.vy = 0; supported = true; }
    s.x += hit.nx * 0.00001; s.y += hit.ny * 0.00001;
    remaining *= 1 - hit.t;
  }
  s.contacts = touching;
  if (supported || (s.y <= C.radius + 0.02 && Math.abs(s.vy) < 1.3)) {
    s.vx = Math.sign(s.vx) * Math.max(0, Math.abs(s.vx) - C.groundFriction * dt);
    if (Math.abs(s.vx) < C.restSpeed) s.rest += dt; else s.rest = 0;
  } else s.rest = 0;
  s.distance = Math.max(s.distance, s.x);
  if (s.rest >= C.restTime && !s.ended) { s.ended = true; s.reason = 'rest'; event(s, 'rest'); }
  return s;
}

// Rendering frequency only changes how many fixed steps run, not their size.
export class FixedClock {
  constructor() { this.accumulator = 0; }
  advance(seconds, callback) {
    this.accumulator += Math.min(Math.max(seconds, 0), 0.25);
    while (this.accumulator + 1e-10 >= C.step) { callback(C.step); this.accumulator = Math.max(0, this.accumulator - C.step); }
    return this.accumulator / C.step;
  }
  reset() { this.accumulator = 0; }
}
