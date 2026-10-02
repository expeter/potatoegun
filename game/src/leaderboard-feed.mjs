// One shared snapshot for the homepage, ranking dialog and quiet record notices.
export function createLeaderboardFeed({ fetchScores, changed = () => {}, announce = () => {}, active = () => true, now = Date.now, interval = 10000 }) {
  let state = { scores: [], initialized: false, loading: false, error: false };
  let pending = null, last = -Infinity, failures = 0, silent = true, invalidated = false;
  let lastNotice = -Infinity, variant = 0;
  const seen = new Set();
  function publish(next) { state = next; changed(state); }
  function remember(scores) {
    for (const score of scores) seen.add(score.id);
    while (seen.size > 256) seen.delete(seen.values().next().value);
  }
  function refresh() {
    if (!active()) { silent = true; return Promise.resolve(state); }
    if (pending) return pending;
    if (now() - last < Math.min(60000, interval * 2 ** failures)) return Promise.resolve(state);
    last = now();
    publish({ ...state, loading: true });
    pending = Promise.resolve().then(fetchScores).then(body => {
      if (!Array.isArray(body?.flights)) throw Error('Invalid leaderboard');
      const ids = new Set();
      const scores = body.flights.slice(0, 20).filter(score => {
        if (!score || !/^[\w-]{12}$/.test(score.id) || typeof score.name !== 'string' || !Number.isFinite(score.distance) || score.distance < 0 || ids.has(score.id)) return false;
        ids.add(score.id); return true;
      }).map(score => ({ ...score, name: Array.from(score.name.replace(/[\u0000-\u001f\u007f]/g, '')).slice(0, 24).join('') })).sort((a, b) => b.distance - a.distance);
      const fresh = scores.filter(score => !seen.has(score.id));
      const previousBest = state.scores[0]?.distance ?? 0;
      const notify = state.initialized && !silent && active() && fresh.length && now() - lastNotice >= interval;
      remember(scores); failures = 0;
      publish({ scores, initialized: true, loading: false, error: false });
      if (notify) {
        lastNotice = now();
        announce({ score: fresh[0], count: fresh.length, worldBest: fresh[0].distance > previousBest, variant: variant++ % 6 });
      }
      silent = !active();
      return state;
    }).catch(() => {
      failures = Math.min(3, failures + 1); silent = true;
      publish({ ...state, loading: false, error: true });
      return state;
    }).finally(() => {
      pending = null;
      if (invalidated) { invalidated = false; last = -Infinity; void refresh(); }
    });
    return pending;
  }
  return {
    refresh,
    pause() { silent = true; },
    resume() { silent = true; return this.invalidate(); },
    invalidate() {
      if (pending) { invalidated = true; return pending; }
      last = -Infinity; return refresh();
    },
    snapshot: () => state,
  };
}
