import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG as C, UPGRADE_KEYS, LEVELS, BOUNCERS } from '../src/config.mjs';
import { createFlight, stepFlight, equipmentStats, launchStress, collectPickups, sweepBox, FixedClock, boostFlight, detonateFlight, obstaclesBetween } from '../src/physics.mjs';
import { chargeEnergy, aimAngle, windAt, pickupsBetween, randomSource, trafficBetween, parallaxTiles, updraftsBetween } from '../src/world.mjs';
import { normalizePlayerName, DEFAULT_PLAYER_NAME, freshProgress, sanitizeProgress, loadProgress, saveProgress, spendTalent, refundTalent, setTalentRank, resetTalents, talentLevel, spentPoints, availablePoints, canUnlock, recordLaunch, settleFlight, unlockAchievements, STORAGE_KEY, LEGACY_KEY, unlockedLevels, selectLevel } from '../src/progress.mjs';

function run(settings = C.defaults, equipment = {}, options = { seed: 42 }, fps = 60, speed = 1) {
  const f = createFlight(settings, equipment, options), clock = new FixedClock();
  for (let i = 0; i < fps * 180 / speed && !f.ended; i++) clock.advance(1 / fps, dt => stepFlight(f, dt), speed);
  assert.ok(f.ended, `Unfinished ${JSON.stringify({ settings, equipment, options })}`); return f;
}
function falling(x, y, vy, equipment = {}) {
  const f = createFlight(C.defaults, equipment, { seed: 42, traffic: false });
  Object.assign(f, { x, previousX: x, y, previousY: y, vx: 0, vy: -vy }); return f;
}

