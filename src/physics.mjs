import { CONFIG as C, UPGRADE_KEYS, BOUNCERS, clamp, levelConfig } from './config.mjs';
import { newSeed, randomSource, windAt, pickupsBetween, segmentDistance, trafficBetween, updraftsBetween } from './world.mjs';

export function equipmentStats(equipment = {}) {
  const armor = equipment.armor || 0, wings = equipment.wings || 0, pads = equipment.pads || 0;
  return {
    mass: C.baseMass + UPGRADE_KEYS.reduce((sum, k) => sum + (equipment[k] || 0) * C.upgrades[k].mass, 0),
    health: C.baseHealth + armor * C.upgrades.armor.health,
    safe: C.safeEnergy + armor * C.upgrades.armor.safeEnergy,
    extreme: C.extremeEnergy,
    bounce: C.bounce + pads * C.upgrades.pads.bounce,
    damageFactor: (1 - pads * C.upgrades.pads.damageReduction) * (1 + (equipment.streamline || 0) * .1),
    launchProtection: (1 - (equipment.braces || 0) * C.launchRisk.tapeProtection) * (1 - armor * C.launchRisk.armorProtection),
    drag: C.drag * (1 - (equipment.streamline || 0) * .17),
    windFactor: 1 + (equipment.sail || 0) * .3,
    pickupRadius: C.pickupRadius + (equipment.magnet || 0) * 2.5,
    airbag: (equipment.airbag || 0) * 18,
    wings,
  };
}

export function launchStress(energy, equipment) {
  const stats = equipmentStats(equipment);
  const excess = Math.max(0, energy - stats.safe);
  // Yellow should hurt a little, not routinely end the round at the muzzle.
  const yellow = clamp(excess / Math.max(1, C.extremeEnergy - stats.safe), 0, 1);
  const red = clamp((energy - C.extremeEnergy) / (C.maxEnergy - C.extremeEnergy), 0, 1);
  const failureChance = (C.launchRisk.yellowFailure * yellow ** 2 + C.launchRisk.extremeFailure * red ** C.launchRisk.exponent) * stats.launchProtection;
  return { ...stats, failureChance, yellow, red, zone: energy >= C.extremeEnergy ? 'extreme' : excess > 0 ? 'risky' : 'safe' };
}

export function obstaclesBetween(left, right, level = 'ground') {
  if (level === 'space') return [];
  const result = updraftsBetween(left, right);
  if (level === 'sky') return result;
  const variants = Object.keys(BOUNCERS);
  for (let cycle = Math.max(0, Math.floor((left - 60) / C.trackPeriod)); cycle <= Math.floor(right / C.trackPeriod); cycle++) {
    for (let index = 0; index < C.track.length; index++) {
      const template = C.track[index];
      const x = template.x + cycle * C.trackPeriod;
      const ordinal = C.track.slice(0, index).filter(o => o.type === 'mushroom').length;
      const variant = template.type === 'mushroom' ? variants[(cycle * 3 + ordinal) % variants.length] : undefined;
      if (x + template.width >= left && x <= right) result.push({ ...template, x, variant, id: `${cycle}:${index}` });
    }
  }
  return result;
}

export function createFlight(settings, equipment = {}, options = {}) {
  const seed = options.seed ?? newSeed();
  const random = randomSource(seed);
  const level = levelConfig(options.level);
  const stats = equipmentStats(equipment);
  const stress = launchStress(settings.energy, equipment);
  const failed = random() < stress.failureChance;
  const damage = stress.zone === 'safe' ? 0 : C.baseHealth * (stress.yellow * C.launchRisk.yellowDamage + stress.red * (C.launchRisk.extremeDamageMin + random() * C.launchRisk.extremeDamageSpread)) * stats.launchProtection;
  const speed = Math.sqrt(2 * settings.energy * C.energyMultiplier / stats.mass) * level.launchScale * (level.id === 'ground' ? C.muzzleKick : 1);
  const angle = (settings.angle + (random() - .5) * 2.8) * Math.PI / 180;
  return {
    x: 0, y: level.launchHeight, previousX: 0, previousY: level.launchHeight,
    vx: speed * Math.cos(angle), vy: speed * Math.sin(angle),
    health: failed ? 0 : stats.health - damage, maxHealth: stats.health,
    stats, equipment: Object.fromEntries(UPGRADE_KEYS.map(k => [k, equipment[k] || 0])), settings: { ...settings },
    seed, windSeed: options.windSeed ?? seed, windTime: options.windTime ?? 0, trafficEnabled: options.traffic ?? true,
    level: level.id, maxHeight: level.launchHeight, wind: (options.wind ?? windAt(options.windTime ?? 0, options.windSeed ?? seed)) * level.windScale,
    boostsLeft: level.boosts, lastTrafficBoostGain: 0, boostsUsed: 0, lastBoost: -Infinity, impacts: [], planted: 0, lastPlantX: -Infinity, groundBounces: 0, usedUpdrafts: new Set(), updraftTime: new Map(), padKicksLeft: equipment.pads || 0,
    collected: new Set(), pickupMaterial: 0, trafficHits: new Set(), trafficWrecks: [], milestones: new Set(), usedMushrooms: new Set(), mushrooms: 0, airbagLeft: stats.airbag,
    wingHealth: 1, rollAngle: 0, elapsed: 0, distance: 0, rest: 0, contacts: new Set(),
    ticks: 0, actions: [],
    ended: failed, reason: failed ? 'launch' : null,
    event: failed ? 'destroyed' : 'launch', eventSerial: 1,
  };
}

