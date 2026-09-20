import { CONFIG, UPGRADE_KEYS } from './config.mjs';
import { createFlight, stepFlight, launchStress, FixedClock } from './physics.mjs';
import { freshProgress, loadProgress, saveProgress, purchaseUpgrade, equipUpgrade, settleFlight } from './progress.mjs';
import { Renderer } from './renderer.mjs';

const $ = id => document.getElementById(id);
const number = value => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(value);
let storage;
try { storage = window.localStorage; } catch { /* Privacy mode can deny access itself. */ }
const loaded = storage ? loadProgress(storage) : { state: freshProgress(), available: false };
const progress = loaded.state;
let phase = 'ready', flight = null, lastTime = null, visualTime = 0, lastEvent = 0, messageUntil = 0, toastTimer;
const renderer = new Renderer($('game'));
const clock = new FixedClock();
const icons = {
  armor: '<path d="M16 3 27 7v9c0 6-7 11-11 13C12 27 5 22 5 16V7Z"/><path d="m10 16 4 4 8-9M16 6v4"/>',
  wings: '<path d="m16 24-2-13L3 6l1 10 10 7m2 1 2-13 11-5-1 10-10 7M8 10l5 3m-6 1 6 3m11-7-5 3m6 1-6 3M14 24h4"/>',
  pads: '<path d="M6 4h20v6H6zM6 23h20v5H6zM10 10l12 4-12 4 12 5"/><path d="M9 7h14M9 26h14"/>',
};

function persist() { $('storage-warning').hidden = saveProgress(progress, storage); }
function toast(message) {
  clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2600);
}
function updateSettings() {
  for (const key of ['angle', 'energy']) {
    $(key).value = progress.settings[key];
    const [min, max] = CONFIG.limits[key];
    $(key).style.setProperty('--fill', `${(progress.settings[key] - min) / (max - min) * 100}%`);
    $(`${key}-output`).textContent = `${progress.settings[key]}${key === 'angle' ? '°' : '%'}`;
    $(key).disabled = phase !== 'ready';
  }
  const stress = launchStress(progress.settings.energy, progress.equipped);
  const [min, max] = CONFIG.limits.energy;
  const safe = (stress.safe - min) / (max - min) * 100, lethal = (stress.lethal - min) / (max - min) * 100;
  $('stress-track').style.background = `linear-gradient(to right,#98b17c 0 ${safe}%,#edbe66 ${safe}% ${lethal}%,#d9866d ${lethal}% 100%)`;
  $('stress-marker').style.left = `${(progress.settings.energy - min) / (max - min) * 100}%`;
  const labels = document.querySelectorAll('.stress-labels span');
  labels[0].textContent = `Sicher ≤${stress.safe}%`;
  labels[1].textContent = `Riskant >${stress.safe}%`;
  labels[2].textContent = `Tödlich ≥${stress.lethal}%`;
  const text = { safe: '● ALLES IM GRÜNEN', risky: '◆ DIE SCHALE KNACKT', lethal: '✕ GARANTIERTES PÜREE' };
  $('stress-title').textContent = text[stress.zone];
  $('stress-title').style.color = { safe: '#5c7850', risky: '#b37b2c', lethal: '#b75639' }[stress.zone];
  $('stress-damage').textContent = stress.zone === 'safe' ? 'Kein Startschaden' : stress.zone === 'lethal' ? 'Zerplatzt beim Start' : `−${Math.ceil(stress.damage)} von ${stress.health} Schale`;
  $('launch-button').disabled = phase !== 'ready';
  $('launch-button').innerHTML = phase === 'flying' ? 'Kartoffel unterwegs …' : 'Kartoffel los! <span>↗</span>';
}