test('hold power rises, falls and repeats, independently of rendering', () => {
  assert.equal(chargeEnergy(0), 20); assert.equal(chargeEnergy(C.chargeSeconds), 220);
  assert.equal(chargeEnergy(C.chargeSeconds * 2), 20);
  assert.ok(chargeEnergy(C.chargeSeconds * 1.2) < 220);
  for (let i = 0; i < 1000; i++) assert.ok(chargeEnergy(i / 30) >= 20 && chargeEnergy(i / 30) <= 220);
});
test('pointer aim has bounds and no dependency on screen density', () => {
  assert.equal(aimAngle(150, 50, 100, 100), 45);
  assert.equal(aimAngle(200, 110, 100, 100), C.limits.angle[0]);
  assert.equal(aimAngle(100, -100, 100, 100), C.limits.angle[1]);
});
test('same seed and wind phase replay identically across frame rates and fast-forward', () => {
  const reference = run(C.defaults, { wings: 1 }, { seed: 83462, windTime: 7 });
  for (const fps of [30, 60, 144]) for (const speed of [1, 2, 4, 8]) {
    const f = run(C.defaults, { wings: 1 }, { seed: 83462, windTime: 7 }, fps, speed);
    for (const key of ['distance', 'elapsed', 'health', 'pickupMaterial', 'wingHealth', 'reason']) assert.equal(f[key], reference[key], `${fps}Hz ${speed}x ${key}`);
    assert.deepEqual(f.collected, reference.collected); assert.deepEqual(f.milestones, reference.milestones);
  }
});
test('normal launches vary with their seed instead of revealing a fixed recipe', () => {
  const a = createFlight(C.defaults, {}, { seed: 1 }), b = createFlight(C.defaults, {}, { seed: 987 });
  assert.notEqual(a.vx, b.vx); assert.notEqual(a.vy, b.vy);
  assert.equal(randomSource(42)(), randomSource(42)());
});
test('even maximum charge can survive naked; overload also sometimes fails', () => {
  let survived = 0, failed = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const f = createFlight({ angle: 50, energy: 220 }, {}, { seed });
    if (f.ended) { failed++; assert.equal(f.distance, 0); assert.equal(f.reason, 'launch'); } else { survived++; assert.ok(f.health > 0); }
  }
  assert.ok(survived > 10 && failed > 10);
  assert.equal(launchStress(70, {}).failureChance, 0);
  assert.ok(launchStress(220, { armor: 3, braces: 3 }).failureChance < launchStress(220, {}).failureChance);
});
test('weight lowers launch speed; each talent affects its relevant behavior', () => {
  const bare = createFlight(C.defaults, {}, { seed: 1 }), heavy = createFlight(C.defaults, { armor: 3 }, { seed: 1 });
  assert.ok(heavy.vx < bare.vx); assert.ok(heavy.maxHealth > bare.maxHealth);
  assert.ok(equipmentStats({ streamline: 2 }).drag < equipmentStats({}).drag);
  assert.ok(equipmentStats({ magnet: 2 }).pickupRadius > equipmentStats({}).pickupRadius);
  assert.ok(equipmentStats({ sail: 2 }).windFactor > equipmentStats({}).windFactor);
});
test('wind changes slowly between launches and changes actual flight', () => {
  const values = Array.from({ length: 500 }, (_, i) => windAt(i, 984));
  assert.ok(Math.min(...values) < -2 && Math.max(...values) > 2);
  for (let i = 1; i < values.length; i++) assert.ok(Math.abs(values[i] - values[i - 1]) < .3);
  const a = run(C.defaults, {}, { seed: 42, windSeed: 1 }), b = run(C.defaults, {}, { seed: 42, windSeed: 5000 });
  assert.notEqual(a.distance, b.distance);
});
test('cumulative impact damage, pads and one-use airbag', () => {
  const bare = falling(25, 2.3, 25), pads = falling(25, 2.3, 25, { pads: 2 }), bag = falling(25, 2.3, 25, { airbag: 2 });
  for (const f of [bare, pads, bag]) stepFlight(f);
  assert.ok(bare.health < 100); assert.ok(pads.health > bare.health); assert.ok(pads.vy > bare.vy); assert.ok(bag.health > bare.health); assert.equal(bag.airbagLeft, 0);
  const hp = bare.health; Object.assign(bare, { y: 2.3, vy: -25, contacts: new Set() }); stepFlight(bare); assert.ok(bare.health < hp);
  bare.health = 1; Object.assign(bare, { y: 2.3, vy: -25, contacts: new Set() }); stepFlight(bare); assert.equal(bare.reason, 'impact');
});
test('mushrooms boost once each, springs amplify, and hay absorbs impacts', () => {
  const mushroom = falling(62, 7.3, 25), spring = falling(62, 7.3, 25, { springs: 2 });
  stepFlight(mushroom); stepFlight(spring); assert.ok(spring.vy > mushroom.vy); assert.equal(mushroom.mushrooms, 1);
  Object.assign(mushroom, { x: 62, y: 7.3, vy: -10, contacts: new Set() }); stepFlight(mushroom); assert.equal(mushroom.mushrooms, 1);
  const hay = falling(120, 9.3, 25), ground = falling(25, 2.3, 25); stepFlight(hay); stepFlight(ground); assert.ok(hay.health > ground.health);
});
test('wings glide and take damage; rocket adds thrust', () => {
  const wing = falling(30, 25, 4, { wings: 2 }), bare = falling(30, 25, 4); wing.vx = bare.vx = 20;
  stepFlight(wing); stepFlight(bare); assert.ok(wing.vy > bare.vy);
  Object.assign(wing, { y: 2.3, vy: -25, contacts: new Set() }); stepFlight(wing); assert.ok(wing.wingHealth < 1);
  const rocket = falling(30, 30, 4, { rocket: 2 }), control = falling(30, 30, 4); rocket.elapsed = control.elapsed = 1;
  stepFlight(rocket); stepFlight(control); assert.ok(rocket.vx > control.vx); assert.ok(rocket.vy > control.vy);
});
test('swept tests prevent tunnelling through collisions and pickups', () => {
  assert.equal(sweepBox(0, 3, 1000, 0, { left: 57, right: 68, bottom: 0, top: 5 }).t, .057);
  const target=pickupsBetween(0,100,'ground',42)[0];
  const s = createFlight(C.defaults, {}, { seed: 42 }); Object.assign(s, { previousX: target.x-30, previousY: target.y, x: target.x+30, y: target.y });
  collectPickups(s); assert.ok(s.pickupMaterial >= 3);
  const first = s.pickupMaterial; collectPickups(s); assert.equal(s.pickupMaterial, first);
});
test('magnet reaches farther and satchel increases actual pickup value', () => {
  const p=pickupsBetween(0,100,'ground',42)[0];
  const bare = falling(p.x, p.y+5, 0), magnet = falling(p.x, p.y+5, 0, { magnet: 2, satchel: 2 });
  collectPickups(bare); collectPickups(magnet); assert.equal(bare.collected.size, 0); assert.ok(magnet.collected.size > 0);
  assert.ok(magnet.pickupMaterial >= p.value + 2);
});
test('opposing traffic is optional and collisions occur at most once per vehicle', () => {
  const f = createFlight(C.defaults, { armor: 3 }, { seed: 42 }); const t = trafficBetween(0, 600, 3, 42)[0]; f.elapsed = 3;
  Object.assign(f, { x: t.x, y: t.y, vx: 20, vy: 0 }); stepFlight(f);
  assert.equal(f.trafficHits.size, 1); assert.ok(f.milestones.has('traffic'));
  const health = f.health; stepFlight(f); assert.equal(f.health, health);
  const off = createFlight(C.defaults, {}, { seed: 42, traffic: false }); Object.assign(off, { elapsed:3, x: t.x, y: t.y, vx: 20, vy: 0 }); stepFlight(off); assert.equal(off.trafficHits.size, 0);
});
test('sampled shots finish without time-based forced destruction', () => {
  const all = Object.fromEntries(UPGRADE_KEYS.map(k => [k, 3]));
  for (const seed of [42, 4096, 8262]) for (const angle of [10, 38, 70]) for (const energy of [20, 70, 130, 220]) for (const eq of [{}, { wings: 3, sail: 3 }, { pads: 3 }, all]) run({ angle, energy }, eq, { seed }, 60, 8);
});
test('resting potato ends even with changing wind', () => {
  const f = falling(20, C.radius, 0); for (let i = 0; i < 200 && !f.ended; i++) stepFlight(f);
  assert.equal(f.reason, 'rest'); assert.ok(f.elapsed < 1);
});
test('talents allocate points directly, respect rank gates and never cost scrap', () => {
  const p = freshProgress(); p.xp = 900; p.material = 1000;
  assert.equal(canUnlock(p,'rocket'),false); assert.equal(spendTalent(p,'rocket'),false);
  for (const key of ['pads','pads','springs','springs','rocket']) assert.equal(spendTalent(p,key),true);
  assert.equal(p.material,1000); assert.equal(spentPoints(p),5); assert.equal(availablePoints(p),5);
  assert.equal(refundTalent(p,'pads'),true); // Child points refund as a group when their prerequisite is removed.
  assert.equal(p.equipped.pads,1); assert.equal(p.equipped.springs,0); assert.equal(p.equipped.rocket,0);
  assert.equal(availablePoints(p),9);
  assert.equal(spendTalent(p,'__proto__'),false); assert.equal(refundTalent(p,'bogus'),false);
  for (let i=0;i<3;i++) assert.equal(spendTalent(p,'magnet'),true);
  assert.equal(spendTalent(p,'magnet'),false); resetTalents(p);
  assert.equal(spentPoints(p),0);assert.equal(availablePoints(p),10);assert.equal(p.xp,900);
});
test('XP grows from every settled run including failure, caps talent budget at twenty and awards once', () => {
  const p=freshProgress(); assert.equal(talentLevel(p),1);assert.equal(availablePoints(p),1);
  assert.equal(spendTalent(p,'armor'),true);assert.equal(spendTalent(p,'pads'),false);
  for(let i=0;i<64;i++){
    const f=createFlight(C.defaults,{}, {seed:42});Object.assign(f,{ended:true,reason:'launch',distance:0});
    const before=p.xp;const result=settleFlight(p,f);assert.equal(result.xpEarned,30);assert.equal(p.xp,before+30);
    assert.equal(settleFlight(p,f),null);assert.equal(p.xp,before+30);
  }
  assert.equal(talentLevel(p),20);assert.equal(availablePoints(p),19);
  for(const key of ['armor','armor','wings','wings','wings','pads','pads','pads','magnet','magnet','magnet','braces','braces','sail','sail','sail','springs','springs','springs']) assert.equal(spendTalent(p,key),true);
  assert.equal(spentPoints(p),20);assert.equal(spendTalent(p,'braces'),false);assert.ok(p.achievements.includes('tinkerer'));
  const rich=createFlight(C.defaults,{}, {seed:42});Object.assign(rich,{ended:true,reason:'rest',distance:600,pickupMaterial:25});
  assert.equal(settleFlight(p,rich).xpEarned,58);assert.equal(talentLevel(p),20);
});
test('migration credits previous runs and purchases while trimming allocations safely', () => {
  const old={version:2,attempts:2,material:777,purchased:Object.fromEntries(UPGRADE_KEYS.map(k=>[k,3])),equipped:Object.fromEntries(UPGRADE_KEYS.map(k=>[k,3]))};
  const p=sanitizeProgress(old);assert.equal(p.version,3);assert.equal(p.material,777);assert.equal(talentLevel(p),20);assert.equal(spentPoints(p),20);
  assert.equal(p.purchased.rocket,3); // Preserve the old purchase snapshot.
  for(const key of UPGRADE_KEYS) if(p.equipped[key]) assert.equal(canUnlock(p,key),true);
  const corrupt=sanitizeProgress({...p,xp:0});assert.ok(spentPoints(corrupt)<=1);
  assert.deepEqual(sanitizeProgress(p),p);
});
test('gathered material survives destruction and settlement pays once', () => {
  const p = freshProgress(), f = createFlight(C.defaults, {}, { seed: 42 });
  assert.equal(settleFlight(p, f), null);
  Object.assign(f, { ended: true, reason: 'impact', health: 0, distance: 90, pickupMaterial: 23 });
  const result = settleFlight(p, f); assert.equal(result.collected, 23); assert.equal(result.salvage, 3); assert.equal(result.landing, 0); assert.equal(p.material, 26);
  assert.equal(settleFlight(p, f), null); assert.equal(p.material, 26);
});
test('landing and recycling reward surviving, not launch failures', () => {
  const p = freshProgress(), f = createFlight(C.defaults, { recycler: 2 }, { seed: 42 }); Object.assign(f, { ended: true, reason: 'rest', distance: 90 });
  const r = settleFlight(p, f); assert.equal(r.landing, 9); assert.equal(r.salvage, 5);
  const failure = createFlight({ angle: 50, energy: 220 }, {}, { seed: 7 }); Object.assign(failure, { ended: true, reason: 'launch', distance: 0 });
  assert.equal(settleFlight(p, failure).earned, 0);
});
test('naked extreme achievement requires surviving flight, and stays earned after later crash', () => {
  let f; for (let seed = 1; seed < 100; seed++) { f = createFlight({ angle: 70, energy: 220 }, {}, { seed, traffic: false }); if (!f.ended) break; }
  for (let i = 0; i < 370; i++) stepFlight(f); assert.ok(f.milestones.has('naked'));
  Object.assign(f, { ended: true, reason: 'impact', health: 0 });
  const p = freshProgress(); assert.ok(settleFlight(p, f).achievements.includes('naked')); assert.deepEqual(unlockAchievements(p, ['naked']), []);
  const armored = createFlight({ angle: 70, energy: 220 }, { armor: 1 }, { seed: 42, traffic: false }); for (let i = 0; i < 370; i++) stepFlight(armored); assert.equal(armored.milestones.has('naked'), false);
});
test('collector, distance, pinball and twenty-point achievements have working triggers', () => {
  const f = falling(510, 20, 0); f.collected = new Set(Array.from({ length: 8 }, (_, i) => String(i))); f.mushrooms = 2; stepFlight(f);
  for (const id of ['collector', 'distance', 'bounce']) assert.ok(f.milestones.has(id));
  const p = freshProgress(); p.xp = 1900; for (const key of ['armor', 'wings', 'pads', 'magnet', 'braces', 'sail', 'springs']) for (let i = 0; i < 3; i++) spendTalent(p, key);
  assert.ok(p.achievements.includes('tinkerer'));
});
test('version-one progress migrates without losing money, loadout or records', () => {
  const old = { version: 1, material: 123, attempts: 4, purchased: { armor: 2, wings: 1, pads: 0 }, equipped: { armor: 1, wings: 1 }, settings: { angle: 42, energy: 90 }, scores: [{ distance: 123, equipment: { armor: 1 }, angle: 42, energy: 90 }] };
  const data = new Map([[LEGACY_KEY, JSON.stringify(old)]]), storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  const { state } = loadProgress(storage); assert.equal(state.version, 3); assert.equal(state.material, 123); assert.equal(state.equipped.armor, 1); assert.equal(state.scores[0].legacy, true); assert.equal(state.purchased.magnet, 0);
  saveProgress(state, storage); assert.equal(data.get(LEGACY_KEY), JSON.stringify(old)); assert.deepEqual(loadProgress(storage).state, state);
});
test('save/load handles invalid state and blocked storage', () => {
  const p = freshProgress(); p.material = 75; spendTalent(p, 'magnet'); settleFlight(p, run());
  let saved; const storage = { getItem: () => saved, setItem: (_, v) => { saved = v; } };
  assert.equal(saveProgress(p, storage), true); assert.deepEqual(loadProgress(storage).state, p);
  saved = 'broken'; assert.deepEqual(loadProgress(storage).state, freshProgress());
  const bad = sanitizeProgress({ version: 2, material: -1, purchased: { rocket: 3 }, achievements: ['fake', 'first', 'first'], preferences: { theme: 'evil' } });
  assert.equal(bad.purchased.rocket, 0); assert.equal(bad.material, 0); assert.deepEqual(bad.achievements, ['first']);
  const denied = { getItem() { throw Error(); }, setItem() { throw Error(); } };
  assert.equal(loadProgress(denied).available, false); assert.equal(saveProgress(p, denied), false);
});
test('top-five ties remain stable without displaying a shooting recipe', () => {
  const p = freshProgress(); for (let i = 0; i < 7; i++) { const f = createFlight(C.defaults, {}, { seed: i }); Object.assign(f, { ended: true, distance: 200 }); settleFlight(p, f); }
  assert.equal(p.scores.length, 5); assert.deepEqual(p.scores.map(s => s.seed), [0, 1, 2, 3, 4]);
});
test('clock caps lag, multiplies steps for speed, and clears remainder on pause', () => {
  const clock = new FixedClock(); let steps = 0;
  clock.advance(C.step / 2, () => steps++); clock.reset(); clock.advance(C.step / 2, () => steps++); assert.equal(steps, 0);
  clock.reset(); clock.advance(10, () => steps++, 8); assert.equal(steps, 240);
});

