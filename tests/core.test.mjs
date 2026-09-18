import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG as C } from '../src/config.mjs';
import { createFlight, stepFlight, launchStress, equipmentStats, obstaclesBetween, sweepBox, FixedClock } from '../src/physics.mjs';
import { freshProgress, sanitizeProgress, loadProgress, saveProgress, purchaseUpgrade, equipUpgrade, settleFlight } from '../src/progress.mjs';

function run(settings = C.defaults, equipment = {}, fps = 60) {
  const flight = createFlight(settings, equipment), clock = new FixedClock();
  for (let frame = 0; frame < fps * 150 && !flight.ended; frame++) clock.advance(1 / fps, dt => stepFlight(flight, dt));
  assert.ok(flight.ended, `Flight must finish: ${JSON.stringify({ settings, equipment })}`);
  return flight;
}
function falling(x, y, speed, equipment = {}) {
  const s = createFlight(C.defaults, equipment);
  Object.assign(s, { x, y, vx: 0, vy: -speed });
  return s;
}

test('same inputs produce exactly the same result at 30, 60 and 144 Hz', () => {
  const reference = run();
  for (const fps of [30, 60, 144]) {
    const flight = run(C.defaults, {}, fps);
    for (const key of ['distance', 'elapsed', 'health', 'x', 'y', 'wingHealth', 'reason']) assert.equal(flight[key], reference[key], key);
  }
});
test('default round takes 15–30 seconds and earns material in a few rounds', () => {
  const flight = run();
  assert.ok(flight.elapsed >= 15 && flight.elapsed <= 30, String(flight.elapsed));
  const state = freshProgress(), result = settleFlight(state, flight);
  assert.ok(result.earned > 10 && result.earned < 25);
});
test('extra mass lowers launch speed at the same energy', () => {
  const base = createFlight(C.defaults), armored = createFlight(C.defaults, { armor: 1 });
  assert.ok(armored.vx < base.vx && armored.vy < base.vy);
  assert.ok(armored.maxHealth > base.maxHealth);
});
test('stress preview matches actual launch damage, including exact boundaries', () => {
  for (const armor of [0, 1, 2, 3]) {
    const equipment = { armor }, stats = equipmentStats(equipment);
    for (const energy of [stats.safe - 1, stats.safe, stats.safe + 1, stats.lethal - 1, stats.lethal, stats.lethal + 1]) {
      const stress = launchStress(energy, equipment), flight = createFlight({ angle: 38, energy }, equipment);
      assert.equal(flight.health, stats.health - stress.damage);
      assert.equal(flight.ended, energy >= stats.lethal);
      assert.equal(stress.zone, energy >= stats.lethal ? 'lethal' : energy > stats.safe ? 'risky' : 'safe');
    }
  }
});
test('lethal overload ends at the cannon without distance or material', () => {
  const s = run({ angle: 38, energy: 150 });
  assert.equal(s.reason, 'launch'); assert.equal(s.distance, 0); assert.equal(s.health, 0);
  const p = freshProgress(); assert.equal(settleFlight(p, s).earned, 0);
});
test('ground collision bounces, damages and keeps earlier damage', () => {
  const s = falling(20, C.radius + .1, 25);
  stepFlight(s);
  assert.ok(s.vy > 0); assert.ok(s.health < s.maxHealth);
  const previousHealth = s.health;
  Object.assign(s, { y: C.radius + .1, vy: -25, contacts: new Set() }); stepFlight(s);
  assert.ok(s.health < previousHealth);
});
test('a hard impact can destroy an already damaged potato', () => {
  const s = falling(20, C.radius + .1, 25); s.health = 5; stepFlight(s);
  assert.equal(s.ended, true); assert.equal(s.reason, 'impact'); assert.equal(s.health, 0);
});
test('mushrooms impulse once per entering contact and hay damps impacts', () => {
  const mushroom = falling(62, 7.3, 25); stepFlight(mushroom);
  assert.equal(mushroom.event, 'mushroom'); assert.ok(mushroom.vy >= C.mushroomImpulse);
  const serial = mushroom.eventSerial; stepFlight(mushroom); assert.equal(mushroom.eventSerial, serial);
  const hay = falling(120, 9.3, 25), ground = falling(20, 2.3, 25);
  hay.vx = 10; ground.vx = 10; stepFlight(hay); stepFlight(ground);
  assert.ok(hay.health > ground.health); assert.ok(hay.vx < ground.vx); assert.equal(hay.event, 'hay');
});
test('swept collisions cannot tunnel through a narrow obstacle', () => {
  const hit = sweepBox(0, 3, 1000, 0, { left: 57, right: 68, bottom: 0, top: 5 });
  assert.equal(hit.t, .057); assert.equal(hit.nx, -1);
  const s = createFlight(C.defaults); Object.assign(s, { x: 95, y: 4, vx: 5000, vy: 0 }); stepFlight(s);
  assert.ok(s.x < 116, `Tunneled to ${s.x}`);
});
test('updraft slows descent; wings improve glide and wear on hard collision', () => {
  const wind = falling(165, 25, 4), still = falling(30, 25, 4); stepFlight(wind); stepFlight(still);
  assert.ok(wind.vy > still.vy);
  const wing = falling(30, 25, 4, { wings: 2 }), bare = falling(30, 25, 4);
  wing.vx = bare.vx = 20; stepFlight(wing); stepFlight(bare); assert.ok(wing.vy > bare.vy);
  Object.assign(wing, { y: 2.3, vy: -25, contacts: new Set() }); stepFlight(wing); assert.ok(wing.wingHealth < 1);
});
test('pads reduce impact damage and give a higher bounce', () => {
  const pads = falling(25, 2.3, 25, { pads: 2 }), bare = falling(25, 2.3, 25); stepFlight(pads); stepFlight(bare);
  assert.ok(pads.health > bare.health); assert.ok(pads.vy > bare.vy);
});
test('a stationary potato settles, with no infinite micro-bounces', () => {
  const s = falling(20, C.radius, 0);
  for (let i = 0; i < 240 && !s.ended; i++) stepFlight(s);
  assert.equal(s.reason, 'rest'); assert.ok(s.elapsed < 1);
});
test('track repeats exactly beyond the initial section', () => {
  const first = obstaclesBetween(0, 519), next = obstaclesBetween(520, 1039);
  assert.equal(first.length, next.length);
  first.forEach((o, i) => { assert.equal(o.type, next[i].type); assert.equal(o.x + 520, next[i].x); });
});
test('all sampled launch and equipment combinations terminate', () => {
  for (const angle of [10, 25, 38, 55, 75]) for (const energy of [15, 70, 100, 125, 150]) for (const e of [{}, { armor: 3 }, { wings: 3 }, { pads: 3 }, { armor: 3, wings: 3, pads: 3 }]) run({ angle, energy }, e);
});
test('different launch profiles favor different equipment', () => {
  const low = { angle: 15, energy: 80 }, high = { angle: 55, energy: 80 };
  const lowWings = run(low, { wings: 1 }), lowPads = run(low, { pads: 1 });
  const highWings = run(high, { wings: 1 }), highPads = run(high, { pads: 1 });
  assert.notEqual(Math.sign(lowWings.distance - lowPads.distance), Math.sign(highWings.distance - highPads.distance));
});
test('purchases cost material, unlock and equip; downgrades are free', () => {
  const p = freshProgress(); assert.equal(purchaseUpgrade(p, 'armor'), false); p.material = 200;
  assert.equal(purchaseUpgrade(p, 'armor'), true); assert.equal(p.material, 175); assert.equal(p.equipped.armor, 1);
  assert.equal(equipUpgrade(p, 'armor', 0), true); assert.equal(p.material, 175);
  assert.equal(equipUpgrade(p, 'armor', 2), false); assert.equal(equipUpgrade(p, 'armor', -1), false);
  assert.equal(equipUpgrade(p, 'bogus', 0), false); assert.equal(purchaseUpgrade(p, 'bogus'), false);
  purchaseUpgrade(p, 'armor'); purchaseUpgrade(p, 'armor'); assert.equal(purchaseUpgrade(p, 'armor'), false);
});
test('settlement pays once, including destroyed flights, and preserves stable top five ties', () => {
  const p = freshProgress(); const s = createFlight(C.defaults);
  assert.equal(settleFlight(p, s), null);
  Object.assign(s, { ended: true, health: 0, distance: 101.25 });
  assert.equal(settleFlight(p, s).earned, 11); assert.equal(settleFlight(p, s), null); assert.equal(p.material, 11);
  for (let i = 0; i < 7; i++) {
    const f = createFlight({ angle: 10 + i, energy: 70 }); Object.assign(f, { ended: true, distance: 200 }); settleFlight(p, f);
  }
  assert.equal(p.scores.length, 5); assert.deepEqual(p.scores.map(s => s.angle), [10, 11, 12, 13, 14]);
});
test('save/load round-trips progress and rejects corrupt or impossible state', () => {
  let data = null; const storage = { getItem: () => data, setItem: (_, value) => { data = value; } };
  const p = freshProgress(); p.material = 50; purchaseUpgrade(p, 'pads'); settleFlight(p, run());
  assert.equal(saveProgress(p, storage), true); assert.deepEqual(loadProgress(storage).state, p);
  data = 'not json'; assert.deepEqual(loadProgress(storage).state, freshProgress());
  data = 'null'; assert.deepEqual(loadProgress(storage).state, freshProgress());
  const sanitized = sanitizeProgress({ version: 1, material: -100, equipped: { armor: 3 }, settings: { angle: 999, energy: null }, scores: [null, { distance: -3 }] });
  assert.equal(sanitized.material, 0); assert.equal(sanitized.equipped.armor, 0); assert.equal(sanitized.settings.angle, 75); assert.equal(sanitized.scores.length, 0);
  assert.deepEqual(sanitizeProgress({ version: 999 }), freshProgress());
});
test('storage denial never prevents playing in memory', () => {
  const denied = { getItem() { throw Error('denied'); }, setItem() { throw Error('quota'); } };
  const loaded = loadProgress(denied); assert.equal(loaded.available, false); assert.equal(saveProgress(loaded.state, denied), false);
  const result = settleFlight(loaded.state, run()); assert.ok(result.earned > 0);
});
test('clock reset discards pending partial time and caps long frames', () => {
  const clock = new FixedClock(); let count = 0;
  clock.advance(C.step / 2, () => count++); clock.reset(); clock.advance(C.step / 2, () => count++); assert.equal(count, 0);
  clock.reset(); clock.advance(10, () => count++); assert.equal(count, 30);
});
