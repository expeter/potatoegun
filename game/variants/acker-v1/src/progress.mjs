import { CONFIG, UPGRADE_KEYS, clamp } from './config.mjs';
export const STORAGE_KEY = 'kartoffelkanone.v1';
const freshLevels = () => ({ armor: 0, wings: 0, pads: 0 });
export const freshProgress = () => ({ version: 1, material: 0, purchased: freshLevels(), equipped: freshLevels(), settings: { ...CONFIG.defaults }, scores: [], attempts: 0 });
const finite = (value, fallback, min, max) => Number.isFinite(value) ? clamp(value, min, max) : fallback;
const integer = (value, fallback, min, max) => Math.floor(finite(value, fallback, min, max));
export function sanitizeProgress(raw) {
  const state = freshProgress();
  if (!raw || raw.version !== 1) return state;
  state.material = integer(raw.material, 0, 0, 1e9);
  state.attempts = integer(raw.attempts, 0, 0, 1e9);
  for (const key of UPGRADE_KEYS) {
    state.purchased[key] = integer(raw.purchased?.[key], 0, 0, 3);
    state.equipped[key] = integer(raw.equipped?.[key], 0, 0, state.purchased[key]);
  }
  for (const key of ['angle', 'energy']) state.settings[key] = integer(raw.settings?.[key], CONFIG.defaults[key], ...CONFIG.limits[key]);
  state.scores = (Array.isArray(raw.scores) ? raw.scores : [])
    .filter(s => s && Number.isFinite(s.distance) && s.distance > 0 && s.distance < 1e7)
    .map(s => ({ distance: Math.floor(s.distance * 10) / 10, equipment: Object.fromEntries(UPGRADE_KEYS.map(k => [k, integer(s.equipment?.[k], 0, 0, 3)])), angle: integer(s.angle, 38, ...CONFIG.limits.angle), energy: integer(s.energy, 70, ...CONFIG.limits.energy) }))
    .sort((a, b) => b.distance - a.distance).slice(0, 5);
  return state;
}
export function loadProgress(storage) {
  try {
    const saved = storage.getItem(STORAGE_KEY);
    if (!saved) return { state: freshProgress(), available: true };
    try { return { state: sanitizeProgress(JSON.parse(saved)), available: true }; }
    catch { return { state: freshProgress(), available: true }; }
  } catch { return { state: freshProgress(), available: false }; }
}
export function saveProgress(state, storage) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}
export function purchaseUpgrade(state, key) {
  const definition = CONFIG.upgrades[key];
  if (!definition) return false;
  const cost = definition.costs[state.purchased[key]];
  if (cost === undefined || state.material < cost) return false;
  state.material -= cost;
  state.purchased[key]++;
  state.equipped[key] = state.purchased[key];
  return true;
}
export function equipUpgrade(state, key, level) {
  if (!UPGRADE_KEYS.includes(key) || !Number.isInteger(level) || level < 0 || level > state.purchased[key]) return false;
  state.equipped[key] = level;
  return true;
}
export function settleFlight(state, flight) {
  if (!flight.ended || flight.settled) return null;
  flight.settled = true;
  const distance = Math.floor(flight.distance * 10) / 10;
  const earned = Math.ceil(distance / CONFIG.materialMeters);
  const newBest = distance > (state.scores[0]?.distance || 0);
  state.material += earned;
  state.attempts++;
  if (distance > 0) {
    state.scores.push({ distance, equipment: { ...flight.equipment }, angle: flight.settings.angle, energy: flight.settings.energy });
    state.scores.sort((a, b) => b.distance - a.distance);
    state.scores = state.scores.slice(0, 5);
  }
  return { distance, earned, newBest };
}