test('yellow charge rarely fails and is much safer than red overload', () => {
  for (const energy of [100, 140, 174]) {
    let failures = 0;
    for (let seed = 0; seed < 1000; seed++) if (createFlight({ angle: 40, energy }, {}, { seed }).ended) failures++;
    assert.ok(failures < 50, `${energy}: ${failures}/1000`);
  }
  assert.ok(launchStress(174, {}).failureChance < .036);
  assert.ok(launchStress(220, {}).failureChance > .4);
});
test('horizontal wind is captured at launch and stays fixed during flight', () => {
  const a = createFlight(C.defaults, {}, { seed: 42, windTime: 17 }), b = createFlight(C.defaults, {}, { seed: 42, windTime: 17 });
  const captured = a.wind;
  b.windSeed = 9999; b.windTime = 3000;
  for (let i = 0; i < 900; i++) { stepFlight(a); stepFlight(b); assert.equal(a.wind, captured); }
  assert.equal(a.x, b.x); assert.equal(a.y, b.y);
  assert.equal(createFlight(C.defaults, {}, { level: 'space', wind: 3 }).wind, 0);
});
test('updraft slows descent gently, extends above the initial view and expires', () => {
  const a = falling(165, 25, 12); stepFlight(a);
  assert.ok(a.vy > -12 && a.vy < -11); assert.ok(a.usedUpdrafts.size > 0);
  const high = falling(165, 180, 12); stepFlight(high);
  assert.ok(high.vy > -12); assert.ok(high.usedUpdrafts.size > 0);
  const fast = falling(165, 180, 12); fast.vy = 40; stepFlight(fast);
  assert.ok(fast.vy < 40, 'thermal must not accelerate an already fast ascent');
  const edge = falling(165, 319.99, 12), outside = falling(165, 320.01, 12);
  stepFlight(edge); stepFlight(outside);
  assert.ok(Math.abs(edge.vy - outside.vy) < .001, 'no hard velocity change at the upper edge');
  const id = [...a.usedUpdrafts][0]; a.updraftTime.set(id, C.updraftDuration);
  Object.assign(a, { x: 165, y: 25, vx: 0, vy: -4 }); stepFlight(a);
  assert.ok(a.vy < -4);
});
test('pads add a pronounced finite trampoline kick and record landing locations', () => {
  const bare = falling(25, 2.3, 25), padded = falling(25, 2.3, 25, { pads: 3 });
  stepFlight(bare); stepFlight(padded);
  assert.ok(padded.vy > bare.vy * 2.3); assert.equal(padded.padKicksLeft, 2);
  assert.equal(padded.impacts.length, 1); assert.ok(Math.abs(padded.impacts[0].y) < .001);
});