function event(s, type) { s.event = type; s.eventSerial++; }

export function boostFlight(s) {
  if (!s || s.ended || s.health <= 0 || !s.boostsLeft || s.elapsed - s.lastBoost < C.boostCooldown) return false;
  const previousSpeed = Math.hypot(s.vx, s.vy);
  const amount = levelConfig(s.level).boostScale / Math.sqrt(s.stats.mass);
  const upward = C.boostUpward * amount;
  s.vx += C.boostForward * amount;
  s.vy = Math.max(s.vy, -upward * .35) + upward;
  // Redirect a fast descent without throwing away its momentum.
  const kickedSpeed=Math.hypot(s.vx,s.vy),minimumSpeed=previousSpeed+C.boostForward*amount*.6;
  if(kickedSpeed<minimumSpeed){const factor=minimumSpeed/Math.max(kickedSpeed,.001);s.vx*=factor;s.vy*=factor;}
  s.boostsLeft--; s.boostsUsed++; s.lastBoost = s.elapsed; s.rest = 0;
  s.actions.push([s.ticks, 'boost']);
  event(s, 'boost'); return true;
}

export function detonateFlight(s) {
  if(!s || s.ended) return false;
  s.actions.push([s.ticks, 'abort']);
  s.health=0;s.ended=true;s.reason='abort';s.vx=0;s.vy=0;event(s,'destroyed');return true;
}

