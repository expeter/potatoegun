import { captureReplay, storedReplay } from './replay.mjs';
import { talentParents } from './talent-network.mjs';
import { freshCosmetics, sanitizeCosmetics } from './cosmetics.mjs';
import { CONFIG, UPGRADE_KEYS, ACHIEVEMENTS, LEGACY_ACHIEVEMENTS, LEVELS, levelConfig, clamp } from './config.mjs';
export const STORAGE_KEY = 'kartoffelkanone.v2';
export const DEFAULT_PLAYER_NAME = 'Knollenpilot';
export function normalizePlayerName(value) {
  const clean = typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/gu, '').replace(/\s+/gu, ' ').trim() : '';
  return Array.from(clean).slice(0, 24).join('') || DEFAULT_PLAYER_NAME;
}
export const LEGACY_KEY = 'kartoffelkanone.v1';
export const freshStatistics = (attempts=0) => ({ shots:attempts, sinceAttempt:attempts, crashes:0, landings:0, ufos:0, bounces:0, springboards:0, boosts:0, pickups:0, flightSeconds:0, distance:0, aborts:0 });
export function recordLaunch(state,flight){if(flight.launchRecorded)return false;flight.launchRecorded=true;flight.playerName=normalizePlayerName(state.playerName);state.statistics.shots++;return true;}
const freshLevels = () => Object.fromEntries(UPGRADE_KEYS.map(k => [k, 0]));
const freshJourney = () => ({ selected: 'ground', records: Object.fromEntries(Object.keys(LEVELS).map(k => [k, { distance: 0, height: 0 }])), escaped: false });
export const freshProgress = () => ({ version: 3, playerName: DEFAULT_PLAYER_NAME, statistics: freshStatistics(), cosmetics: freshCosmetics(), xp: 0, material: 0, planted: 0, purchased: freshLevels(), equipped: freshLevels(), settings: { ...CONFIG.defaults }, scores: [], attempts: 0, achievements: [], preferences: { theme: 'junk', traffic: true, sound: true, music: true }, journey: freshJourney() });
const finite = (v, fallback, min, max) => Number.isFinite(v) ? clamp(v, min, max) : fallback;
const integer = (v, fallback, min, max) => Math.floor(finite(v, fallback, min, max));
export function sanitizeProgress(raw) {
  const state = freshProgress();
  if (!raw || ![1, 2, 3].includes(raw.version)) return state;
  state.playerName = normalizePlayerName(raw.playerName);
  state.material = integer(raw.material, 0, 0, 1e9);
  state.planted = integer(raw.planted, 0, 0, 1e9);
  state.cosmetics = sanitizeCosmetics(raw.cosmetics, state.planted);
  state.attempts = integer(raw.attempts, 0, 0, 1e9);
  state.statistics=freshStatistics(state.attempts);
  if(raw.statistics&&typeof raw.statistics==='object')for(const key of Object.keys(state.statistics)){
    state.statistics[key]=key==='distance'||key==='flightSeconds'?finite(raw.statistics[key],state.statistics[key],0,1e12):integer(raw.statistics[key],state.statistics[key],0,1e9);
  }
  state.statistics.shots=Math.max(state.attempts,state.statistics.shots);
  state.statistics.sinceAttempt=Math.min(state.attempts,state.statistics.sinceAttempt);
  for (const k of UPGRADE_KEYS) state.purchased[k] = integer(raw.purchased?.[k], 0, 0, CONFIG.upgrades[k].ranks);
  // Keep historical purchases as a migration snapshot; equipped is now the allocation.
  for (const k of UPGRADE_KEYS) {
    const parent = CONFIG.upgrades[k].parent;
    if (parent && !state.purchased[parent]) state.purchased[k] = 0;
  }
  const purchasedPoints = Object.values(state.purchased).reduce((sum, rank) => sum + rank, 0);
  state.xp = raw.version === 3 ? integer(raw.xp, 0, 0, 1e9)
    : Math.max(state.attempts * CONFIG.runXp, (Math.min(CONFIG.talentCap, purchasedPoints) - 1) * CONFIG.xpPerLevel, 0);
  let budget = talentLevel(state);
  // Roots first, then descendants: migration and corrupted saves never exceed the configured point cap.
  for (const tier of [0, 1, 2]) for (const k of UPGRADE_KEYS) {
    const def = CONFIG.upgrades[k], depth = def.parent ? CONFIG.upgrades[def.parent].parent ? 2 : 1 : 0;
    if (depth !== tier) continue;
    const desired = integer(raw.equipped?.[k], 0, 0, raw.version === 3 ? def.ranks : state.purchased[k]);
    const rank = canUnlock(state, k) ? Math.min(budget, desired) : 0;
    state.equipped[k] = rank; budget -= rank;
  }
  for (const k of ['angle', 'energy']) state.settings[k] = finite(raw.settings?.[k], CONFIG.defaults[k], ...CONFIG.limits[k]);
  state.achievements = [...new Set(Array.isArray(raw.achievements) ? raw.achievements.filter(id => (ACHIEVEMENTS.some(a => a.id === id) || LEGACY_ACHIEVEMENTS.includes(id))) : [])];
  state.preferences.theme = raw.preferences?.theme === 'classic' ? 'classic' : 'junk';
  state.preferences.traffic = raw.preferences?.traffic !== false;
  state.preferences.sound = raw.preferences?.sound !== false;
  state.preferences.music = raw.preferences?.music !== false;
  state.scores = (Array.isArray(raw.scores) ? raw.scores : []).filter(s => s && Number.isFinite(s.distance) && s.distance > 0 && s.distance < 1e7)
    .map(s => ({ replay: storedReplay(s.replay), playerName: normalizePlayerName(s.playerName), distance: Math.floor(s.distance * 10) / 10, equipment: Object.fromEntries(UPGRADE_KEYS.map(k => [k, integer(s.equipment?.[k], 0, 0, 3)])), angle: finite(s.angle, 38, ...CONFIG.limits.angle), energy: finite(s.energy, 70, ...CONFIG.limits.energy), seed: integer(s.seed, 0, 0, 4294967295), collected: integer(s.collected, 0, 0, 1e6), legacy: raw.version === 1 || s.legacy === true, level: levelConfig(s.level).id, height: finite(s.height, 0, 0, 1e7) }));
  state.scores = topScores(state.scores);
  for (const k of Object.keys(LEVELS)) {
    state.journey.records[k] = {
      distance: Math.max(finite(raw.journey?.records?.[k]?.distance, 0, 0, 1e7), ...state.scores.filter(s => s.level === k).map(s => s.distance)),
      height: Math.max(finite(raw.journey?.records?.[k]?.height, 0, 0, 1e7), ...state.scores.filter(s => s.level === k).map(s => s.height)),
    };
  }
  state.journey.escaped = raw.journey?.escaped === true;
  state.journey.selected = unlockedLevels(state).includes(raw.journey?.selected) ? raw.journey.selected : 'ground';
  return state;
}
export function loadProgress(storage) {
  try {
    const saved = storage.getItem(STORAGE_KEY) ?? storage.getItem(LEGACY_KEY);
    if (!saved) return { state: freshProgress(), available: true };
    try { return { state: sanitizeProgress(JSON.parse(saved)), available: true }; }
    catch { return { state: freshProgress(), available: true }; }
  } catch { return { state: freshProgress(), available: false }; }
}
export function saveProgress(state, storage) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}
export const talentLevel = state => Math.min(CONFIG.talentCap, 1 + Math.floor(state.xp / CONFIG.xpPerLevel));
export const spentPoints = state => UPGRADE_KEYS.reduce((sum, key) => sum + state.equipped[key], 0);
export const availablePoints = state => Math.max(0, talentLevel(state) - spentPoints(state));
export function canUnlock(state, key) {
  if (!UPGRADE_KEYS.includes(key)) return false;
  const parents = talentParents(key);
  return !parents.length || parents.some(parent => state.equipped[parent] >= CONFIG.parentRankRequired);
}
export function spendTalent(state, key) {
  if (!canUnlock(state, key) || !availablePoints(state) || state.equipped[key] >= CONFIG.upgrades[key].ranks) return false;
  state.equipped[key]++;
  if (spentPoints(state) === CONFIG.talentCap) unlockAchievements(state, ['tinkerer']);
  return true;
}
export function refundTalent(state, key) {
  if (!UPGRADE_KEYS.includes(key) || !state.equipped[key]) return false;
  state.equipped[key]--;
  // Refund dependent descendants too; no stranded or prerequisite-free talents.
  let changed;
  do {
    changed = false;
    for (const k of UPGRADE_KEYS) if (state.equipped[k] && !canUnlock(state, k)) { state.equipped[k] = 0; changed = true; }
  } while (changed);
  return true;
}
export function setTalentRank(state, key, target) {
  if (!UPGRADE_KEYS.includes(key) || !Number.isInteger(target) || target < 0 || target > CONFIG.upgrades[key].ranks) return false;
  const current = state.equipped[key];
  if (target === current) return false;
  if (target > current && (!canUnlock(state, key) || target - current > availablePoints(state))) return false;
  while (state.equipped[key] < target) spendTalent(state, key);
  while (state.equipped[key] > target) refundTalent(state, key);
  return true;
}
export function resetTalents(state) { for (const key of UPGRADE_KEYS) state.equipped[key] = 0; }
export function unlockAchievements(state, ids) {
  const unlocked = [];
  for (const id of ids) if (ACHIEVEMENTS.some(a => a.id === id) && !state.achievements.includes(id)) { state.achievements.push(id); unlocked.push(id); }
  return unlocked;
}
function topScores(scores) {
  return Object.keys(LEVELS).flatMap(k => scores.filter(s => s.level === k).sort((a, b) => b.distance - a.distance).slice(0, 5));
}
// Upper worlds are paused; keep their saved records intact.
export function unlockedLevels() { return ['ground']; }
export function selectLevel(state, id) {
  if (!unlockedLevels(state).includes(id)) return false;
  state.journey.selected = id; return true;
}
export function settleFlight(state, flight) {
  if (!flight.ended || flight.settled) return null;
  flight.settled = true;
  const distance = Math.floor(flight.distance * 10) / 10;
  const salvage = Math.ceil(distance / CONFIG.materialMeters * (1 + flight.equipment.recycler * .2));
  const landing = flight.reason === 'rest' && distance > 0 ? CONFIG.landingBonus * (1 + flight.equipment.recycler) : 0;
  const collected = flight.pickupMaterial;
  const earned = salvage + landing + collected;
  const level = levelConfig(flight.level);
  const newBest = distance > (state.scores.find(s => s.level === level.id)?.distance || 0);
  const before = unlockedLevels(state);
  const record = state.journey.records[level.id];
  record.distance = Math.max(record.distance, distance);
  record.height = Math.max(record.height, Math.floor(flight.maxHeight * 10) / 10);
  if (flight.reason === 'escape') state.journey.escaped = true;
  const unlocked = unlockedLevels(state).filter(k => !before.includes(k));
  const previousLevel = talentLevel(state);
  const travelXp = Math.min(20, Math.floor(distance / 15)) + (landing > 0 ? 10 : 0);
  const xpEarned = Math.ceil((CONFIG.runXp + Math.min(25, collected) + Math.ceil(travelXp * (1 + flight.equipment.recycler * .2))) * CONFIG.xpRewardScale);
  state.xp = Math.min(1e9, state.xp + xpEarned);
  const levelsGained = talentLevel(state) - previousLevel;
  state.material += earned; state.attempts++;
  const stats=state.statistics;
  stats.shots=Math.max(stats.shots,state.attempts);
  stats.crashes+=flight.health<=0&&flight.reason!=='abort'?1:0;
  stats.landings+=flight.reason==='rest'?1:0;stats.aborts+=flight.reason==='abort'?1:0;
  stats.ufos+=flight.trafficHits.size;stats.bounces+=flight.groundBounces;stats.springboards+=flight.mushrooms;
  stats.boosts+=flight.boostsUsed;stats.pickups+=flight.collected.size;stats.flightSeconds+=flight.elapsed;stats.distance+=distance;
  const planted = flight.planted || 0; state.planted += planted;
  const milestones = new Set(flight.milestones); milestones.add('first');
  for (const [id, target] of [['seedling', 10], ['gardener', 50], ['farmer', 200]]) if (state.planted >= target) milestones.add(id);
  if (unlocked.includes('sky')) milestones.add('aviator');
  if (unlocked.includes('space')) milestones.add('orbital');
  if (flight.reason === 'rest' && distance >= 200 && flight.health >= flight.maxHealth / 2) milestones.add('landing');
  const achievements = unlockAchievements(state, milestones);
  if (distance > 0) {
    state.scores.push({ replay: captureReplay(flight), playerName: normalizePlayerName(flight.playerName), distance, equipment: { ...flight.equipment }, angle: flight.settings.angle, energy: flight.settings.energy, seed: flight.seed, collected, legacy: false, level: level.id, height: Math.floor(flight.maxHeight * 10) / 10 });
    state.scores = topScores(state.scores);
  }
  return { xpEarned, levelsGained, distance, earned, salvage, landing, collected, planted, newBest, achievements, unlocked };
}

export function importTalentBuild(state, equipment, apply = true) {
  const build = Object.fromEntries(UPGRADE_KEYS.map(k=>[k,equipment?.[k] ?? 0]));
  if(Object.values(build).some(v=>!Number.isInteger(v)||v<0||v>3))return {ok:false,reason:'Ungültige Talentstufen.'};
  const candidate={...state,equipped:build},points=spentPoints(candidate);
  if(points>talentLevel(state))return {ok:false,reason:`Du brauchst Level ${points} für diese Verteilung.`};
  if(UPGRADE_KEYS.some(k=>build[k]&&!canUnlock(candidate,k)))return {ok:false,reason:'Diese Verteilung erfüllt die Voraussetzungen nicht.'};
  if(apply){state.equipped=build;if(points===CONFIG.talentCap)unlockAchievements(state,['tinkerer']);}
  return {ok:true,points};
}