test('midair boosts are limited, cooldown gated, and cannot resurrect a dead flight', () => {
  const f = createFlight(C.defaults, {}, { seed: 42 }); f.vy = -30;
  assert.equal(boostFlight(f), true); assert.ok(f.vy > 0); assert.equal(f.boostsLeft, 1);
  assert.equal(boostFlight(f), false);
  f.elapsed += C.boostCooldown; assert.equal(boostFlight(f), true); assert.equal(f.boostsLeft, 0);
  f.elapsed += C.boostCooldown; assert.equal(boostFlight(f), false);
  f.ended = true; f.boostsLeft = 2; assert.equal(boostFlight(f), false);
  assert.equal(createFlight(C.defaults, {}, { level: 'sky' }).boostsLeft, 3);
  assert.equal(createFlight(C.defaults, {}, { level: 'space' }).boostsLeft, 4);
});
test('boosted flights replay identically at different frame rates and simulation speeds', () => {
  function boosted(fps, speed) {
    const f = createFlight({ angle: 55, energy: 145 }, {}, { seed: 42, traffic: false, level: 'ground' });
    const clock = new FixedClock(); let tick = 0;
    for (let i = 0; i < fps * 200 / speed && !f.ended; i++) clock.advance(1 / fps, () => {
      if ([120, 360, 600, 840].includes(tick++)) boostFlight(f); stepFlight(f);
    }, speed);
    assert.ok(f.ended); return f;
  }
  const a = boosted(60, 1);
  for (const [fps, speed] of [[30, 1], [144, 4], [60, 8]]) {
    const b = boosted(fps, speed);
    for (const key of ['x', 'y', 'health', 'elapsed', 'maxHeight', 'boostsUsed', 'pickupMaterial', 'planted']) assert.equal(b[key], a[key], key);
  }
});
test('only ground is selectable; old upper-world records and achievements survive migration', () => {
  const raw = freshProgress(); raw.material = 312; raw.journey.selected = 'space'; raw.journey.escaped = true;
  raw.journey.records.ground = { distance: 400, height: 150 };
  raw.journey.records.sky = { distance: 1400, height: 800 };
  raw.achievements = ['aviator', 'orbital', 'escape'];
  raw.scores = [{ level: 'space', distance: 4200, height: 800 }];
  const p = sanitizeProgress(raw);
  assert.equal(p.journey.selected, 'ground'); assert.deepEqual(unlockedLevels(p), ['ground']);
  assert.equal(selectLevel(p, 'sky'), false); assert.equal(selectLevel(p, 'space'), false);
  assert.equal(p.material, 312); assert.equal(p.scores[0].level, 'space'); assert.deepEqual(p.achievements, raw.achievements);
  assert.equal(p.journey.records.sky.distance, 1400); assert.equal(p.journey.escaped, true);
  const f = createFlight(C.defaults, {}, { seed: 42 }); Object.assign(f, { ended: true, distance: 500, maxHeight: 300 });
  assert.deepEqual(settleFlight(p, f).unlocked, []);
});
test('launch is immediate and weak rebounds roll out without stopping flight at its apex', () => {
  const shot = createFlight(C.defaults, {}, { seed: 42, traffic: false });
  assert.ok(Math.hypot(shot.vx, shot.vy) > 55);
  for (let i = 0; i < 24; i++) stepFlight(shot);
  assert.ok(shot.x > 8, 'leaves the muzzle decisively in the first 200 ms');
  const apex = falling(25, 80, 0); stepFlight(apex); assert.equal(apex.ended, false);
  const weak = falling(25, 2.21, 8); weak.vx = 20; stepFlight(weak);
  assert.equal(weak.ended, false); assert.equal(weak.vy, 0); assert.ok(weak.vx > 19.8);
  const x = weak.x;
  for (let i = 0; i < 120 * 8 && !weak.ended; i++) { stepFlight(weak); if (weak.reason === 'rest') assert.ok(Math.hypot(weak.vx, weak.vy) < C.restSpeed); }
  assert.equal(weak.reason, 'rest'); assert.ok(weak.x > x + 10); assert.ok(weak.rollAngle > 0);
  const mushroom = falling(62, 7.21, 3); stepFlight(mushroom);
  assert.equal(mushroom.ended, false); assert.ok(mushroom.vy >= C.mushroomImpulse);
});
test('upgraded bounces remain strong initially but decay to a prompt landing', () => {
  const f = falling(25, 2.3, 25, { pads: 3, armor: 3 });
  for (let i = 0; i < 120 * 40 && !f.ended; i++) stepFlight(f);
  assert.equal(f.reason, 'rest'); assert.ok(f.elapsed < 35); assert.ok(f.groundBounces <= 9);
  assert.ok(f.impacts.length >= 3); assert.ok(f.planted > 0);
});
test('only distinct soil impacts plant; harvest counts persist and achievements settle once', () => {
  const f = falling(25, 2.3, 25, { armor: 3 }); stepFlight(f);
  assert.equal(f.planted, 2); assert.equal(f.impacts[0].count, 2);
  Object.assign(f, { x: 25, y: 2.3, vy: -25, contacts: new Set() }); stepFlight(f);
  assert.equal(f.planted, 2, 'same patch is not planted repeatedly');
  Object.assign(f, { x: 45, y: 2.3, vy: -25, contacts: new Set() }); stepFlight(f);
  assert.equal(f.planted, 4);
  for (const [x,y] of [[62,7.3],[120,9.3]]) {
    const obstacle = falling(x,y,25); stepFlight(obstacle); assert.equal(obstacle.planted, 0);
  }
  const p = freshProgress(); p.planted = 8; f.ended = true;
  assert.ok(settleFlight(p,f).achievements.includes('seedling')); assert.equal(p.planted,12);
  assert.equal(settleFlight(p,f),null); assert.equal(p.planted,12);
  const again = falling(25,2.3,25); stepFlight(again); again.ended = true; p.planted = 198;
  const result = settleFlight(p,again); assert.equal(p.planted,200);
  assert.ok(result.achievements.includes('gardener')); assert.ok(result.achievements.includes('farmer'));
  assert.equal(sanitizeProgress(p).planted,200);
  assert.equal(sanitizeProgress({ version:2, planted:-10 }).planted,0);
  assert.equal(sanitizeProgress({ version:2 }).planted,0);
});
test('parallax scenery keeps its identity and moves continuously across tile boundaries', () => {
  for (const [factor,spacing] of [[.17,190],[.33,135],[.49,100],[.36,160],[.22,225]]) {
    for (const multiple of [1,2,5,13]) {
      const camera = spacing * multiple / factor;
      const before = parallaxTiles(camera-.01,factor,spacing,1000);
      const after = parallaxTiles(camera+.01,factor,spacing,1000);
      for (const tile of before.filter(t => t.x > 0 && t.x < 1000)) {
        const next = after.find(t => t.index === tile.index); assert.ok(next);
        assert.ok(Math.abs(next.x-tile.x + .02*factor) < 1e-8);
      }
    }
  }
});
test('an old v2 save retains its talents, money and records without inventing height unlocks', () => {
  const old = freshProgress(); old.version = 2; delete old.journey; old.material = 321; old.purchased.pads = 2; old.equipped.pads = 1;
  old.scores = [{ distance: 1000, equipment: {}, angle: 38, energy: 70, collected: 12, seed: 42, legacy: false }];
  const p = sanitizeProgress(old); assert.equal(p.material, 321); assert.equal(p.equipped.pads, 1);
  assert.equal(p.journey.records.ground.distance, 1000); assert.equal(p.journey.records.ground.height, 0);
  assert.deepEqual(unlockedLevels(p), ['ground']);
});