function impact(s, normalSpeed, damping = 1) {
  let damage = Math.max(0, normalSpeed - C.impactThreshold) * C.impactDamage * s.stats.damageFactor * damping;
  if (damage > 5 && s.airbagLeft > 0) { damage = Math.max(0, damage - s.airbagLeft); s.airbagLeft = 0; event(s, 'airbag'); }
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
  s.ticks++;
  s.elapsed += dt;
  const level = levelConfig(s.level);
  const nearby = obstaclesBetween(s.x - 20, s.x + Math.abs(s.vx) * dt + 60, s.level);
  const updraft = nearby.find(o => o.type === 'wind' && s.x >= o.x && s.x <= o.x + o.width && s.y < o.height && (s.updraftTime.get(o.id) || 0) < C.updraftDuration);
  if (updraft) s.updraftTime.set(updraft.id, (s.updraftTime.get(updraft.id) || 0) + dt);
  if (updraft && !s.usedUpdrafts.has(updraft.id)) {
    s.usedUpdrafts.add(updraft.id);
    event(s, 'updraft');
  }
  const effectiveWings = s.stats.wings * s.wingHealth;
  const lift = s.level !== 'space' && s.vy < 0 ? Math.min(level.gravity * 0.7, effectiveWings * C.wingLift * Math.abs(s.vx)) : 0;
  // Ease out in world space and as the thermal expires. Never teleport velocity
  // or accelerate an already fast-rising potato further upwards.
  const thermalFade = updraft ? clamp((updraft.height - s.y) / (updraft.height * .25), 0, 1)
    * clamp((C.updraftDuration - s.updraftTime.get(updraft.id)) / 1, 0, 1) : 0;
  const riseFactor = clamp(1 - Math.max(0, s.vy) / C.updraftRiseSpeed, 0, 1);
  const thermalLift = thermalFade * (C.updraftForce * Math.min(1.35, s.stats.windFactor) * riseFactor
    + Math.min(10, Math.max(0, -s.vy) * C.updraftBraking));
  s.vy += (-level.gravity + lift + thermalLift) * dt;
  if (s.y > C.radius + .1 || Math.abs(s.vy) > 1) s.vx += s.wind * C.windForce * s.stats.windFactor / s.stats.mass * dt;
  if (s.elapsed > .6 && s.elapsed < 2.6 && s.equipment.rocket) { s.vx += 3.5 * s.equipment.rocket * dt; s.vy += 1.8 * s.equipment.rocket * dt; }
  s.vx *= Math.exp(-s.stats.drag * level.dragScale * dt / s.stats.mass);
  s.vy *= Math.exp(-s.stats.drag * level.dragScale * dt / s.stats.mass);
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
    if (fresh && hit.ny > 0 && normalSpeed > 4) {
      const count = !obstacle && normalSpeed >= C.plantMinImpact && Math.abs(s.x - s.lastPlantX) >= C.plantSpacing
        ? Math.min(3, 1 + Math.floor(normalSpeed / 18)) : 0;
      if (count) { s.planted += count; s.lastPlantX = s.x; }
      s.impacts.push({ x: s.x, y: s.y - C.radius, time: s.elapsed, speed: normalSpeed, count, variety: (s.seed + s.planted) % 3 });
      if (s.impacts.length > 24) s.impacts.shift();
    }
    if (fresh) impact(s, normalSpeed, obstacle?.type === 'hay' ? 0.18 : obstacle?.type === 'mushroom' ? 0.12 : 1);
    if (s.ended) break;
    if (fresh && hit.ny > 0 && !obstacle) s.groundBounces++;
    let restitution = s.stats.bounce * (!obstacle ? C.bounceDecay ** Math.max(0, s.groundBounces - C.bounceDecayAfter) : 1);
    if (obstacle?.type === 'hay') { restitution = 0.12; if (fresh) { s.vx *= C.hayDamping; s.vy *= C.hayDamping; event(s, 'hay'); } }
    const dot = s.vx * hit.nx + s.vy * hit.ny;
    s.vx -= (1 + restitution) * dot * hit.nx;
    s.vy -= (1 + restitution) * dot * hit.ny;
    // A purchased pad should feel like a trampoline, especially on first landing.
    if (fresh && hit.ny > 0 && !obstacle && normalSpeed > 7 && s.padKicksLeft > 0) { s.vy += 2.5 * s.equipment.pads; s.padKicksLeft--; }
    if (obstacle?.type === 'mushroom' && fresh && !s.usedMushrooms.has(id) && normalSpeed >= C.mushroomMinSpeed) {
      const bouncer = BOUNCERS[obstacle.variant] || BOUNCERS.mushroom;
      s.vy = Math.max(s.vy, C.mushroomImpulse * bouncer.impulse + s.equipment.pads * 2 + s.equipment.springs * 3);
      s.vx = Math.abs(s.vx) + bouncer.forward;
      s.lastBouncer = obstacle.variant || 'mushroom';
      s.mushrooms++;
      s.usedMushrooms.add(id);
      event(s, 'mushroom');
    } else if (fresh && !obstacle && normalSpeed > 3) event(s, 'bounce');
    // Weak rebounds become a ground roll. Preserve horizontal momentum until friction stops it.
    if (!obstacle && hit.ny > 0 && s.vy < C.minBounceSpeed) {
      s.vy = 0; supported = true;
    }
    if (hit.ny > 0 && Math.abs(s.vy) < 1.3) { s.vy = 0; supported = true; }
    s.x += hit.nx * 0.00001; s.y += hit.ny * 0.00001;
    remaining *= 1 - hit.t;
  }
  s.contacts = touching;
  collectPickups(s);
  if (!s.ended && s.trafficEnabled) collideTraffic(s, dt);
  if (supported || (s.y <= C.radius + 0.02 && Math.abs(s.vy) < 1.3)) {
    s.rollAngle += s.vx * dt / C.radius;
    s.vx = Math.sign(s.vx) * Math.max(0, Math.abs(s.vx) - C.groundFriction * dt);
    if (Math.abs(s.vx) < C.restSpeed) s.rest += dt; else s.rest = 0;
  } else s.rest = 0;
  // A world-space rear boundary is deterministic and cannot depend on screen size.
  const rearBoundary = Math.max(C.rearLaserStart,s.distance-C.rearLaserDistance);
  if(!s.ended && s.level==='ground' && s.vx<0 && s.x<=rearBoundary){
    const fraction=clamp((s.previousX-rearBoundary)/Math.max(1e-9,s.previousX-s.x),0,1);
    s.x=rearBoundary;s.y=s.previousY+(s.y-s.previousY)*fraction;
    s.health=0;s.vx=0;s.vy=0;s.ended=true;s.reason='laser';s.milestones.add('wrongway');event(s,'laser');
  }
  s.distance = Math.max(s.distance, s.x);
  s.maxHeight = Math.max(s.maxHeight, s.y);
  if (s.health > 0 && s.elapsed >= 3 && s.settings.energy >= C.extremeEnergy && !s.equipment.armor && !s.equipment.braces && !s.equipment.airbag) s.milestones.add('naked');
  if (s.collected.size >= 8) s.milestones.add('collector');
  if (s.distance >= 500) s.milestones.add('distance');
  if (s.mushrooms >= 2) s.milestones.add('bounce');
  if (s.rest >= C.restTime && !s.ended) { s.ended = true; s.reason = 'rest'; event(s, 'rest'); }
  if (!s.ended && s.level === 'space' && s.distance >= level.targetDistance && s.maxHeight >= level.targetHeight) {
    s.ended = true; s.reason = 'escape'; s.milestones.add('escape'); event(s, 'escape');
  }
  return s;
}

