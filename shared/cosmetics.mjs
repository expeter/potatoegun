export const SCENES = [{ id:'classic', name:'Acker', description:'Bäume, Wiesen und die alte Windmühle. Kostenlos.' }, { id:'junk', name:'Goblin-Garage', description:'Der liebevoll zusammengeschraubte Schrottplatz. Kostenlos.' }];
// Appearance never enters equipmentStats or the flight simulation.
export const COSMETICS = {
  bunting: { name: 'Party im Schlepptau', slot: 'trail', cost: 12, icon: '⚑', description: 'Eine flatternde Wimpelkette. TÜV sagt nein.' },
  night: { name: 'Lichtschalter', slot: 'light', cost: 18, icon: '☾', description: 'Licht aus, Sterne an. Hindernisse bleiben gut sichtbar.' },
  shades: { name: 'Coolknolle', slot: 'eyewear', cost: 20, icon: '🕶', description: 'Sonnenbrille für absolut unverdiente Coolness.' },
  bucket: { name: 'Eimer mit Aussicht', slot: 'hat', cost: 25, icon: '♜', description: 'Ein Schrotteimer als Hut. Kein zusätzlicher Schutz.' },
  umbrella: { name: 'Schietwetter-Schirm', slot: 'umbrella', cost: 30, icon: '☂', description: 'Sieht nach Auftrieb aus. Hat exakt keinen.' },
  crown: { name: 'König der Knollen', slot: 'hat', cost: 40, icon: '♛', description: 'Eine Krone für die Hoheit des Kartoffelfelds.' },
  candy: { name: 'Zuckerschrottland', slot: 'scene', cost: 45, icon: '🍭', description: 'Bonbonhimmel mit kleinen Zuckerblumen. Dieselbe Strecke.' },
};
export const freshCosmetics = () => ({ owned: [], equipped: {} });
export function sanitizeCosmetics(raw, planted) {
  const result = freshCosmetics(); let budget = planted;
  for (const id of Array.isArray(raw?.owned) ? raw.owned : []) {
    if (!Object.hasOwn(COSMETICS, id) || result.owned.includes(id) || COSMETICS[id].cost > budget) continue;
    result.owned.push(id); budget -= COSMETICS[id].cost;
  }
  for (const id of result.owned) if (raw?.equipped?.[COSMETICS[id].slot] === id) result.equipped[COSMETICS[id].slot] = id;
  return result;
}
export const cosmeticBalance = state => Math.max(0, state.planted - state.cosmetics.owned.reduce((sum, id) => sum + COSMETICS[id].cost, 0));
export function buyCosmetic(state, id) {
  if (!Object.hasOwn(COSMETICS, id) || state.cosmetics.owned.includes(id) || cosmeticBalance(state) < COSMETICS[id].cost) return false;
  state.cosmetics.owned.push(id); state.cosmetics.equipped[COSMETICS[id].slot] = id; return true;
}
export function toggleCosmetic(state, id) {
  if (!Object.hasOwn(COSMETICS, id) || !state.cosmetics.owned.includes(id)) return false;
  const slot = COSMETICS[id].slot;
  if (state.cosmetics.equipped[slot] === id) delete state.cosmetics.equipped[slot];
  else state.cosmetics.equipped[slot] = id;
  return true;
}

// Inline vectors stay readable even on devices without an emoji font.
export function cosmeticIcon(id) {
  const shapes = {
    classic: '<path d="M16 29V15M7 19C0 14 7 5 12 7c3-10 15-3 13 3 10 5 1 16-9 10ZM12 29h8"/>',
    junk: '<path d="M3 28V13l10-5v7l9-6v7h7v12ZM7 22h4m5 0h4m5 0h2M20 10V3h5v10"/>',
    plant: '<path d="M16 29V13M16 20C3 20 3 8 3 8s13-1 13 12ZM16 15C29 15 29 3 29 3s-13 0-13 12Z"/>',
    bunting: '<path d="M2 8q14 9 28 0M3 9l3 11 7-7M14 14l5 12 6-14"/>',
    night: '<rect x="8" y="2" width="16" height="28" rx="3"/><path d="M12 9h8v14h-8zM12 15h8"/>',
    shades: '<path d="M1 10h30M3 11l2 11h8l2-11M17 11l2 11h8l2-11M7 14l3 3M22 14l3 3"/>',
    bucket: '<path d="M5 26 8 6h16l3 20ZM2 26h28M10 9h12"/>',
    umbrella: '<path d="M2 16a14 14 0 0 1 28 0q-5-4-9 0-5-4-10 0-5-4-9 0ZM16 2v24q0 6-6 2"/>',
    crown: '<path d="M5 26 2 8l9 7 5-12 5 12 9-7-3 18ZM5 22h22"/>',
    candy: '<circle cx="16" cy="12" r="10"/><path d="M16 22v9M20 16c-8 4-12-7-5-9 6-2 9 6 3 6-3 0-3-3-1-3"/>',
  };
  return `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[id] || shapes.plant}</svg>`;
}