test('individual rank fields allocate atomically and deselection refunds dependent ranks', () => {
  const p=freshProgress();
  assert.equal(setTalentRank(p,'pads',3),false);assert.equal(p.equipped.pads,0);
  assert.equal(setTalentRank(p,'pads',1),true);assert.equal(availablePoints(p),0);
  assert.equal(setTalentRank(p,'pads',0),true);assert.equal(availablePoints(p),1);
  p.xp=900;
  assert.equal(setTalentRank(p,'pads',3),true);assert.equal(spentPoints(p),3);
  assert.equal(setTalentRank(p,'springs',2),true);assert.equal(setTalentRank(p,'rocket',1),true);
  assert.equal(setTalentRank(p,'pads',1),true);assert.equal(spentPoints(p),1);
  assert.equal(p.equipped.springs,0);assert.equal(p.equipped.rocket,0);
  for(const target of [-1,4,1.5,NaN]) assert.equal(setTalentRank(p,'pads',target),false);
  assert.equal(setTalentRank(p,'__proto__',1),false);
});

test('surviving runs never finish at high speed across shot and equipment variations', () => {
  for (const angle of [10,38,70]) for (const energy of [20,70,140,220]) for (const equipment of [{},{pads:3},{armor:3,pads:3},{wings:3}]) {
    const f=run({angle,energy},equipment,{seed:42,traffic:false});
    if(f.reason==='rest') assert.ok(Math.hypot(f.vx,f.vy)<C.restSpeed, `${angle}/${energy}: ${f.vx},${f.vy}`);
  }
});

test('traffic leaves the launch area clear and landing on a UFO boosts upward once', () => {
  for(const elapsed of [0,1,3,15,50]) assert.equal(trafficBetween(0,C.trafficSafeDistance-21,elapsed,42).length,0);
  const t=trafficBetween(0,600,3,42)[0];assert.ok(t.radius<5);
  const early=createFlight(C.defaults,{}, {seed:42});
  const start=trafficBetween(0,600,0,42)[0];Object.assign(early,{x:start.x,y:start.y,vx:0,vy:0});stepFlight(early);
  assert.equal(early.trafficHits.size,0);
  const f=createFlight(C.defaults,{}, {seed:42});
  Object.assign(f,{elapsed:3,x:t.x,y:t.y+t.radius+C.radius-.05,vx:0,vy:-25});stepFlight(f);
  assert.equal(f.trafficHits.size,1);assert.equal(f.trafficWrecks.length,1);assert.ok(f.vy>=C.trafficBounce);
  assert.equal(f.event,'traffic-bounce');assert.ok(f.health>90);
  const wreck=f.trafficWrecks[0];assert.ok(wreck.vy<0);assert.equal(wreck.id,t.id);
  stepFlight(f);assert.equal(f.trafficWrecks.length,1);
});

test('thermals have irregular separated spacing and stable identities across query windows', () => {
  const zones=updraftsBetween(0,10000);assert.equal(zones.length,C.thermalCount);
  const gaps=zones.slice(1).map((z,i)=>z.x-zones[i].x-zones[i].width);
  assert.ok(gaps.every(g=>g>=C.thermalGap[0]&&g<=C.thermalGap[1]));assert.ok(new Set(gaps).size>2);
  for(const zone of zones) assert.deepEqual(updraftsBetween(zone.x+1,zone.x+2),[zone]);
  assert.equal(new Set(zones.map(z=>z.id)).size,zones.length);
});
test('four bouncer types have distinct impulses and each activates once per flight', () => {
  const objects=obstaclesBetween(0,1100).filter(o=>o.type==='mushroom');
  assert.deepEqual(new Set(objects.map(o=>o.variant)),new Set(Object.keys(BOUNCERS)));
  const velocities=[];
  for(const variant of Object.keys(BOUNCERS)){
    const o=objects.find(o=>o.variant===variant),f=falling(o.x+o.width/2,o.height+C.radius+.1,25);
    stepFlight(f);assert.equal(f.lastBouncer,variant);assert.equal(f.mushrooms,1);velocities.push(f.vy);
    assert.ok(f.vy>=C.mushroomImpulse*BOUNCERS[variant].impulse);
    Object.assign(f,{x:o.x+o.width/2,y:o.height+C.radius+.1,vy:-10,contacts:new Set()});stepFlight(f);assert.equal(f.mushrooms,1);
  }
  assert.equal(new Set(velocities).size,4);
});

