import { CONFIG, UPGRADE_KEYS, LEVELS, BOUNCERS } from './config.mjs';
import { COSMETICS } from './cosmetics.mjs';
import { createFlight, stepFlight, boostFlight, detonateFlight } from './physics.mjs';
import { sha256 } from './share-proof.mjs';

// Bump the engine revision whenever simulation code changes; balancing is fingerprinted too.
export const REPLAY_ENGINE = 'ground-1-' + sha256(JSON.stringify({CONFIG,LEVELS,BOUNCERS})).slice(0,12);
const MAX_TICKS = 120 * 60 * 30;
export function flightResult(f) {
  return [f.x,f.y,f.vx,f.vy,f.health,f.distance,f.maxHeight,f.pickupMaterial,f.planted,f.reason,f.boostsUsed];
}
export function captureReplay(f) {
  if (f.level !== 'ground' || !f.ended || f.ticks > MAX_TICKS || f.actions.length > 256) return null;
  return storedReplay({v:1,engine:REPLAY_ENGINE,settings:[f.settings.angle,f.settings.energy],talents:UPGRADE_KEYS.map(k=>f.equipment[k]),seed:f.seed,windSeed:f.windSeed,windTime:f.windTime,wind:f.wind,traffic:f.trafficEnabled,ticks:f.ticks,actions:f.actions.map(a=>[...a]),name:f.playerName || 'Knollenpilot',looks:f.appearance || {},theme:f.theme || 'junk',result:flightResult(f)});
}
export function validateReplay(raw) {
  const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
  const uint=v=>Number.isInteger(v)&&finite(v,0,4294967295);
  if(!raw||raw.v!==1||raw.engine!==REPLAY_ENGINE)throw Error('Diese Wiederholung gehört zu einer anderen Spielversion.');
  if(!Array.isArray(raw.settings)||raw.settings.length!==2||!raw.settings.every((v,i)=>finite(v,...CONFIG.limits[i?'energy':'angle']))||!Array.isArray(raw.talents)||raw.talents.length!==UPGRADE_KEYS.length||raw.talents.some(v=>!Number.isInteger(v)||v<0||v>3)||raw.talents.reduce((a,b)=>a+b,0)>CONFIG.talentCap)throw Error('Ungültige Startwerte oder Talente.');
  if(!uint(raw.seed)||!uint(raw.windSeed)||!finite(raw.windTime,0,1e12)||!finite(raw.wind,-1000,1000)||typeof raw.traffic!=='boolean'||!Number.isInteger(raw.ticks)||!finite(raw.ticks,0,MAX_TICKS))throw Error('Ungültige Flugdaten.');
  if(!Array.isArray(raw.actions)||raw.actions.length>256)throw Error('Zu viele Eingaben im Fluglink.');
  let previous=-1;
  const actions=raw.actions.map(a=>{if(!Array.isArray(a)||a.length!==2||!Number.isInteger(a[0])||a[0]<previous||a[0]>raw.ticks||a[0]<0||!['boost','abort'].includes(a[1]))throw Error('Ungültige Flug-Eingabe.');previous=a[0];return [...a];});
  if(!Array.isArray(raw.result)||raw.result.length!==11||raw.result.some((v,i)=>i===9?!['rest','impact','launch','laser','abort'].includes(v):!finite(v,-1e9,1e9)))throw Error('Ungültiges Flugergebnis.');
  const looks={};for(const [id,def] of Object.entries(COSMETICS))if(raw.looks?.[def.slot]===id)looks[def.slot]=id;
  return {v:1,engine:REPLAY_ENGINE,settings:[...raw.settings],talents:[...raw.talents],seed:raw.seed,windSeed:raw.windSeed,windTime:raw.windTime,wind:raw.wind,traffic:raw.traffic,ticks:raw.ticks,actions,name:typeof raw.name==='string'?Array.from(raw.name.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/gu,'')).slice(0,24).join(''):'Knollenpilot',looks,theme:raw.theme==='classic'?'classic':'junk',result:[...raw.result]};
}
export function storedReplay(raw) { try{return raw?validateReplay(raw):null;}catch{return null;} }
export function replayEquipment(data){return Object.fromEntries(UPGRADE_KEYS.map((k,i)=>[k,data.talents[i]]));}
export function startReplay(raw) {
  const data=validateReplay(raw);
  const flight=createFlight({angle:data.settings[0],energy:data.settings[1]},replayEquipment(data),{seed:data.seed,windSeed:data.windSeed,windTime:data.windTime,wind:data.wind,traffic:data.traffic,level:'ground'});
  Object.assign(flight,{appearance:data.looks,theme:data.theme,playerName:data.name});
  return {data,flight,cursor:0,done:false,matches:false};
}
export function advanceReplay(session) {
  if(session.done)return;
  const {data,flight}=session;
  while(session.cursor<data.actions.length&&data.actions[session.cursor][0]===flight.ticks){
    const [,action]=data.actions[session.cursor++];
    if(action==='boost')boostFlight(flight);else detonateFlight(flight);
  }
  if(!flight.ended&&flight.ticks<data.ticks)stepFlight(flight,CONFIG.step);
  if(flight.ended||flight.ticks>=data.ticks){
    // An input at the final tick (emergency detonation) happens after that tick.
    while(session.cursor<data.actions.length&&data.actions[session.cursor][0]===flight.ticks){const action=data.actions[session.cursor++][1];if(action==='abort')detonateFlight(flight);else boostFlight(flight);}
    session.done=true;
    session.matches=flight.ended&&session.cursor===data.actions.length&&flight.ticks===data.ticks&&JSON.stringify(flightResult(flight))===JSON.stringify(data.result);
  }
}
export function replayLink(raw, base) {
  const bytes=new TextEncoder().encode(JSON.stringify(validateReplay(raw)));
  const encoded=btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  const url=new URL(base);url.hash='flug='+encoded;return url.href;
}
export function decodeReplayLink(hash) {
  const encoded=hash.replace(/^#flug=/,'');
  if(!hash.startsWith('#flug=')||encoded.length>32000||!/^[\w-]+$/.test(encoded))throw Error('Der Fluglink ist ungültig oder unvollständig.');
  try {return validateReplay(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(encoded.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0)))));}catch(error){throw Error(error.message.startsWith('Diese Wiederholung')?error.message:'Der Fluglink ist ungültig oder unvollständig.');}
}
