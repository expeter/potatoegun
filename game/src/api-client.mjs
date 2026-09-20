const configured = document.querySelector('meta[name="minizap-api"]')?.content;
export const apiBase = configured ?? (location.hostname === 'potatoe.minizap.online' ? 'https://api.minizap.online' : ['localhost', '127.0.0.1'].includes(location.hostname) ? '/api' : '');
async function request(path, options = {}) {
  if (!apiBase) throw Error('Online-Bestenliste ist in dieser Vorschau nicht verfügbar.');
  const response = await fetch(`${apiBase}/v1/potatoe${path}`, { ...options, signal: AbortSignal.timeout(12000) });
  const body = await response.json();
  if (!response.ok) throw Error(body.message || 'Der Server ist gerade nicht erreichbar.');
  return body;
}
const links = new Map();
export async function saveReplay(replay, listed = false) {
  const key = JSON.stringify(replay);
  if (!listed && links.has(key)) return links.get(key);
  const result = await request('/flights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ replay, listed }) });
  // Construct from the current game origin; never navigate to a server-supplied URL.
  const target = new URL('./', document.baseURI);target.searchParams.set('flight',result.id);
  const url = target.href;
  if (!/^[\w-]{12}$/.test(result.id)) throw Error('Ungültige Serverantwort.');
  links.set(key, url); return url;
}
export const fetchReplay = id => request(`/flights/${encodeURIComponent(id)}`);
export const fetchLeaderboard = () => request('/leaderboard');