test('cosmetics spend a separate plant balance, preserve achievements and never alter flight', async () => {
  const {COSMETICS, cosmeticBalance, buyCosmetic, toggleCosmetic} = await import('../src/cosmetics.mjs');
  const state=freshProgress();state.planted=250;state.achievements=['farmer'];
  const before=run(state.settings,state.equipped);
  assert.equal(buyCosmetic(state,'missing'),false);
  assert.equal(toggleCosmetic(state,'crown'),false);
  for(const id of Object.keys(COSMETICS)) assert.equal(buyCosmetic(state,id),true);
  assert.equal(state.planted,250);assert.deepEqual(state.achievements,['farmer']);
  assert.equal(state.cosmetics.equipped.hat,'crown');
  const balance=cosmeticBalance(state);assert.equal(balance,60);
  assert.equal(buyCosmetic(state,'crown'),false);assert.equal(cosmeticBalance(state),balance);
  assert.equal(toggleCosmetic(state,'bucket'),true);assert.equal(state.cosmetics.equipped.hat,'bucket');
  toggleCosmetic(state,'bucket');assert.equal(state.cosmetics.equipped.hat,undefined);
  assert.deepEqual(run(state.settings,state.equipped),before);
  assert.deepEqual(sanitizeProgress(JSON.parse(JSON.stringify(state))),state);
});
test('cosmetic saves migrate safely, reject invalid ownership and prevent overspending', async () => {
  const {cosmeticBalance,buyCosmetic} = await import('../src/cosmetics.mjs');
  const state=freshProgress();state.planted=12;
  assert.equal(buyCosmetic(state,'night'),false);assert.equal(buyCosmetic(state,'bunting'),true);
  assert.equal(cosmeticBalance(state),0);assert.equal(buyCosmetic(state,'shades'),false);
  const clean=sanitizeProgress({...state,cosmetics:{owned:['bunting','bunting','__proto__','crown'],equipped:{trail:'bunting',hat:'crown'}}});
  assert.deepEqual(clean.cosmetics,{owned:['bunting'],equipped:{trail:'bunting'}});
  assert.deepEqual(sanitizeProgress({version:2,planted:50}).cosmetics,{owned:[],equipped:{}});
});

test('outer sprouts unlock through either approach and only refund when all routes disappear', () => {
  const p=freshProgress();p.xp=1300;
  for(const [key,rank] of [['wings',2],['sail',2],['airbag',1]]) assert.equal(setTalentRank(p,key,rank),true);
  assert.equal(p.equipped.braces,0);assert.equal(canUnlock(p,'airbag'),true);
  assert.deepEqual(sanitizeProgress(p),p,'alternate-path build survives reload');
  setTalentRank(p,'armor',2);setTalentRank(p,'braces',2);
  refundTalent(p,'sail');assert.equal(p.equipped.airbag,1,'second path keeps terminal connected');
  refundTalent(p,'braces');assert.equal(p.equipped.airbag,0,'last broken path refunds terminal');
  assert.ok(availablePoints(p)>0);
});
test('twenty-level expansion preserves old XP, builds and earned achievements', () => {
  const p=freshProgress();p.xp=1300;p.equipped.armor=3;p.achievements=['tinkerer'];
  const restored=sanitizeProgress(p);assert.equal(talentLevel(restored),14);assert.equal(availablePoints(restored),11);
  assert.equal(restored.equipped.armor,3);assert.ok(restored.achievements.includes('tinkerer'));
  assert.equal(talentLevel(sanitizeProgress({...p,xp:900})),10);
  for(const [xp,level] of [[1399,14],[1400,15],[1899,19],[1900,20],[5000,20]]){
    const expanded=sanitizeProgress({...p,xp});assert.equal(talentLevel(expanded),level);
    assert.equal(availablePoints(expanded),level-3);assert.equal(expanded.xp,xp);
    assert.deepEqual(expanded.equipped,p.equipped);assert.ok(expanded.achievements.includes('tinkerer'));
  }
});
test('armor materially reduces both extreme launch failures and lasting launch damage', () => {
  const sets=[{}, {armor:1}, {armor:3}, {armor:3,braces:3}];
  const failures=sets.map(equipment=>{
    let count=0;for(let seed=0;seed<2000;seed++) if(createFlight({angle:60,energy:220},equipment,{seed}).reason==='launch') count++;
    return count;
  });
  assert.ok(failures[0]>1300&&failures[0]<1700,JSON.stringify(failures));
  for(let i=1;i<failures.length;i++) assert.ok(failures[i]<failures[i-1]*.9,JSON.stringify(failures));
  assert.ok(failures[2]<failures[0]*.6);assert.ok(failures[3]<failures[0]*.3);
  let pair;
  for(let seed=1;seed<100;seed++) { const naked=createFlight({angle:60,energy:220},{},{seed}); if(!naked.ended){pair=[naked,createFlight({angle:60,energy:220},{armor:3},{seed})];break;} }
  assert.ok(pair);assert.ok(pair[0].health<pair[0].maxHealth*.7);
  assert.ok(pair[1].maxHealth-pair[1].health<pair[0].maxHealth-pair[0].health);
  assert.ok(pair[1].vx<pair[0].vx,'armor still trades speed for protection');
});


test('full charge is fastest at equal equipment and launch punch is immediate', () => {
  for(const equipment of [{},{armor:3},{wings:3,pads:2}]){
    let previous=0;
    for(const energy of [20,70,130,175,200,220]){
      for(let seed=1;seed<=20;seed++){
        const f=createFlight({angle:38,energy},equipment,{seed});
        const speed=Math.hypot(f.vx,f.vy);assert.ok(speed>previous);
        assert.ok(Math.abs(speed-Math.sqrt(2*energy*C.energyMultiplier/equipmentStats(equipment).mass)*LEVELS.ground.launchScale*C.muzzleKick)<1e-8);
      }
      const f=createFlight({angle:38,energy},equipment,{seed:1});previous=Math.hypot(f.vx,f.vy);
    }
  }
  const f=createFlight(C.defaults,{}, {seed:42});assert.ok(Math.hypot(f.vx,f.vy)>69);stepFlight(f);assert.ok(f.x>0);
});
test('boosts add speed even during a very fast descent', () => {
  for(const vy of [-140,-70,-20,0,40,100]){
    const f=createFlight(C.defaults,{armor:3},{seed:42});f.vx=25;f.vy=vy;
    const before=Math.hypot(f.vx,f.vy);assert.equal(boostFlight(f),true);
    assert.ok(Math.hypot(f.vx,f.vy)>before);assert.ok(f.vy>vy);assert.ok(f.vx>=25);
  }
});
test('emergency detonation stops once, retains earnings and never grants a landing bonus', () => {
  const p=freshProgress(),f=createFlight(C.defaults,{}, {seed:42});Object.assign(f,{distance:135,pickupMaterial:12,planted:3});
  assert.equal(detonateFlight(f),true);assert.equal(f.reason,'abort');assert.equal(f.health,0);
  assert.equal(detonateFlight(f),false);const result=settleFlight(p,f);
  assert.equal(result.collected,12);assert.equal(result.planted,3);assert.equal(result.landing,0);
  assert.ok(result.xpEarned>=30);assert.equal(p.attempts,1);assert.equal(settleFlight(p,f),null);
});
test('sound and music preferences persist independently with old saves enabled by default',()=>{
  const p=freshProgress();p.preferences.sound=false;p.preferences.music=false;
  assert.deepEqual(sanitizeProgress(p).preferences,p.preferences);
  const old=sanitizeProgress({version:2});assert.equal(old.preferences.sound,true);assert.equal(old.preferences.music,true);
});


