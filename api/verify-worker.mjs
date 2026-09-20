import { parentPort, workerData } from 'node:worker_threads';
import { startReplay, advanceReplay } from '../shared/replay.mjs';
try {
  const session = startReplay(workerData);
  while (!session.done) advanceReplay(session);
  if (!session.matches) throw Error('Das Ergebnis stimmt nicht mit der Wiederholung überein.');
  parentPort.postMessage({ ok: true, replay: session.data, distance: session.flight.distance });
} catch (error) { parentPort.postMessage({ ok: false, message: error.message }); }
