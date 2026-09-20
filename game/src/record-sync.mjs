import { storedReplay } from '../../shared/replay.mjs';
import { sha256 } from '../../shared/share-proof.mjs';

const KEY = 'minizap.record-sync.v1';
// Independent of local scores: a later flight must not erase an unsent record.
export function createRecordSync({ storage, send, changed = () => {}, now = Date.now }) {
  let pending = [], completed = [], busy = false;
  try {
    const saved = JSON.parse(storage?.getItem(KEY) || 'null');
    completed = Array.isArray(saved?.completed) ? saved.completed.filter(x => typeof x === 'string').slice(-200) : [];
    pending = Array.isArray(saved?.pending) ? saved.pending.slice(-20).flatMap(item => {
      const replay = storedReplay(item.replay);
      return replay?.traffic && replay.result[5] > 0 ? [{ replay, key: sha256(JSON.stringify(replay)), next: 0, attempts: 0 }] : [];
    }) : [];
  } catch { /* Unavailable/corrupt storage must never stop a game. */ }
  function persist() {
    try { storage?.setItem(KEY, JSON.stringify({ pending, completed })); } catch { /* Still retry in this session. */ }
  }
  function enqueue(raw) {
    const replay = storedReplay(raw);
    if (!replay?.traffic || replay.result[5] <= 0) return;
    const key = sha256(JSON.stringify(replay));
    if (completed.includes(key) || pending.some(item => item.key === key)) return;
    // Keep the most recent personal records if offline for an unusually long time.
    pending.push({ replay, key, next: 0, attempts: 0 });pending = pending.slice(-20);persist();
  }
  async function flush() {
    if (busy) return;
    busy = true;
    try {
      // At most one upload per pass, safely below the API's per-minute limit.
      const item = pending.find(item => item.next <= now());
      if (!item) return;
      changed(item.replay, 'checking');
      try {
        await send(item.replay);
        pending = pending.filter(other => other !== item);
        completed.push(item.key);completed = completed.slice(-200);
        changed(item.replay, 'saved');
      } catch (error) {
        if ([400, 403, 413, 422].includes(error.status)) {
          pending = pending.filter(other => other !== item);
          // Keep rejection visible, but do not repeatedly upload invalid flights.
          completed.push(item.key);completed = completed.slice(-200);
          changed(item.replay, 'rejected', error.message);
        } else {
          item.attempts++;
          item.next = now() + Math.min(900000, 60000 * 2 ** Math.min(item.attempts - 1, 4));
          changed(item.replay, 'waiting');
        }
      }
      persist();
    } finally { busy = false; }
  }
  return { enqueue, flush };
}