test('rear laser ends backward flights before leaving the world, preserves distance and awards once',()=>{
  for(const [x,distance,boundary] of [[811,900,810],[-5,40,-6]]){
    const f=createFlight(C.defaults,{}, {seed:42,traffic:false});Object.assign(f,{x,previousX:x,y:80,previousY:80,vx:-100,vy:0,distance});
    stepFlight(f,.05);assert.equal(f.reason,'laser');assert.equal(f.x,boundary);assert.equal(f.health,0);assert.equal(f.distance,distance);
    const p=freshProgress();const reward=settleFlight(p,f);assert.ok(reward.achievements.includes('wrongway'));assert.equal(reward.landing,0);assert.equal(settleFlight(p,f),null);
  }
  const forward=createFlight(C.defaults,{}, {seed:42,traffic:false});for(let i=0;i<40;i++)stepFlight(forward);assert.notEqual(forward.reason,'laser');
});
test('portable SHA256 matches the platform implementation for strings and image bytes',async()=>{
  const {sha256}=await import('../src/share-proof.mjs');const {createHash}=await import('node:crypto');
  for(const input of ['', 'abc','Kartöffel 🌱',new Uint8Array(4097).map((_,i)=>i%251)]){
    assert.equal(sha256(input),createHash('sha256').update(input).digest('hex'));
  }
});
test('share proof covers visible statistics, looks, talents and image edits',async()=>{
  const {cardPayload,makeProof,verifyProof,embedProof,extractProof}=await import('../src/share-proof.mjs');
  const flight=createFlight(C.defaults,{armor:2},{seed:42});Object.assign(flight,{distance:123.45,maxHeight:80.9,pickupMaterial:7,planted:3,reason:'rest'});
  const payload=cardPayload({flight,best:456.7,level:8,appearance:{hat:'crown',eyewear:'shades'}}),pixels=new Uint8Array([1,2,3,255]);
  const proof=makeProof(payload,pixels);assert.equal(verifyProof(proof,pixels).values,true);assert.equal(verifyProof(proof,pixels).pixels,true);
  for(const field of ['d','b','h','p','lv','s','looks','talents']){
    const changed={...payload,[field]:field==='looks'?{hat:'bucket'}:field==='talents'?[3]:999};
    assert.equal(verifyProof({...proof,data:JSON.stringify(changed)},pixels).values,false,field);
  }
  assert.equal(verifyProof(proof,new Uint8Array([2,2,3,255])).pixels,false);
  const tiny=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=','base64');
  const png=await embedProof(new Blob([tiny],{type:'image/png'}),proof);assert.deepEqual(extractProof(await png.arrayBuffer()),proof);
  assert.throws(()=>extractProof(new Uint8Array(8)));
});


test('destroyed UFOs recharge one boost once, respect capacity and do not revive fatal hits', () => {
  const t=trafficBetween(0,600,3,42)[0];
  for(const above of [false,true])for(const initial of [0,1,2]){
    const f=createFlight(C.defaults,{}, {seed:42});
    const place=()=>Object.assign(f,{elapsed:3,x:t.x,y:t.y+(above?t.radius+C.radius-.05:0),vx:0,vy:above?-25:0});
    place();f.boostsLeft=initial;stepFlight(f);
    assert.equal(f.ended,false);assert.equal(f.trafficHits.size,1);
    assert.equal(f.boostsLeft,Math.min(2,initial+1));assert.equal(f.lastTrafficBoostGain,initial<2?1:0);
    const boosts=f.boostsLeft;place();stepFlight(f);assert.equal(f.boostsLeft,boosts);
    if(initial===0){assert.equal(boostFlight(f),true);assert.equal(f.boostsLeft,0);}
  }
  const fatal=createFlight(C.defaults,{}, {seed:42});
  Object.assign(fatal,{elapsed:3,x:t.x,y:t.y,vx:150,vy:0,health:.01,boostsLeft:0});stepFlight(fatal);
  assert.equal(fatal.trafficHits.size,1);assert.equal(fatal.ended,true);assert.equal(fatal.boostsLeft,0);
});

test('pickup layouts vary by flight seed and section but remain stable across query windows', () => {
  const all=pickupsBetween(0,1600,'ground',42);
  assert.deepEqual(all,pickupsBetween(0,1600,'ground',42));
  assert.notDeepEqual(all,pickupsBetween(0,1600,'ground',43));
  assert.deepEqual(pickupsBetween(507,1060,'ground',42),all.filter(p=>p.x>=507&&p.x<=1060));
  assert.equal(new Set(all.map(p=>p.id)).size,all.length);
  assert.ok(all.every(p=>p.y>=4&&p.y<=372&&p.value>=3&&p.value<=12));
  assert.ok(all.some(p=>p.y<30));
  for(const height of [100,200,300])assert.ok(all.some(p=>p.y>=height&&p.y<height+72));
  const relative=cycle=>all.filter(p=>p.x>=cycle*C.trackPeriod&&p.x<(cycle+1)*C.trackPeriod).map(p=>[p.x-cycle*C.trackPeriod,p.y]);
  assert.notDeepEqual(relative(0),relative(1));
});


test('statistics migration keeps known totals and never invents historical events', () => {
  const state=sanitizeProgress({version:3,attempts:17,planted:24});
  assert.equal(state.statistics.shots,17);assert.equal(state.statistics.sinceAttempt,17);
  assert.equal(state.statistics.crashes,0);assert.equal(state.statistics.ufos,0);assert.equal(state.planted,24);
  const bad=sanitizeProgress({version:3,attempts:2,statistics:{shots:-9,sinceAttempt:99,distance:NaN,crashes:-1,flightSeconds:Infinity}});
  assert.equal(bad.statistics.shots,2);assert.equal(bad.statistics.sinceAttempt,2);
  assert.equal(bad.statistics.distance,0);assert.equal(bad.statistics.crashes,0);assert.equal(bad.statistics.flightSeconds,0);
});
test('launches count immediately once; detailed statistics settle and persist once', () => {
  const state=freshProgress(),f=run();
  assert.equal(recordLaunch(state,f),true);assert.equal(recordLaunch(state,f),false);
  assert.equal(state.statistics.shots,1);assert.equal(state.statistics.distance,0);
  f.trafficHits.add('test-ufo');f.collected.add('test-pickup');
  settleFlight(state,f);
  const expected=structuredClone(state.statistics);
  assert.equal(expected.ufos,f.trafficHits.size);assert.equal(expected.bounces,f.groundBounces);
  assert.equal(expected.springboards,f.mushrooms);assert.equal(expected.boosts,f.boostsUsed);
  assert.equal(expected.pickups,f.collected.size);assert.equal(expected.flightSeconds,f.elapsed);
  settleFlight(state,f);assert.deepEqual(state.statistics,expected);
  const stored=new Map(),storage={setItem:(k,v)=>stored.set(k,v),getItem:k=>stored.get(k)};
  assert.equal(saveProgress(state,storage),true);assert.deepEqual(loadProgress(storage).state.statistics,expected);
});
test('statistics separate launch failures, safe landings and emergency aborts', () => {
  const state=freshProgress();
  for(const reason of ['launch','impact','rest','abort']){
    const f=createFlight(C.defaults,{}, {seed:42});
    Object.assign(f,{ended:true,reason,health:reason==='rest'?50:0});
    recordLaunch(state,f);settleFlight(state,f);
  }
  assert.equal(state.statistics.shots,4);assert.equal(state.statistics.crashes,2);
  assert.equal(state.statistics.landings,1);assert.equal(state.statistics.aborts,1);
});