function updateUpgrades() {
  $('material').textContent = number(progress.material);
  $('upgrades').innerHTML = UPGRADE_KEYS.map(key => {
    const def = CONFIG.upgrades[key], owned = progress.purchased[key], equipped = progress.equipped[key], cost = def.costs[owned];
    const locked = phase === 'flying';
    return `<article class="upgrade-card"><div class="upgrade-top"><div class="upgrade-art" aria-hidden="true"><svg viewBox="0 0 32 32">${icons[key]}</svg></div><div class="upgrade-title"><h3>${def.name}</h3><div class="level-dots" aria-label="${owned} von 3 Stufen gekauft, Stufe ${equipped} ausgerüstet">${[1, 2, 3].map(i => `<i class="${i <= equipped ? 'equipped' : i <= owned ? 'bought' : ''}"></i>`).join('')}</div></div></div><p>${def.benefit}<span>${def.drawback}</span></p><div class="upgrade-actions"><button class="buy-button" data-buy="${key}" ${locked || cost === undefined || progress.material < cost ? 'disabled' : ''} aria-label="${def.name}: ${cost === undefined ? 'voll ausgebaut' : `Stufe ${owned + 1} für ${cost} Material kaufen`}">${cost === undefined ? 'Voll ausgebaut ✓' : `Ausbauen · ⚙ ${cost}`}</button><select data-equip="${key}" aria-label="${def.name}: ausgerüstete Stufe" ${locked ? 'disabled' : ''}>${Array.from({ length: owned + 1 }, (_, level) => `<option value="${level}" ${level === equipped ? 'selected' : ''}>${level === 0 ? 'Ohne' : `Stufe ${level}`}</option>`).join('')}</select></div></article>`;
  }).join('');
}

function updateRecords() {
  const best = progress.scores[0]?.distance || 0;
  $('personal-best').innerHTML = `${number(best)} <small>m</small>`;
  $('empty-scores').hidden = progress.scores.length > 0;
  $('highscores').innerHTML = progress.scores.map((s, i) => `<li><b>${String(i + 1).padStart(2, '0')}</b><span class="score-config" title="Panzerung ${s.equipment.armor}, Flügel ${s.equipment.wings}, Polster ${s.equipment.pads}">P${s.equipment.armor} · F${s.equipment.wings} · S${s.equipment.pads} &nbsp; / &nbsp; ${s.angle}° · ${s.energy}%</span><span class="score-distance">${number(s.distance)} m</span></li>`).join('');
}

function updateHud() {
  $('distance').innerHTML = `${number(Math.floor((flight?.distance || 0) * 10) / 10)} <small>m</small>`;
  const health = flight ? Math.max(0, flight.health / flight.maxHealth * 100) : 100;
  $('health-value').textContent = `${Math.ceil(health)}%`;
  $('health-bar').style.width = `${health}%`;
  $('health-bar').style.background = health > 55 ? '#6c875d' : health > 25 ? '#ccaa56' : '#c27553';
}

function ready({ focus = true } = {}) {
  phase = 'ready'; flight = null; renderer.reset(); clock.reset();
  $('result').hidden = true; $('field-caption').hidden = false;
  $('phase-badge').textContent = 'STARTKLAR'; document.body.classList.remove('is-flying');
  $('flight-message').textContent = ''; $('attempt-number').textContent = String(progress.attempts + 1).padStart(3, '0');
  updateSettings(); updateUpgrades(); updateHud();
  if (focus) $('launch-button').focus({ preventScroll: true });
}

function launch() {
  if (phase !== 'ready') return;
  flight = createFlight(progress.settings, progress.equipped);
  phase = 'flying'; clock.reset(); renderer.reset(); lastEvent = 0;
  $('result').hidden = true; $('field-caption').hidden = true;
  $('phase-badge').textContent = 'IM ANFLUG'; document.body.classList.add('is-flying');
  $('attempt-number').textContent = String(progress.attempts + 1).padStart(3, '0');
  updateSettings(); updateUpgrades(); updateHud();
  const field = $('canvas-wrap').getBoundingClientRect();
  if (field.top < 0 || field.bottom > innerHeight) $('canvas-wrap').scrollIntoView({ block: 'center', behavior: renderer.reducedMotion ? 'instant' : 'smooth' });
  if (flight.ended) finish();
}

