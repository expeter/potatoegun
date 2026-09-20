# VPS deployment

The API is deployed on the existing VPS; the frontend is hosted by GitHub Pages at potatoe.minizap.online. MiniZap homepage is outside this repository. See [live deployment record](production.md).

## Runtime and local checks

Node 24.18+ (with built-in node:sqlite), no npm packages. `node:sqlite` may print its experimental API warning on Node 24. Provision Node/Caddy using your normal VPS administration process; dependency additions must follow sec-helper policy.

From repository root:

```sh
sec-helper audit
node --test tests/core.test.mjs tests/api.test.mjs
node tools/build.mjs
node tools/serve.mjs
```

Open http://localhost:8000. Development stores SQLite in ignored `data/`. The development server binds loopback and serves the assembled artifact; rebuild/restart after editing. `PORT` and `DB_PATH` are optional. For frontend-only preview, serve `_site/`; set `<meta name="minizap-api" content="">` to disable online features on localhost. A nonempty meta value overrides the API base for staging.

## Production setup

1. Keep `potatoe.minizap.online` configured as the GitHub Pages custom domain. Only `api.minizap.online` points to the VPS. Add API AAAA only if IPv6 is configured and reachable.
2. Allow inbound 80/443 for Caddy certificates and HTTPS. Do not expose port 3001. Append the included API-only site block to the existing Caddy configuration; never replace other site blocks. Back up, validate and gracefully reload. Check existing services and routes before and afterwards. GitHub Pages serves all frontend files.
3. Create an unprivileged `minizap` service user/group. Place releases in `/srv/minizap/releases/<revision>` and point `/srv/minizap/current` to the selected release. Run audit and API tests before activating a release. Frontend static assembly stays in GitHub Pages CI. Do not copy `.env`, `data/`, `.git/` or inbox captures into the public directory.
4. Install `minizap-api.service` into `/etc/systemd/system/`; use the dedicated `/opt/minizap/runtime/bin/node` runtime. Do not upgrade the shared system Node used by other applications. systemd creates `/var/lib/minizap`. Enable/start the service, then load the Caddy configuration. TLS is handled by Caddy after DNS resolves.
5. Check `/health` on the API domain, play and share a flight, open its `/?flight=<id>` URL in another browser, and explicitly publish a score. Test HTTPS installation on physical Android and iPhone devices.

The API trusts the final X-Forwarded-For value only with TRUST_PROXY=1. Use this only with the loopback binding and a directly connected trusted reverse proxy. Do not enable general proxy trust on a public listener. CORS defaults to the game origin; `ALLOWED_ORIGINS` is a comma-separated list. It is not an authentication or anti-bot mechanism.

Sharing uploads an unlisted but publicly retrievable replay; publishing lists it publicly. There are no user accounts, deletion UI or ownership claims. Verification proves simulation consistency, not human play. Monitor storage growth and abuse; request limits are per-process, not a distributed quota. Operational removal can use parameterized SQLite administration while preserving backups.

## Backups and rollback

Use the SQLite online backup API, not a copy of the live main file (WAL may contain committed data):

```sh
node api/backup.mjs /var/lib/minizap/flights.sqlite /secure-backups/flights-2026-09-20.sqlite
```

Run as a user that can read the database and write the backup directory. The live VPS has `minizap-backup.timer` enabled for daily online snapshots under `/var/lib/minizap/backups/`. The matching service runs as minizap; create that directory with minizap ownership and mode 0700 before installing the timer. No automatic deletion is configured. Monitor space and arrange retention and an off-VPS copy; the timer alone does not protect against VPS loss. Protect backups because they include player-submitted data. Test restore into a temporary path and run `PRAGMA integrity_check` before relying on a backup.

Restore: stop the API; move the existing database plus any `-wal`/`-shm` sidecars aside together; copy the backup to DB_PATH with minizap ownership and mode 0600; start and check a known link. Do not restore over a running database.

Deploy frontend and API with compatible shared-engine code. GitHub Pages requires short IDs in `?flight=` query parameters so the root HTML returns HTTP 200; `/f/*` rewrites are not available there. Legacy long hash links still work. Frontend changes must be explicitly pushed before Pages publishes them. Switch the release symlink and restart the API; browsers holding older modules may need to reload. Roll back the symlink and restart for code-only changes. Back up before future schema migrations; this initial schema only creates tables/indexes.

Replay engine revisions remain in stored records. Leaderboards show only the current engine. Older incompatible links show an explanation; supporting historical simulation engines is future work. Keep the `.online` origin stable if `.games` is acquired: local browser saves and installed app identity do not automatically migrate across origins.

Dependency-Audit: sec-helper