export function collectPickups(s) {
  const radius = s.stats.pickupRadius;
  for (const p of pickupsBetween(Math.min(s.previousX, s.x) - radius, Math.max(s.previousX, s.x) + radius, s.level, s.seed)) {
    if (s.collected.has(p.id)) continue;
    if (segmentDistance(p.x, p.y, s.previousX, s.previousY, s.x, s.y) <= radius) {
      s.collected.add(p.id); s.pickupMaterial += p.value + s.equipment.satchel;
      if (!s.ended) event(s, 'pickup');
    }
  }
}
function collideTraffic(s, dt) {
  if (s.elapsed < C.trafficGrace || s.x < C.trafficSafeDistance) return;
  for (const t of trafficBetween(s.x - 30, s.x + 30, s.elapsed, s.seed, s.level)) {
    if (s.trafficHits.has(t.id)) continue;
    const previous = trafficBetween(s.x - 40, s.x + 40, s.elapsed - dt, s.seed, s.level).find(o => o.id === t.id) || t;
    if (segmentDistance(0, 0, s.previousX - previous.x, s.previousY - previous.y, s.x - t.x, s.y - t.y) > C.radius + t.radius) continue;
    const fromAbove = s.previousY - previous.y > t.radius * .5 && s.y - t.y > 0 && s.vy < (t.y - previous.y) / dt;
    s.trafficHits.add(t.id);
    s.trafficWrecks.push({ ...t, vx: -C.trafficSpeed * .5 + s.vx * .08, vy: -6, hitAt: s.elapsed, spin: s.vx >= 0 ? -2.5 : 2.5 });
    if (s.trafficWrecks.length > 16) s.trafficWrecks.shift();
    if (fromAbove) {
      impact(s, Math.abs(s.vy), .12);
      if (!s.ended) { s.vy = Math.max(C.trafficBounce + s.equipment.pads * 1.5, Math.abs(s.vy) * .6); s.rest = 0; }
    } else {
      impact(s, (Math.abs(s.vx) + C.trafficSpeed) * .55);
      if (!s.ended) { s.vx *= .65; s.vy = Math.max(s.vy, 10); }
    }
    if (!s.ended) {
      const before=s.boostsLeft;
      s.boostsLeft=Math.min(levelConfig(s.level).boosts,s.boostsLeft+C.trafficBoostRecharge);
      s.lastTrafficBoostGain=s.boostsLeft-before;
      s.milestones.add('traffic'); event(s, fromAbove ? 'traffic-bounce' : 'traffic');
    }
  }
}

// Rendering frequency only changes how many fixed steps run, not their size.
export class FixedClock {
  constructor() { this.accumulator = 0; }
  advance(seconds, callback, speed = 1) {
    this.accumulator += Math.min(Math.max(seconds, 0), 0.25) * clamp(speed, 1, 8);
    while (this.accumulator + 1e-10 >= C.step) { callback(C.step); this.accumulator = Math.max(0, this.accumulator - C.step); }
    return this.accumulator / C.step;
  }
  reset() { this.accumulator = 0; }
}