function finish() {
  const result = settleFlight(progress, flight);
  if (!result) return;
  phase = 'result'; persist(); updateRecords(); updateUpgrades(); updateSettings(); updateHud();
  document.body.classList.remove('is-flying'); $('phase-badge').textContent = result.newBest ? 'NEUER REKORD' : 'IM ZIEL';
  $('result-kicker').textContent = result.newBest ? 'DAS FELD HAT EINEN NEUEN HELDEN.' : flight.reason === 'launch' ? 'VIEL MUT. WENIG KARTOFFEL.' : flight.reason === 'impact' ? 'DIE SCHALE GIBT NACH. DU NICHT.' : 'SAUBER GELANDET. MEHR ODER WENIGER.';
  $('result-title').textContent = result.newBest ? 'Knolle Leistung!' : flight.health <= 0 ? 'Püree mit Aussicht.' : 'Knolle am Ziel.';
  $('result-distance').innerHTML = `${number(result.distance)} <small>m</small>`;
  $('result-detail').textContent = flight.reason === 'launch' ? 'Zu viel Energie für diese Schale. Probier etwas weniger.' : flight.reason === 'impact' ? 'Die letzte Landung war eine zu viel. Weiter geht’s!' : `${number(flight.elapsed)} Sekunden Feldforschung. Da geht noch was.`;
  $('result-material').textContent = `⚙ +${result.earned} Material`;
  $('result-best').textContent = result.newBest ? '⚑ Neuer Feldrekord!' : `Bestwert: ${number(progress.scores[0]?.distance || 0)} m`;
  $('result').hidden = false; $('flight-message').textContent = '';
  $('retry-button').focus({ preventScroll: true });
}

$('launch-button').addEventListener('click', launch);
$('retry-button').addEventListener('click', () => { ready({ focus: false }); launch(); });
$('tune-button').addEventListener('click', () => {
  ready({ focus: false });
  document.querySelector('[data-equip]').focus({ preventScroll: true });
  $('workshop-title').scrollIntoView({ block: 'nearest', behavior: renderer.reducedMotion ? 'instant' : 'smooth' });
});
for (const key of ['angle', 'energy']) $(key).addEventListener('input', () => {
  if (phase !== 'ready') return;
  progress.settings[key] = Number($(key).value); updateSettings(); persist();
});
$('upgrades').addEventListener('click', e => {
  const button = e.target.closest('[data-buy]');
  if (!button || phase === 'flying') return;
  const key = button.dataset.buy;
  if (purchaseUpgrade(progress, key)) {
    if (phase === 'result') ready({ focus: false });
    updateUpgrades(); updateSettings(); persist();
    toast(`${CONFIG.upgrades[key].name} · Stufe ${progress.purchased[key]} ist dran!`);
    document.querySelector(`[data-equip="${key}"]`).focus({ preventScroll: true });
  }
});
$('upgrades').addEventListener('change', e => {
  const key = e.target.dataset.equip;
  if (phase === 'flying' || !key) return;
  if (equipUpgrade(progress, key, Number(e.target.value))) {
    if (phase === 'result') ready({ focus: false });
    updateUpgrades(); updateSettings(); persist();
    document.querySelector(`[data-equip="${key}"]`).focus({ preventScroll: true });
  }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.repeat || $('help-dialog').open) return;
  if (phase === 'ready' && !['BUTTON', 'SELECT', 'A'].includes(e.target.tagName)) { e.preventDefault(); launch(); }
});
$('help-button').addEventListener('click', () => { $('help-dialog').showModal(); clock.reset(); lastTime = null; });
for (const id of ['close-help', 'help-ready']) $(id).addEventListener('click', () => $('help-dialog').close());
$('help-dialog').addEventListener('close', () => { clock.reset(); lastTime = null; });
document.addEventListener('visibilitychange', () => { clock.reset(); lastTime = null; });

function frame(timestamp) {
  const paused = document.hidden || $('help-dialog').open;
  const delta = paused || lastTime === null ? 0 : Math.min((timestamp - lastTime) / 1000, .1);
  lastTime = timestamp;
  visualTime += delta;
  let alpha = 1;
  if (phase === 'flying' && !paused) {
    alpha = clock.advance(delta, dt => { if (!flight.ended) stepFlight(flight, dt); });
    if (flight.eventSerial !== lastEvent) {
      lastEvent = flight.eventSerial;
      const messages = { launch: 'Ab geht die Knolle!', mushroom: 'Pilz-Power!', hay: 'Weich gelandet. Schwung verloren.', bounce: 'Hopp, Kartoffel!' };
      $('flight-message').textContent = messages[flight.event] || ''; messageUntil = visualTime + 1.5;
    }
    if (flight.ended) finish();
    updateHud();
  }
  if (visualTime > messageUntil && phase !== 'result') $('flight-message').textContent = '';
  if (!document.hidden) renderer.draw({ flight, settings: progress.settings, equipment: progress.equipped, phase, best: progress.scores[0]?.distance || 0, time: visualTime, delta, alpha });
  requestAnimationFrame(frame);
}

updateRecords(); ready({ focus: false });
$('storage-warning').hidden = loaded.available;
persist();
requestAnimationFrame(frame);
