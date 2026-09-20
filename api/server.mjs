import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { REPLAY_ENGINE, validateReplay } from '../shared/replay.mjs';

const PREFIX = '/v1/potatoe';
const ID = /^[A-Za-z0-9_-]{12}$/;
const fail = (status, code, message) => Object.assign(Error(message), { status, code });
export function createApi({ dbPath = ':memory:', gameOrigin = 'https://potatoe.minizap.online', origins = [gameOrigin], trustProxy = false, rateLimit = 120, verifyTimeout = 5000 } = {}) {
  if (dbPath !== ':memory:') mkdirSync(dirname(resolve(dbPath)), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS flights (
      id TEXT PRIMARY KEY, digest TEXT UNIQUE NOT NULL, replay TEXT NOT NULL,
      engine TEXT NOT NULL, name TEXT NOT NULL, distance REAL NOT NULL,
      listed INTEGER NOT NULL, traffic INTEGER NOT NULL, created INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ranking ON flights(engine, listed, traffic, distance DESC, created, id);`);
  const clients = new Map();
  let active = 0;
  const workers = new Set();
  async function verify(replay) {
    if (active >= 2) throw fail(503, 'busy', 'Bitte gleich noch einmal versuchen.');
    active++;
    try {
      return await new Promise((resolve, reject) => {
        const worker = new Worker(new URL('./verify-worker.mjs', import.meta.url), { workerData: replay });
        workers.add(worker);
        const timer = setTimeout(() => { reject(fail(422, 'verification_timeout', 'Flugprüfung hat zu lange gedauert.')); worker.terminate(); }, verifyTimeout);
        worker.once('message', result => result.ok ? resolve(result) : reject(fail(422, 'invalid_replay', result.message)));
        worker.once('error', () => reject(fail(500, 'verification_failed', 'Flugprüfung fehlgeschlagen.')));
        worker.once('exit', () => { clearTimeout(timer); workers.delete(worker); reject(fail(500, 'verification_failed', 'Flugprüfung wurde beendet.')); });
      });
    } finally { active--; }
  }
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Vary', 'Origin');
    const send = (status, body) => { if (!res.destroyed) res.writeHead(status).end(JSON.stringify(body)); };
    try {
      const origin = req.headers.origin;
      if (origin && !origins.includes(origin)) throw fail(403, 'origin_denied', 'Origin nicht erlaubt.');
      if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.writeHead(204).end(); return;
      }
      const now = Date.now();
      for (const [key, value] of clients) if (value.until <= now) clients.delete(key);
      const ip = trustProxy ? String(req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(',').at(-1).trim() : req.socket.remoteAddress;
      if (!clients.has(ip)) {
        if (clients.size >= 10000) throw fail(503, 'busy', 'Bitte später versuchen.');
        clients.set(ip, { count: 0, posts: 0, until: now + 60000 });
      }
      const client = clients.get(ip);
      if (++client.count > rateLimit || (req.method === 'POST' && ++client.posts > 10)) {
        res.setHeader('Retry-After', '60'); throw fail(429, 'rate_limited', 'Zu viele Anfragen. Bitte eine Minute warten.');
      }
      const path = new URL(req.url, 'http://localhost').pathname;
      if (req.method === 'GET' && path === '/health') { db.prepare('SELECT 1').get(); send(200, { ok: true }); return; }
      if (req.method === 'GET' && path === `${PREFIX}/leaderboard`) {
        send(200, { flights: db.prepare('SELECT id, name, distance, created FROM flights WHERE engine=? AND listed=1 AND traffic=1 ORDER BY distance DESC, created, id LIMIT 20').all(REPLAY_ENGINE) }); return;
      }
      if (req.method === 'GET' && path.startsWith(`${PREFIX}/flights/`)) {
        const id = path.slice(`${PREFIX}/flights/`.length);
        if (!ID.test(id)) throw fail(404, 'not_found', 'Flug nicht gefunden.');
        const row = db.prepare('SELECT replay, distance FROM flights WHERE id=?').get(id);
        if (!row) throw fail(404, 'not_found', 'Flug nicht gefunden.');
        send(200, { id, replay: JSON.parse(row.replay), distance: row.distance }); return;
      }
      if (req.method === 'POST' && path === `${PREFIX}/flights`) {
        if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') throw fail(415, 'content_type', 'JSON erforderlich.');
        if (Number(req.headers['content-length']) > 32768) throw fail(413, 'body_too_large', 'Flugdaten zu groß.');
        let size = 0; const chunks = [];
        const timer = setTimeout(() => req.destroy(), 10000);
        try { for await (const chunk of req) { size += chunk.length; if (size > 32768) throw fail(413, 'body_too_large', 'Flugdaten zu groß.'); chunks.push(chunk); } }
        finally { clearTimeout(timer); }
        let body, replay;
        try { body = JSON.parse(Buffer.concat(chunks).toString()); if (!body || typeof body.listed !== 'boolean') throw Error('Sichtbarkeit fehlt.'); replay = validateReplay(body.replay); }
        catch (error) { throw fail(422, 'invalid_replay', error.message); }
        if (body.listed && !replay.traffic) throw fail(422, 'traffic_required', 'Für die Bestenliste muss Gegenverkehr aktiviert sein.');
        const canonical = JSON.stringify(replay);
        const digest = createHash('sha256').update(canonical).digest('hex');
        let row = db.prepare('SELECT id FROM flights WHERE digest=?').get(digest);
        if (!row) {
          const verified = await verify(replay);
          // Recheck after the asynchronous worker: concurrent duplicate submissions share one ID.
          row = db.prepare('SELECT id FROM flights WHERE digest=?').get(digest);
          if (!row) {
            row = { id: randomBytes(9).toString('base64url') };
            db.prepare('INSERT INTO flights VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(row.id, digest, canonical, replay.engine, replay.name, verified.distance, Number(body.listed), Number(replay.traffic), now);
          }
        }
        if (body.listed) db.prepare('UPDATE flights SET listed=1 WHERE id=?').run(row.id);
        send(200, { id: row.id, url: `${gameOrigin}/f/${row.id}` }); return;
      }
      throw fail(404, 'not_found', 'Nicht gefunden.');
    } catch (error) { send(error.status || 500, { error: error.code || 'internal_error', message: error.status ? error.message : 'Serverfehler.' }); }
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  server.on('close', () => { for (const worker of workers) worker.terminate(); db.close(); });
  return server;
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const server = createApi({ dbPath: process.env.DB_PATH || './data/flights.sqlite', gameOrigin: process.env.GAME_ORIGIN || 'https://potatoe.minizap.online', origins: (process.env.ALLOWED_ORIGINS || process.env.GAME_ORIGIN || 'https://potatoe.minizap.online').split(','), trustProxy: process.env.TRUST_PROXY === '1' });
  server.listen(Number(process.env.PORT || 3001), process.env.HOST || '127.0.0.1', () => console.log('MiniZap API listening', server.address()));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
}