test('pilot names normalize, survive storage and migrate independently of old scores', () => {
  assert.equal(normalizePlayerName('  Lotte   Kartoffel  '), 'Lotte Kartoffel');
  assert.equal(normalizePlayerName('\u202eLotte\u0000'), 'Lotte');
  assert.equal(normalizePlayerName('   '), DEFAULT_PLAYER_NAME);
  assert.equal(normalizePlayerName({}), DEFAULT_PLAYER_NAME);
  assert.equal(Array.from(normalizePlayerName('🥔'.repeat(30))).length, 24);
  const state = freshProgress();
  state.playerName = 'Lotte <3';
  state.scores = [{ distance: 123, level: 'ground' }];
  const storage = { value: '', setItem(k,v){this.value=v}, getItem(){return this.value} };
  assert.equal(saveProgress(state, storage), true);
  const loaded = loadProgress(storage).state;
  assert.equal(loaded.playerName, 'Lotte <3');
  assert.equal(loaded.scores[0].playerName, DEFAULT_PLAYER_NAME);
});

test('leaderboard names are captured at launch and remain after later name changes', () => {
  const state = freshProgress();
  state.playerName = 'Lotte';
  const first = run();
  recordLaunch(state, first);
  state.playerName = 'Mila';
  assert.equal(recordLaunch(state, first), false);
  settleFlight(state, first);
  const second = run();
  recordLaunch(state, second);
  settleFlight(state, second);
  assert.deepEqual(state.scores.map(s=>s.playerName), ['Lotte', 'Mila']);
  state.playerName = 'Neue Knolle';
  assert.deepEqual(sanitizeProgress(state).scores.map(s=>s.playerName), ['Lotte', 'Mila']);
});

// Recorded controls use physics ticks, never wall-clock or animation frames.
import { captureReplay, startReplay, advanceReplay, replayLink, decodeReplayLink, flightResult, REPLAY_ENGINE } from '../src/replay.mjs';
import { importTalentBuild } from '../src/progress.mjs';
test('replay links reproduce seeded flights and exact control ticks across frame rates', () => {
  for(const seed of [4,42,9001]){
    const flight=createFlight({angle:58,energy:120},{armor:2,pads:2},{seed,windSeed:71,windTime:12.34,traffic:true});
    flight.appearance={hat:'bucket',light:'night'};flight.theme='classic';flight.playerName='Mila 🥔';
    while(!flight.ended&&flight.ticks<100000){if([30,260,1000].includes(flight.ticks))boostFlight(flight);stepFlight(flight);}
    assert.ok(flight.ended);
    const data=captureReplay(flight);assert.ok(data);
    const url=replayLink(data,'https://potatoe.les.bar/');
    assert.ok(url.length<4000);
    assert.deepEqual(decodeReplayLink(new URL(url).hash),data);
    for(const fps of [30,60,144]){
      const replay=startReplay(data),clock=new FixedClock();
      for(let i=0;i<fps*500&&!replay.done;i++)clock.advance(1/fps,()=>advanceReplay(replay));
      assert.equal(replay.matches,true);
      assert.deepEqual(flightResult(replay.flight),flightResult(flight));
      assert.deepEqual(replay.flight.actions,flight.actions);
      assert.deepEqual(replay.flight.appearance,flight.appearance);
    }
  }
});
test('replays include aborts at tick zero and at the final recorded tick, plus launch failures', () => {
  for(const tick of [0,180]){
    const flight=createFlight({angle:70,energy:80},{},{seed:42});
    for(let i=0;i<tick;i++)stepFlight(flight);
    detonateFlight(flight);
    const replay=startReplay(captureReplay(flight));while(!replay.done)advanceReplay(replay);
    assert.equal(replay.matches,true);assert.equal(replay.flight.reason,'abort');
  }
  let failed;for(let seed=1;seed<1000;seed++){const f=createFlight({angle:45,energy:220},{},{seed});if(f.ended){failed=f;break;}}
  assert.ok(failed);const replay=startReplay(captureReplay(failed));advanceReplay(replay);assert.equal(replay.matches,true);
});
test('replay validation rejects unsupported engines, malformed input and detects changed outcomes', () => {
  const flight=run(),data=captureReplay(flight);
  assert.throws(()=>startReplay({...data,engine:'future'}),/Spielversion/);
  assert.throws(()=>decodeReplayLink('#flug=broken'),/ungültig/);
  assert.throws(()=>decodeReplayLink('#flug='+'a'.repeat(32001)),/ungültig/);
  assert.throws(()=>startReplay({...data,actions:[[data.ticks+1,'boost']]}),/Eingabe/);
  assert.throws(()=>startReplay({...data,actions:[[0,'unknown']]}),/Eingabe/);
  const changed=structuredClone(data);changed.result[5]++;
  const replay=startReplay(changed);while(!replay.done)advanceReplay(replay);
  assert.equal(replay.matches,false);
  const state=freshProgress();state.scores=[{distance:flight.distance,level:'ground',replay:data}];
  assert.deepEqual(sanitizeProgress(state).scores[0].replay,data);
  state.scores[0].replay.engine='older';assert.equal(sanitizeProgress(state).scores[0].replay,null);
  assert.equal(REPLAY_ENGINE.startsWith('ground-1-'),true);
});
test('talent import is explicit, atomic and respects current level and prerequisites', () => {
  const state=freshProgress(),before=JSON.stringify(state);
  assert.equal(importTalentBuild(state,{armor:2}).ok,false);assert.equal(JSON.stringify(state),before);
  assert.equal(importTalentBuild(state,{armor:1},false).ok,true);assert.equal(JSON.stringify(state),before);
  state.xp=10000;
  assert.equal(importTalentBuild(state,{sail:1}).ok,false);
  assert.equal(importTalentBuild(state,{armor:2,pads:2}).ok,true);
  assert.equal(state.equipped.armor,2);assert.equal(state.equipped.pads,2);
  const saved=JSON.stringify(state);
  assert.equal(importTalentBuild(state,{armor:4}).ok,false);assert.equal(JSON.stringify(state),saved);
  assert.equal(importTalentBuild(state,{wings:2,sail:1}).ok,true);assert.equal(state.equipped.armor,0);
});
