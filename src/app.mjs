import { captureReplay, startReplay, advanceReplay, replayEquipment, replayLink, decodeReplayLink } from './replay.mjs';
import { gameAudio } from './audio.mjs';
import { createShareCard } from './share-card.mjs';
import { talentParents } from './talent-network.mjs';
import { COSMETICS, SCENES, cosmeticIcon, cosmeticBalance, buyCosmetic, toggleCosmetic } from './cosmetics.mjs';
import { CONFIG as C, UPGRADE_KEYS, BRANCHES, ACHIEVEMENTS, levelConfig, clamp } from './config.mjs';
import { createFlight, stepFlight, launchStress, boostFlight, detonateFlight, FixedClock } from './physics.mjs';
import { importTalentBuild, normalizePlayerName, freshProgress, loadProgress, saveProgress, setTalentRank, resetTalents, talentLevel, availablePoints, spentPoints, canUnlock, recordLaunch, settleFlight } from './progress.mjs';
import { windAt, newSeed, chargeEnergy, aimAngle } from './world.mjs';
import { icon } from './icons.mjs';
import { Renderer } from './renderer.mjs';

const $ = id => document.getElementById(id);
const format = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
const number = n => format.format(n);
let storage;
try { storage = window.localStorage; } catch { /* Private browsing can deny access itself. */ }
const loaded = storage ? loadProgress(storage) : { state: freshProgress(), available: false };
const progress = loaded.state;
gameAudio.setEnabled(progress.preferences.sound);
gameAudio.setMusicEnabled(progress.preferences.music);
const renderer = new Renderer($('game')), clock = new FixedClock();
let replaySession = null, suspendedRun = null, replaySelection = null;
let phase = 'ready', flight = null, selectedTalent = 'armor', lastTime = null, worldTime = 0, visualTime = 0;
let roundSeed = newSeed(), windSeed = newSeed(), chargeStart = 0, chargeOwner = null, aimPointer = null;
let cosmeticCategory = 'outfit';
let lastEvent = 0, messageUntil = 0, toastTimer;
const modalOpen = () => !!document.querySelector('dialog[open]');
const editable = () => !replaySession && (phase === 'ready' || phase === 'result');
const currentLevel = () => levelConfig(progress.journey.selected);
const currentTheme = () => progress.cosmetics.equipped.scene === 'candy' ? 'junk' : progress.preferences.theme;
const currentScores = () => progress.scores.filter(s => s.level === currentLevel().id);
function persist() { $('storage-warning').hidden = saveProgress(progress, storage); }
function toast(message) {
  clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3300);
}
function updateTheme() {
  document.documentElement.dataset.theme = currentTheme();
  document.documentElement.dataset.level = currentLevel().id;
  $('field-name').textContent = currentLevel().id === 'ground' ? (progress.cosmetics.equipped.scene === 'candy' ? 'ZUCKERSCHROTTLAND' : currentTheme() === 'classic' ? 'DAS KARTOFFELFELD' : 'DER SCHROTTPLATZ') : currentLevel().name.toUpperCase();
  const caption = $('field-caption');
  caption.querySelector('span').textContent = { ground: 'Zielen. Laden.', sky: 'Boarding, bitte.', space: 'Houston, wir haben …' }[currentLevel().id];
  caption.querySelector('strong').textContent = { ground: 'Ab dafür!', sky: 'Höher hinaus!', space: 'eine Kartoffel!' }[currentLevel().id];
  caption.querySelector('small').textContent = 'Schrott einsacken. Knollen pflanzen. Rekorde knacken.';
}
const escapeText = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const playerNameInput = $('player-name');
playerNameInput.value = progress.playerName;
playerNameInput.addEventListener('input', () => {
  progress.playerName = normalizePlayerName(playerNameInput.value);
  persist();
});
playerNameInput.addEventListener('blur', () => { playerNameInput.value = progress.playerName; });
function updateRecords() {
  $('personal-best').innerHTML = `${number(currentScores()[0]?.distance || 0)} <small>m</small>`;
  $('empty-scores').hidden = currentScores().length > 0;
  $('highscores').innerHTML = currentScores().map((s, i) => {
    const talents = UPGRADE_KEYS.filter(k => s.equipment[k]).map(k => `${C.upgrades[k].name} ${s.equipment[k]}`).join(', ');
    return `<li><b>${String(i + 1).padStart(2, '0')}</b><span class="score-config" title="${talents || 'Ohne Ausrüstung'}"><strong class="score-name">${escapeText(s.playerName)}</strong><span>${s.legacy ? 'Originalflug · v1' : `${s.collected} Schrott · ${talents ? UPGRADE_KEYS.filter(k => s.equipment[k]).length + ' Talente' : 'Nackte Knolle'}`}</span></span><span class="score-distance">${number(s.distance)} m</span><span class="score-actions">${s.replay ? `<button data-replay="${i}" aria-label="Flug ansehen" title="Flug ansehen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg></button>` : '<button disabled aria-label="Keine Flugaufzeichnung" title="Keine Flugaufzeichnung"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg></button>'}<button data-build="${i}" aria-label="Talente übernehmen" title="Talente übernehmen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></span></li>`;
  }).join('');
  $('material').textContent = number(progress.material);
  $('available-points').textContent = `${availablePoints(progress)} frei`;
  $('planted-total').textContent = number(progress.planted);
  $('achievement-count').textContent = `${ACHIEVEMENTS.filter(a => progress.achievements.includes(a.id)).length}/${ACHIEVEMENTS.length}`;
}
function updateTree() {
  const view=$('network-viewport'), scrollLeft=view.scrollLeft, scrollTop=view.scrollTop;
  const level = talentLevel(progress), free = availablePoints(progress), spent = spentPoints(progress);
  $('tree-points').textContent = free;
  $('player-level').textContent = `Level ${level}`;
  $('xp-label').textContent = level === C.talentCap ? `Max. Level · ${C.talentCap} Talentpunkte` : `${progress.xp % C.xpPerLevel} / ${C.xpPerLevel} XP`;
  const percent = level === C.talentCap ? 100 : progress.xp % C.xpPerLevel / C.xpPerLevel * 100;
  $('xp-fill').style.width = `${percent}%`;
  $('xp-potato').style.left = `${percent}%`;
  document.querySelector('.xp-track').setAttribute('aria-valuetext', level === C.talentCap ? `Ausgewachsen · Level ${C.talentCap}` : `${Math.round(percent)} von 100 XP bis Level ${level+1}`);
  document.querySelector('.xp-track').setAttribute('aria-valuenow', String(percent));
  $('point-slots').innerHTML = Array.from({length:C.talentCap}, (_,i) => `<i class="${i < spent ? 'spent' : i < level ? 'free' : ''}" aria-hidden="true"></i>`).join('') + `<span>${spent} / ${C.talentCap} verteilt</span>`;
  const positions=Object.fromEntries(BRANCHES.flatMap((branch,row)=>branch.keys.map((key,col)=>[key,[16.67+col*33.33,12.5+row*25]])));
  const links=UPGRADE_KEYS.flatMap(key=>talentParents(key).map(parent=>{
    const [x,y]=positions[parent],[tx,ty]=positions[key],primary=y===ty;
    if(!primary&&key!==selectedTalent)return '';
    return `<path class="${key===selectedTalent?'inspected':''}" d="M${x} ${y} C${x+12} ${y} ${tx-12} ${ty} ${tx} ${ty}"/>`;
  })).join('');
  $('talent-tree').innerHTML=`<svg class="catalog-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${links}</svg>`+BRANCHES.map(branch=>branch.keys.map(key=>{
    const rank=progress.equipped[key],unlocked=canUnlock(progress,key),def=C.upgrades[key];
    return `<button class="talent-node ${rank?'owned':unlocked?'available':'locked'} ${selectedTalent===key?'selected':''}" style="--branch:${branch.color}" data-talent="${key}" aria-label="${def.name}, ${rank} von 3 Stufen${unlocked?'':', Zugang fehlt'}. Details öffnen.">${icon(key)}<span class="catalog-name">${def.name.replace("Schalenpanzerung","Schalen<wbr>panzerung").replace("Sprungverstärker","Sprung<wbr>verstärker").replace("Schrottmagnet","Schrott<wbr>magnet").replace("Resteverwerter","Reste<wbr>verwerter")}</span><span class="catalog-ranks" aria-hidden="true">${[1,2,3].map(n=>`<i class="${n<=rank?'filled':''}"></i>`).join('')}</span>${!unlocked?'<span class="catalog-lock" aria-hidden="true">◇</span>':''}</button>`;
  }).join('')).join('');
  $('reset-talents').disabled = !editable() || !spent;
  updateTalentDetail();
}
function updateTalentDetail() {
  const key=selectedTalent,def=C.upgrades[key],rank=progress.equipped[key],parents=talentParents(key),unlocked=canUnlock(progress,key),free=availablePoints(progress);
  $('talent-sheet-title').textContent=def.name;
  $('talent-sheet-points').textContent=`${free} Punkte frei`;
  $('talent-detail').innerHTML=`<p class="talent-benefit">${def.benefit}</p><p class="talent-cost">${def.drawback}.</p><div class="talent-ranks">${[1,2,3].map(stage=>{
    const active=stage<=rank,target=active?stage-1:stage,blocked=!editable()||(!active&&(!unlocked||target-rank>free));
    return `<button class="talent-rank ${active?'active':''}" data-rank="${stage}" aria-pressed="${active}" aria-disabled="${blocked}" aria-label="${def.name}: Stufe ${stage} ${active?'zurücknehmen':'aktivieren'}">${icon(key)}<span>Stufe ${stage}</span><small>${active?'Belegt':blocked?'Gesperrt':'Wählen'}</small></button>`;
  }).join('')}</div><div class="talent-gate">${parents.length?'<b>Zugang: Stufe 2 bei</b>'+parents.map(parent=>`<button data-parent="${parent}" class="${progress.equipped[parent]>=C.parentRankRequired?'gate-open':''}">${icon(parent)}${C.upgrades[parent].name}${progress.equipped[parent]>=C.parentRankRequired?' ✓':''}</button>`).join('<span>oder</span>'):'<span>Direkt verfügbar · kein Vorgänger nötig</span>'}</div><p class="talent-hint" role="status">${!editable()?'Im Flug nur ansehen.':!unlocked?'Wähle einen Vorgänger, um den Zugang freizuschalten.':!free?'Alle Punkte verteilt. Belegte Stufe antippen zum Zurücknehmen.':''}</p>`;
}
function updateAchievements() {
  $('achievement-list').innerHTML = ACHIEVEMENTS.map(a => `<article class="achievement-item ${progress.achievements.includes(a.id) ? 'unlocked' : ''}">${icon(a.icon)}<div><h3>${progress.achievements.includes(a.id) ? '✓ ' : ''}${a.name}</h3><p>${a.description}</p></div></article>`).join('');
}
const distanceFormat = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
let lastHudUpdate = -Infinity;
function updateHud() {
  const now = performance.now();
  if (phase !== 'flying' || now - lastHudUpdate >= 100) {
    lastHudUpdate = now;
    const values = {
      distance: distanceFormat.format(Math.floor((flight?.distance || 0) * 10) / 10),
      altitude: number(Math.floor(flight?.y ?? currentLevel().launchHeight)),
      velocity: number(Math.round(flight && !flight.ended ? Math.hypot(flight.vx, flight.vy) : 0)),
      collected: String(flight?.pickupMaterial || 0),
    };
    for (const [id, value] of Object.entries(values)) {
      const node = $(id).querySelector('.hud-number');
      if (node.textContent !== value) node.textContent = value;
    }
    const health = flight ? Math.max(0, flight.health / flight.maxHealth * 100) : 100;
    const label = `Schale ${Math.ceil(health)}%`;
    if ($('health-value').textContent !== label) $('health-value').textContent = label;
  }
  $('boost-count').textContent = flight?.boostsLeft ?? currentLevel().boosts;
  $('boost-button').disabled = !!replaySession || phase !== 'flying' || !flight?.boostsLeft || flight.elapsed - flight.lastBoost < C.boostCooldown;
  $('boost-button').setAttribute('aria-label', `Schwung geben, noch ${flight?.boostsLeft ?? currentLevel().boosts} Impulse`);
}
function controls() {
  const preparing = phase === 'ready' || phase === 'charging';
  $('play-controls').hidden = !preparing;
  $('flight-actions').hidden = !!replaySession || phase !== 'flying';
  $('replay-controls').hidden = !replaySession;
  $('field-caption').hidden = phase !== 'ready';
  $('phase-badge').textContent = replaySession ? 'WIEDERHOLUNG' : { ready: 'STARTKLAR', charging: 'UNTER DRUCK', flying: 'IM ANFLUG', result: 'IM ZIEL', restarting: 'PÜREE!' }[phase];
  document.body.classList.toggle('is-charging', phase === 'charging');
  document.body.classList.toggle('is-flying', phase === 'flying');
  $('game').setAttribute('aria-disabled', String(phase === 'result'));
  updateTree();
}
function updateCharge() {
  const energy = phase === 'charging' ? chargeEnergy((performance.now() - chargeStart) / 1000) : C.limits.energy[0];
  const percent = (energy - C.limits.energy[0]) / (C.maxEnergy - C.limits.energy[0]) * 100;
  const zone = launchStress(energy, progress.equipped).zone;
  $('charge-label').textContent = phase !== 'charging' ? 'HALTEN ZUM LADEN' : { safe: 'DAS GEHT NOCH', risky: 'ZIEMLICH MUTIG', extreme: 'ZERREISSPROBE!' }[zone];
  $('charge-hint').textContent = phase === 'charging' ? (zone === 'extreme' ? 'Püree-Gefahr! Schale unter Extremstress' : 'Jetzt loslassen?') : 'Loslassen = Abflug';
  $('launch-text').textContent = phase === 'charging' ? 'LOS?' : 'LADEN';
  if(phase==='charging'&&!modalOpen()&&!document.hidden)gameAudio.play('charge',percent/100);
  return percent / 100;
}
function ready({ focus = true } = {}) {
  gameAudio.pauseMusic(false);
  chargeOwner = null; aimPointer = null; phase = 'ready'; flight = null; roundSeed = newSeed();
  renderer.reset(currentLevel().id); clock.reset(); showResult(false); $('flight-message').textContent = '';
  controls(); updateHud(); updateCharge();
  if (focus) $('launch-button').focus({ preventScroll: true });
}
function beginCharge(owner) {
  if (phase !== 'ready' || modalOpen() || document.hidden) return false;
  phase = 'charging'; chargeOwner = owner; chargeStart = performance.now(); controls(); updateCharge();
  return true;
}
function cancelCharge() {
  if (phase !== 'charging') return;
  chargeOwner = null; phase = 'ready'; controls(); updateCharge();
}
function releaseCharge(owner) {
  if (phase !== 'charging' || chargeOwner !== owner) return;
  progress.settings.energy = chargeEnergy((performance.now() - chargeStart) / 1000);
  chargeOwner = null; aimPointer = null;
  flight = createFlight(progress.settings, progress.equipped, { seed: roundSeed, windSeed, windTime: worldTime, traffic: progress.preferences.traffic, level: currentLevel().id });
  Object.assign(flight,{appearance:{...progress.cosmetics.equipped},theme:currentTheme()});
  recordLaunch(progress,flight);
  phase = 'flying'; lastEvent = 0; clock.reset(); renderer.reset(currentLevel().id); persist(); controls(); updateHud();
  gameAudio.play(flight.ended?'destroyed':'launch');
  if (flight.ended) finish();
}
function showResult(visible) {
  $('result').hidden = !visible;
  for (const child of $('canvas-wrap').children) if (child.id !== 'result') child.inert = visible;
}
function finish() {
  if(replaySession){phase='replay-end';gameAudio.pauseMusic(true);$('replay-status').textContent=replaySession.matches?'Wiederholung beendet':'Wiedergabe abgebrochen: Flugdaten weichen ab.';controls();updateHud();return;}
  const result = settleFlight(progress, flight); if (!result) return;
  gameAudio.play(result.achievements.length?'achievement':flight.health>0?'result':'failure');
  gameAudio.pauseMusic(true);
  phase = 'result'; persist(); updateRecords(); updateTree(); updateAchievements(); controls(); updateHud();
  $('result-kicker').textContent = result.newBest ? 'FRAGWÜRDIGE TECHNIK. FRAGLOS EIN REKORD.' : flight.reason === 'launch' ? 'DIE HOFFNUNG STIRBT ZULETZT. DIE KNOLLE NICHT.' : 'VERSUCH MACHT KLUG. ODER PÜREE.';
  $('result-title').textContent = result.newBest ? 'Knolle Leistung!' : flight.health <= 0 ? 'Püree mit Aussicht.' : 'Noch am Stück!';
  $('result-distance').innerHTML = `${number(result.distance)} <small>m</small>`;
  $('result-detail').textContent = flight.reason === 'laser' ? 'Der Sicherheitslaser hat deinen Rückflug beendet. Beute bleibt bei dir.' : flight.reason === 'launch' ? 'Diesmal hat die Schale nicht gehalten. Neue Knolle, neues Glück.' : `${number(flight.elapsed)} Sekunden Chaos. Insgesamt +${result.earned} Material.`;
  $('reward-pickups').textContent = `+${result.collected}`; $('reward-salvage').textContent = `+${result.salvage}`; $('reward-landing').textContent = `+${result.landing}`;
  $('result-achievements').textContent = result.achievements.map(id => `☆ ${ACHIEVEMENTS.find(a => a.id === id).name}`).join(' · ');
  $('result-xp').textContent = `+${result.xpEarned} XP${result.levelsGained ? ` · Level ${talentLevel(progress)}! +${result.levelsGained} Talentpunkt` : talentLevel(progress) === C.talentCap ? ' · Max. Level' : ` · ${C.xpPerLevel - progress.xp % C.xpPerLevel} bis Level ${talentLevel(progress) + 1}`}`;
  $('result-planted').textContent = `+${result.planted} gepflanzt · ${number(progress.planted)} insgesamt`;
  showResult(true); $('flight-message').textContent = '';
  $('retry-button').focus({ preventScroll: true });
}
function aim(e) {
  if (!['ready', 'charging'].includes(phase)) return;
  const rect = $('game').getBoundingClientRect();
  progress.settings.angle = aimAngle(e.clientX - rect.left, e.clientY - rect.top, renderer.x(0), renderer.y(currentLevel().launchHeight));
  $('field-caption').hidden = true;
}
function capture(element, event) { try { element.setPointerCapture(event.pointerId); } catch { /* Detached pointer was canceled. */ } }
$('game').addEventListener('pointerdown', e => {
  if (phase === 'flying' && !modalOpen() && e.button === 0) { e.preventDefault(); giveBoost(); return; }
  if (e.button !== 0 || e.isPrimary===false || modalOpen() || phase!=='ready') return;
  e.preventDefault(); aim(e); aimPointer = e.pointerId; capture($('game'), e);
  beginCharge(`p${e.pointerId}`);
});
$('game').addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse' && (phase === 'ready' || chargeOwner === `p${e.pointerId}`) || aimPointer === e.pointerId) aim(e);
});
$('game').addEventListener('pointerup', e => { if (aimPointer === e.pointerId) aimPointer = null; releaseCharge(`p${e.pointerId}`); });
$('launch-button').addEventListener('pointerdown', e => {
  if (e.button !== 0 || e.isPrimary === false) return; e.preventDefault();
  if (beginCharge(`p${e.pointerId}`)) capture($('launch-button'), e);
});
$('launch-button').addEventListener('pointerup', e => { e.preventDefault(); releaseCharge(`p${e.pointerId}`); });
for (const id of ['game', 'launch-button']) {
  for (const type of ['pointercancel', 'lostpointercapture']) $(id).addEventListener(type, e => {
    if (chargeOwner === `p${e.pointerId}`) cancelCharge(); if (aimPointer === e.pointerId) aimPointer = null;
  });
  $(id).addEventListener('contextmenu', e => e.preventDefault());
}
// Screen-reader activation toggles charging; pointer input uses down/up instead.
$('launch-button').addEventListener('click', e => { if (e.detail === 0) { if (phase === 'ready') beginCharge('accessible'); else releaseCharge('accessible'); } });
function giveBoost() {
  if (replaySession || phase !== 'flying' || modalOpen() || document.hidden) return;
  if (boostFlight(flight)) { gameAudio.play('boost'); updateHud(); $('flight-message').textContent = 'HUUUI! Da geht noch was!'; messageUntil = visualTime + 1.3; }
}
$('boost-button').addEventListener('click', giveBoost);
document.addEventListener('keydown', e => {
  if (!$('result').hidden && !modalOpen()) {
    if (e.key === 'Escape') { e.preventDefault(); ready(); return; }
    if (e.key === 'Tab') {
      const buttons = [...$('result').querySelectorAll('button:not([disabled])')];
      const index = buttons.indexOf(document.activeElement);
      e.preventDefault(); buttons[(index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus(); return;
    }
  }
  if (e.key === 'Escape') { cancelCharge(); return; }
  if (modalOpen() || ['SELECT', 'INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if(e.code==='KeyR' && phase==='flying'){e.preventDefault();if(!e.repeat)emergencyRestart();return;}
  if (e.code === 'Space' && phase === 'flying') {
    e.preventDefault(); if (!e.repeat) giveBoost(); return;
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && phase === 'ready') {
    e.preventDefault(); const up = e.key === 'ArrowUp' || e.key === 'ArrowRight';
    progress.settings.angle = clamp(progress.settings.angle + (up ? 2 : -2), ...C.limits.angle); $('field-caption').hidden = true;
  }
  if (e.code === 'Space' && (e.target.tagName !== 'BUTTON' || ['launch-button', 'boost-button'].includes(e.target.id))) {
    e.preventDefault(); if (!e.repeat) { if (phase === 'flying') giveBoost(); else beginCharge('keyboard'); }
  }
});
document.addEventListener('keyup', e => { if (e.code === 'Space' && chargeOwner === 'keyboard') { e.preventDefault(); releaseCharge('keyboard'); } });
window.addEventListener('blur', cancelCharge);
window.addEventListener('resize', () => { cancelCharge(); aimPointer = null; });
document.addEventListener('visibilitychange', () => { cancelCharge(); clock.reset(); lastTime = null; });

function openDialog(id) {
  for(const dialog of document.querySelectorAll('dialog[open]'))if(dialog.id!==id)dialog.close();
  cancelCharge();
  if (id === 'workshop-dialog' || id === 'talent-sheet') updateTree();
  if (id === 'scores-dialog'){ $('dialog-highscores').innerHTML=$('highscores').innerHTML;$('dialog-empty-scores').hidden=currentScores().length>0; }
  if (id === 'achievements-dialog') updateAchievements();
  if (id === 'cosmetics-dialog') updateCosmetics();
  $(id).showModal(); $(id).scrollTop=0; clock.reset(); lastTime = null;
  if (id === 'statistics-dialog') updateStatistics();
}
$('menu-button').addEventListener('click',()=>openDialog('menu-dialog'));
for (const id of ['workshop-button', 'flight-workshop', 'tune-button']) $(id).addEventListener('click', () => openDialog('workshop-dialog'));
for (const id of ['help-button', 'mobile-help']) $(id).addEventListener('click', () => openDialog('help-dialog'));
$('cosmetics-button').addEventListener('click', () => openDialog('cosmetics-dialog'));
$('achievements-button').addEventListener('click', () => openDialog('achievements-dialog'));
function closeDialog(id) {
  if (id === 'talent-sheet') {
    openDialog('workshop-dialog');
    $('talent-tree').querySelector(`[data-talent="${selectedTalent}"]`)?.focus({ preventScroll: true });
  } else $(id).close();
}
for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', () => closeDialog(button.dataset.close));
$('talent-sheet').addEventListener('cancel', event => { event.preventDefault(); closeDialog('talent-sheet'); });
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('close', () => {
  // close is queued; a reopened dialog is already managing its own pause state.
  if (dialog.open) return;
  clock.reset(); lastTime = null;
});
$('retry-button').addEventListener('click', () => ready());
$('close-result').addEventListener('click', () => ready());
$('dismiss-rotate').addEventListener('click', () => { $('rotate-hint').hidden = true; });

$('traffic').checked = progress.preferences.traffic;
$('traffic').addEventListener('change', () => { progress.preferences.traffic = $('traffic').checked; persist(); toast('Gilt ab der nächsten Knolle.'); });
function refreshAllocation() { persist(); updateRecords(); updateTree(); updateAchievements(); }
$('talent-tree').addEventListener('click',e=>{
  const node=e.target.closest('[data-talent]');if(!node)return;
  selectedTalent=node.dataset.talent;openDialog('talent-sheet');
});
$('talent-detail').addEventListener('click',e=>{
  const parent=e.target.closest('[data-parent]');
  if(parent){selectedTalent=parent.dataset.parent;updateTree();$('talent-sheet-title').focus({preventScroll:true});return;}
  const field=e.target.closest('[data-rank]');if(!field)return;
  const stage=Number(field.dataset.rank),current=progress.equipped[selectedTalent];
  if(editable()&&stage<=current){
    const preview=structuredClone(progress);setTalentRank(preview,selectedTalent,stage-1);
    const dependents=UPGRADE_KEYS.filter(key=>key!==selectedTalent&&preview.equipped[key]<progress.equipped[key]);
    if(dependents.length){
      $('talent-detail').querySelector('.talent-hint').textContent=`Zuerst ${dependents.map(key=>C.upgrades[key].name).join(', ')} zurücknehmen.`;
      return;
    }
  }
  if(editable()&&setTalentRank(progress,selectedTalent,stage<=current?stage-1:stage))gameAudio.play('talent');
  refreshAllocation();$('talent-detail').querySelector(`[data-rank="${stage}"]`).focus({preventScroll:true});
});
$('reset-talents').addEventListener('click', () => {
  if (!editable()) return; resetTalents(progress); refreshAllocation();
});

function frame(timestamp) {
  const paused = document.hidden || modalOpen();
  const delta = paused || lastTime === null ? 0 : Math.min((timestamp - lastTime) / 1000, .1);
  lastTime = timestamp; visualTime += delta;
  let alpha = 1;
  if (phase === 'flying' && !paused) {
    alpha = clock.advance(delta, dt => { if (!flight.ended) { const before=flight.eventSerial;if(replaySession)advanceReplay(replaySession);else stepFlight(flight, dt);if(before!==flight.eventSerial)gameAudio.play(flight.event); } }, 1);
    worldTime = flight.windTime + flight.elapsed;
    if (flight.eventSerial !== lastEvent) {
      lastEvent = flight.eventSerial;
      const messages = { laser: 'FALSCHER AUSGANG! Sicherheits-Püree.', boost: 'HUUUI! Da geht noch was!', updraft: 'AUFWIND! Nächster Halt: oben.', launch: 'Ab geht die Knolle!', mushroom: { mushroom: 'BOING! Pilz-Power!', trampoline: 'TRAMPOLIN! Ab nach vorne!', spring: 'SCHROTTFEDER! Hoch damit!', toaster: 'TOAST FERTIG! Kartoffel fliegt.' }[flight.lastBouncer] || 'BOING!' , hay: 'Bremsen für Fortgeschrittene.', bounce: 'Hopp, Kartoffel!', pickup: `+ Schrott! Schon ${flight.pickupMaterial} im Sack.`, traffic: `UFO ERLEGT! ${flight.lastTrafficBoostGain ? '+1 Schwung nachgeladen!' : 'Schwung schon voll.'}`, 'traffic-bounce': `UFO-TRAMPOLIN! ${flight.lastTrafficBoostGain ? '+1 Schwung nachgeladen!' : 'Schwung schon voll.'}`, airbag: 'Pffft. Airbag sei Dank.' };
      $('flight-message').textContent = messages[flight.event] || ''; messageUntil = visualTime + 1.6;
    }
    if (flight.ended || replaySession?.done) finish(); updateHud();
    if (!replaySession && !flight.settled) $('planted-total').textContent = number(progress.planted + flight.planted);
  } else if (phase === 'ready' || phase === 'charging') worldTime += delta;
  const wind = flight ? flight.wind : windAt(worldTime, windSeed) * currentLevel().windScale;
  if (visualTime > messageUntil && phase !== 'result') $('flight-message').textContent = '';
  const charge = updateCharge();
  if (!document.hidden) renderer.draw({ appearance: replaySession ? flight.appearance : progress.cosmetics.equipped, flight, settings: flight?.settings || progress.settings, equipment: flight?.equipment || progress.equipped, phase, best: currentScores()[0]?.distance || 0, time: visualTime, delta, alpha, theme: replaySession ? flight.theme : currentTheme(), wind, seed: flight?.seed ?? roundSeed, traffic: flight?.trafficEnabled ?? progress.preferences.traffic, charge, level: currentLevel().id });
  requestAnimationFrame(frame);
}
updateTheme(); updateRecords(); updateTree(); updateAchievements(); ready({ focus: false });
$('storage-warning').hidden = loaded.available; persist(); requestAnimationFrame(frame);

function updateCosmetics() {
  const balance = cosmeticBalance(progress);
  $('cosmetic-balance').textContent = number(balance);
  $('cosmetic-total').textContent = `${number(progress.planted)} insgesamt gepflanzt`;
  $('cosmetic-note').textContent = editable() ? 'Kaufen und umziehen zwischen zwei Flügen. Dein Gesamtzähler für Erfolge bleibt erhalten.' : 'Flug pausiert. Umziehen und kaufen geht nach der Landung.';
  const scenes = SCENES.map(scene=>{
    const active=!progress.cosmetics.equipped.scene&&progress.preferences.theme===scene.id;
    return `<article class="cosmetic-card ${active?'active':''}"><span class="cosmetic-icon">${cosmeticIcon(scene.id)}</span><h3>${scene.name}</h3><p>${scene.description}</p><button data-scene="${scene.id}" aria-pressed="${active}" ${!editable()?'disabled':''}>${active?'✓ Ausgewählt':'Welt auswählen · kostenlos'}</button></article>`;
  }).join('');
  const items = Object.entries(COSMETICS).filter(([,item]) => (item.slot==='scene') === (cosmeticCategory==='scenes')).map(([id, item]) => {
    const owned = progress.cosmetics.owned.includes(id), active = progress.cosmetics.equipped[item.slot] === id;
    return `<article class="cosmetic-card ${active ? 'active' : ''}"><span class="cosmetic-icon" aria-hidden="true">${cosmeticIcon(id)}</span><h3>${item.name}</h3><p>${item.description}</p><button data-cosmetic="${id}" ${!editable() || (!owned && balance < item.cost) ? 'disabled' : ''} ${owned ? `aria-pressed="${active}"` : ''}>${owned ? active ? '✓ Angezogen · ablegen' : 'Anziehen' : `${item.cost} Pflanzen · Freischalten`}</button></article>`;
  }).join('');
  $('cosmetic-list').innerHTML = (cosmeticCategory==='scenes'?scenes:'') + items;
  document.querySelectorAll('[data-cosmetic-category]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.cosmeticCategory===cosmeticCategory)));
  const c = $('cosmetic-preview').getContext('2d');
  const preview = Object.create(Renderer.prototype);
  Object.assign(preview, { ctx: c, width:700, height:180, ground:160, camera:0, cameraY:0, scale:5, origin:100, appearance:progress.cosmetics.equipped, reducedMotion:true });
  if(currentTheme()==='classic')preview.classicBackground(0);else preview.junkBackground(0); preview.potato(350, 112, .1, {}, 1, 1, 1, 1.8);
}
$('cosmetic-tabs').addEventListener('click',event=>{const button=event.target.closest('[data-cosmetic-category]');if(button){cosmeticCategory=button.dataset.cosmeticCategory;updateCosmetics();}});
$('cosmetic-list').addEventListener('click', event => {
  const scene=event.target.closest('[data-scene]');
  if(scene&&editable()){progress.preferences.theme=scene.dataset.scene;delete progress.cosmetics.equipped.scene;gameAudio.play('cosmetic');updateTheme();persist();updateCosmetics();return;}
  const button = event.target.closest('[data-cosmetic]'); if (!button || !editable()) return;
  const id = button.dataset.cosmetic;
  const changed = progress.cosmetics.owned.includes(id) ? toggleCosmetic(progress, id) : buyCosmetic(progress, id);
  if (changed) { gameAudio.play('cosmetic'); updateTheme(); persist(); updateCosmetics(); $('cosmetic-list').querySelector(`[data-cosmetic="${id}"]`)?.focus(); }
});

$('cosmetics-button').insertAdjacentHTML('afterbegin', cosmeticIcon('plant'));

function updateStatistics(){
  const stats=progress.statistics;
  $('statistics-note').textContent=`Abschüsse und Pflanzen insgesamt. Detailzähler seit Versuch ${stats.sinceAttempt+1}; Flugdetails zählen nach Rundenende.`;
  const items=[['Abschüsse',stats.shots],['Abstürze',stats.crashes],['Heile Landungen',stats.landings],['UFOs zerstört',stats.ufos],['Bodenkontakte',stats.bounces],['Sprungbretter',stats.springboards],['Schwung genutzt',stats.boosts],['Schrottteile',stats.pickups],['Gepflanzt',progress.planted],['Flugzeit',`${Math.floor(stats.flightSeconds/60)} min ${Math.floor(stats.flightSeconds%60)} s`],['Gesamtweite',`${number(stats.distance)} m`],['Notsprengungen',stats.aborts]];
  $('statistics-list').innerHTML=items.map(([label,value])=>`<article class="statistic"><strong>${value}</strong><span>${label}</span></article>`).join('');
}

let shareUrl=null,shareFile=null,shareGeneration=0,shareSource=null,shareResizeTimer;
async function refreshShare(){
  if(!shareSource||!$('share-dialog').open)return;
  clearTimeout(shareResizeTimer);
  const generation=++shareGeneration;
  $('native-share').hidden=true;$('download-share').hidden=true;$('share-status').textContent='Deine Flugkarte wird gezeichnet …';
  try{
    const box=$('share-stage').getBoundingClientRect();
    shareSize=`${Math.round(box.width)}:${Math.round(box.height)}`;
    const blob=await createShareCard({...shareSource,aspect:box.width/Math.max(1,box.height)});
    if(generation!==shareGeneration||!$('share-dialog').open)return;
    if(shareUrl)URL.revokeObjectURL(shareUrl);
    shareFile=new File([blob],`kartoffelkanone-${Math.floor(shareSource.flight.distance)}m.png`,{type:'image/png'});
    shareUrl=URL.createObjectURL(blob);$('share-preview').src=shareUrl;$('share-preview').hidden=false;
    $('download-share').href=shareUrl;$('download-share').download=shareFile.name;$('download-share').hidden=false;
    let native=false;try{native=!!navigator.share&&(!navigator.canShare||navigator.canShare({url:flightLink(shareSource.flight)}));}catch{}
    $('native-share').hidden=!native;$('share-status').textContent='';
  }catch{if(generation===shareGeneration)$('share-status').textContent='Das Bild konnte nicht erstellt werden. Bitte schließe den Dialog und versuche es noch einmal.';}
}
$('share-result').addEventListener('click',()=>{
  if(!flight?.ended)return;
  $('share-preview').hidden=true;
  const snapshot=document.createElement('canvas');snapshot.width=$('game').width;snapshot.height=$('game').height;snapshot.getContext('2d').drawImage($('game'),0,0);
  shareSource={screenshot:snapshot,flight,best:currentScores()[0]?.distance||0,level:talentLevel(progress),appearance:{...(flight.appearance||progress.cosmetics.equipped)},theme:flight.theme||currentTheme()};
  openDialog('share-dialog');refreshShare();
});
let shareSize='';
new ResizeObserver(entries=>{
  const {width,height}=entries[0].contentRect,size=`${Math.round(width)}:${Math.round(height)}`;
  if(width<1||height<1||size===shareSize)return;
  shareSize=size;clearTimeout(shareResizeTimer);shareResizeTimer=setTimeout(refreshShare,100);
}).observe($('share-stage'));
$('native-share').addEventListener('click',async()=>{
  if(!shareFile) return;
  $('native-share').disabled=true;
  try{const data={title:'Kartoffelkanone – mein Flug',text:'Schau dir meinen Kartoffelflug an!',url:flightLink(shareSource.flight)};if(navigator.canShare?.({...data,files:[shareFile]}))data.files=[shareFile];await navigator.share(data);}
  catch(error){if(error.name!=='AbortError') $('share-status').textContent='Teilen ist hier nicht verfügbar. Du kannst den Link kopieren oder das PNG herunterladen.';}
  finally{$('native-share').disabled=false;}
});
$('share-dialog').addEventListener('close',()=>{
  if($('share-dialog').open) return;
  ++shareGeneration;shareSource=null;clearTimeout(shareResizeTimer);if(shareUrl) URL.revokeObjectURL(shareUrl);shareUrl=null;shareFile=null;
  $('share-preview').removeAttribute('src');$('download-share').removeAttribute('href');
});

function updateSoundButton(){
  const on=progress.preferences.sound;
  $('sound-button').setAttribute('aria-pressed',String(on));$('sound-button').setAttribute('aria-label',on?'Soundeffekte ausschalten':'Soundeffekte einschalten');
  $('sound-button').classList.toggle('muted',!on);
}
document.addEventListener('pointerdown',()=>gameAudio.unlock(),{capture:true,passive:true});
document.addEventListener('keydown',()=>gameAudio.unlock(),{capture:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)gameAudio.stop();else if(gameAudio.context)gameAudio.unlock();});
$('sound-button').addEventListener('click',()=>{
  progress.preferences.sound=!progress.preferences.sound;gameAudio.setEnabled(progress.preferences.sound);if(progress.preferences.sound){gameAudio.unlock();gameAudio.play('pickup');}persist();updateSoundButton();
});
updateSoundButton();
function emergencyRestart(){
  if(replaySession||phase!=='flying'||modalOpen()||!detonateFlight(flight))return;
  gameAudio.play('destroyed');finish();phase='restarting';showResult(false);controls();
  setTimeout(()=>{ready();toast('Püree erledigt. Beute behalten. Neue Knolle!');},220);
}
$('detonate-button').addEventListener('click',emergencyRestart);

function updateMusicButton(){
  const on=progress.preferences.music;$('music').checked=on;
  $('music-button').setAttribute('aria-pressed',String(on));$('music-button').setAttribute('aria-label',on?'Musik ausschalten':'Musik einschalten');$('music-button').classList.toggle('muted',!on);
}
function changeMusic(on){progress.preferences.music=on;gameAudio.setMusicEnabled(on);if(on)gameAudio.unlock();persist();updateMusicButton();}
$('music').addEventListener('change',()=>changeMusic($('music').checked));
$('music-button').addEventListener('click',()=>changeMusic(!progress.preferences.music));
updateMusicButton();

window.addEventListener('pagehide',()=>{gameAudio.stop();gameAudio.context?.suspend().catch(()=>{});});
window.addEventListener('pageshow',event=>{if(event.persisted&&gameAudio.context)gameAudio.unlock();});


$('workshop-dialog').prepend($('reset-talents'));
// A single navigation surface, shared across desktop and touch layouts.
const compactQuery=matchMedia('(display-mode:standalone), (display-mode:fullscreen), (max-height:600px) and (orientation:landscape), (pointer:coarse) and (orientation:landscape)');
for(const id of ['sound-button','music-button','workshop-button'])$('compact-tools').append($(id));
$('workshop-button').insertAdjacentHTML('afterbegin',icon('gear'));
$('workshop-button').setAttribute('aria-label','Talente öffnen');
const menuEntries=[['workshop-dialog','Talente','gear','Deine Knolle aufrüsten'],['cosmetics-dialog','Garderobe','leaf','Hüte, Welten & Schabernack'],['achievements-dialog','Erfolge','star','Deine kleinen Triumphe'],['scores-dialog','Bestenliste','flag','Deine weitesten Flüge'],['statistics-dialog','Statistik','flag','Jeder Flug zählt'],['help-dialog','Hilfe','help','Halten. Hoffen. Loslassen.']];
$('menu-items').innerHTML=menuEntries.map(([target,label,symbol,description])=>`<button data-open="${target}">${icon(symbol)}<span><b>${label}</b><small>${description}</small></span><i aria-hidden="true">›</i></button>`).join('');
$('menu-items').addEventListener('click',e=>{const button=e.target.closest('[data-open]');if(button)openDialog(button.dataset.open);});
for(const dialog of document.querySelectorAll('dialog:not(#menu-dialog)')){
  const back=document.createElement('button');back.className='dialog-back';back.textContent=dialog.id==='talent-sheet'?'‹ Talente':'‹ Menü';back.setAttribute('aria-label',dialog.id==='talent-sheet'?'Zur Talentübersicht':'Zurück zum Spielmenü');back.addEventListener('click',()=>openDialog(dialog.id==='talent-sheet'?'workshop-dialog':'menu-dialog'));dialog.prepend(back);
}
let resizeFrame, previousViewport;
function arrangeControls(){
  cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{
    const view=window.visualViewport, w=view?.width||innerWidth,h=view?.height||innerHeight;
    if(previousViewport&&(Math.abs(previousViewport.w-w)>1||Math.abs(previousViewport.h-h)>1)){cancelCharge();aimPointer=null;}
    previousViewport={w,h};
    document.documentElement.style.setProperty('--screen-w',`${w}px`);document.documentElement.style.setProperty('--screen-h',`${h}px`);
    document.body.classList.toggle('compact-play',compactQuery.matches||!!document.fullscreenElement);
    renderer.resize();
  });
}
compactQuery.addEventListener('change',arrangeControls);window.addEventListener('resize',arrangeControls);window.visualViewport?.addEventListener('resize',arrangeControls);document.addEventListener('fullscreenchange',arrangeControls);arrangeControls();


// Replay UI is a separate viewing session. The live run and profile are restored on exit.
function flightLink(run){const data=captureReplay(run);return data?replayLink(data,location.href):new URL(location.pathname,location.origin).href;}
async function copyFlightLink(url){
  try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(url);toast('Fluglink kopiert!');}
  catch{$('flight-link-text').value=url;openDialog('link-dialog');$('flight-link-text').focus();$('flight-link-text').select();}
}
$('copy-flight-link').addEventListener('click',()=>{if(shareSource)copyFlightLink(flightLink(shareSource.flight));});
function showReplayDetails(data,equipment,name,distance){
  replaySelection={data,equipment};
  $('replay-title').textContent=data?'Flug nochmal ansehen':'Talente dieses Flugs';
  $('replay-description').textContent=`${name} · ${number(distance)} m. ${data?'Wiedergabe ohne Belohnungen. Deine Talente bleiben unverändert.':'Für diesen älteren Flug gibt es keine vollständige Aufzeichnung.'}`;
  $('replay-play').hidden=!data;$('replay-copy').hidden=!data;
  $('replay-talents').replaceChildren();
  for(const key of UPGRADE_KEYS)if(equipment[key]){const item=document.createElement('span');item.textContent=`${C.upgrades[key].name} · ${equipment[key]}`;$('replay-talents').append(item);}
  if(!UPGRADE_KEYS.some(k=>equipment[k]))$('replay-talents').textContent='Nackte Knolle · keine Talente';
  updateReplayImport();openDialog('replay-dialog');
}
function updateReplayImport(){
  const check=importTalentBuild(progress,replaySelection.equipment,false);
  $('replay-import').disabled=!editable()||!check.ok;
  $('replay-import-note').textContent=!editable()?'Übernehmen geht zwischen zwei Flügen.':check.ok?`Übernehmen ersetzt deine aktuelle Verteilung (${check.points} Punkte). Dein Level und deine Looks bleiben erhalten.`:check.reason;
}
for(const id of ['highscores','dialog-highscores'])$(id).addEventListener('click',e=>{
  const button=e.target.closest('[data-replay],[data-build]');if(!button)return;
  const score=currentScores()[Number(button.dataset.replay??button.dataset.build)];if(score)showReplayDetails(score.replay,score.equipment,score.playerName,score.distance);
});
$('replay-import').addEventListener('click',()=>{
  if(!editable()||!replaySelection)return;
  const result=importTalentBuild(progress,replaySelection.equipment);
  if(result.ok){refreshAllocation();updateReplayImport();toast('Talentverteilung übernommen.');}
});
$('replay-copy').addEventListener('click',()=>{if(replaySelection?.data)copyFlightLink(replayLink(replaySelection.data,location.href));});
function beginReplay(data){
  if(!suspendedRun){cancelCharge();suspendedRun={flight,phase,worldTime,roundSeed,resultHidden:$('result').hidden};}
  for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
  replaySession=startReplay(data);flight=replaySession.flight;
  phase='flying';lastEvent=0;clock.reset();lastTime=null;renderer.reset('ground');
  showResult(false);$('flight-message').textContent='';$('replay-status').textContent=`Wiederholung · ${data.name}`;
  controls();updateHud();gameAudio.pauseMusic(false);
  if(flight.ended){advanceReplay(replaySession);finish();}
}
$('replay-play').addEventListener('click',()=>{if(replaySelection?.data)beginReplay(replaySelection.data);});
$('replay-again').addEventListener('click',()=>{if(replaySession)beginReplay(replaySession.data);});
$('replay-stop').addEventListener('click',()=>{
  if(!suspendedRun)return;
  ({flight,phase,worldTime,roundSeed}=suspendedRun);showResult(!suspendedRun.resultHidden);
  replaySession=null;suspendedRun=null;clock.reset();lastTime=null;renderer.reset(currentLevel().id);
  $('flight-message').textContent='';gameAudio.pauseMusic(phase==='result');controls();updateRecords();updateHud();
});
function readFlightLink(){
  if(!location.hash.startsWith('#flug='))return;
  try{const data=decodeReplayLink(location.hash);showReplayDetails(data,replayEquipment(data),data.name,data.result[5]);}
  catch(error){toast(error.message);}
}
window.addEventListener('hashchange',readFlightLink);
readFlightLink();
