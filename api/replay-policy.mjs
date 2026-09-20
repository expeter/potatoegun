import { CONFIG, UPGRADE_KEYS, LEVELS } from '../shared/config.mjs';
import { windAt } from '../shared/world.mjs';
// Replay consistency alone is insufficient: clients must obey the game's input rules.
export function validateGameRules(replay) {
  const wind = windAt(replay.windTime, replay.windSeed) * LEVELS.ground.windScale;
  if (Math.abs(replay.wind - wind) > 1e-10) throw Error('Wind stimmt nicht mit den Startwerten überein.');
  const ranks = Object.fromEntries(UPGRADE_KEYS.map((key, i) => [key, replay.talents[i]]));
  for (const key of UPGRADE_KEYS) {
    const upgrade = CONFIG.upgrades[key];
    const parents = upgrade.parents || (upgrade.parent ? [upgrade.parent] : []);
    if (ranks[key] && parents.length && !parents.some(parent => ranks[parent] >= CONFIG.parentRankRequired)) {
      throw Error('Talentvoraussetzungen sind nicht erfüllt.');
    }
  }
}
