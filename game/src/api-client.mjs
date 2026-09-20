import { EN } from './messages.mjs';
import { t } from './i18n.mjs';
const productionHost = ['potato.minizap.online', 'potatoe.minizap.online'].includes(location.hostname);
const configured = document.querySelector('meta[name="minizap-api"]')?.content;
export const apiBase = configured ?? (productionHost ? 'https://api.minizap.online' : ['localhost', '127.0.0.1'].includes(location.hostname) ? '/api' : '');
async function request(path, options = {}) {
  if (!apiBase) throw Error(t('Online-Bestenliste ist in dieser Vorschau nicht verfügbar.'));
  const response = await fetch(`${apiBase}/v1/potatoe${path}`, { ...options, signal: AbortSignal.timeout(12000) });
  const body = await response.json();
  if (!response.ok) throw Object.assign(Error(apiError(body.error, body.message)), { status: response.status });
  return body;
}
const links = new Map();
export async function saveReplay(replay, listed = false) {
  const key = JSON.stringify(replay);
  if (!listed && links.has(key)) return links.get(key);
  const result = await request('/flights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ replay, listed }) });
  // Construct from the current game origin; never navigate to a server-supplied URL.
  const target = new URL(productionHost ? 'https://potato.minizap.online/' : './', document.baseURI);target.searchParams.set('flight',result.id);
  const url = target.href;
  if (!/^[\w-]{12}$/.test(result.id)) throw Error(t('Ungültige Serverantwort.'));
  links.set(key, url); return url;
}
export const fetchReplay = id => request(`/flights/${encodeURIComponent(id)}`);
export const fetchLeaderboard = () => request('/leaderboard');

function apiError(code, detail) {
  if(code==='invalid_replay' && Object.hasOwn(EN,detail))return t(detail);
  const messages={rate_limited:'Zu viele Anfragen. Bitte kurz warten.',verification_failed:'Das Ergebnis stimmt nicht mit der Wiederholung überein.',verification_timeout:'Die Flugprüfung hat zu lange gedauert. Bitte erneut versuchen.',invalid_replay:'Ungültige Flugdaten.',not_found:'Flug konnte nicht geladen werden.',traffic_required:'Online-Rekorde benötigen Gegenverkehr.',invalid_game_rules:'Der Flug erfüllt die Spielregeln nicht.',busy:'Der Server ist ausgelastet. Bitte später erneut versuchen.',storage_full:'Der Server ist ausgelastet. Bitte später erneut versuchen.'};
  return t(messages[code] || 'Der Server ist gerade nicht erreichbar.');
}
