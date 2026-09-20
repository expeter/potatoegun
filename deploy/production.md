# Live API deployment — 2026-09-20

The frontend remains on GitHub Pages at `https://potatoe.minizap.online`. The API is live at `https://api.minizap.online`; `/health` returns `{"ok":true}`. This deployment did not push or publish frontend code. The tested query-link changes must reach the Pages branch before the new frontend flow is live.

## Isolation and layout

- VPS: existing `vpsionos` host, alongside les.bar and api.asgard.website.
- Service: `minizap-api.service`, user/group `minizap`, loopback `127.0.0.1:3001`.
- Runtime: `/opt/minizap/runtime/bin/node`, Node 24.18.0, copied from the existing tested local installation together with its license; checksum verified. No package installation or shared Node replacement. Blog's `/usr/bin/node` remains Node 20.19.2; other service runtimes unchanged.
- Active release: `/srv/minizap/current` → `releases/pages-api-v1`. Contains API, canonical shared modules, API tests and deployment templates. No environment secrets, frontend files or blog data copied.
- Database: `/var/lib/minizap/flights.sqlite`, persistent outside releases.
- Limits: MemoryMax=384M, CPUQuota=100% (one core), TasksMax=64; no-new-privileges, private temp and read-only system filesystem except service state.
- CORS: only `https://potatoe.minizap.online`. No auth cookies or API credentials required.
- Caddy: one appended API host pointing to port 3001. The original site blocks are byte-for-byte preserved. No change to frontend DNS, blog content or existing application units.

Runtime binary SHA-256: `41a74efb34cbde5c7632cdac0cf8bd1a14d0b8d73dc1e82755014d9a9ce70f5c`.
API release archive SHA-256: `6e7748a1388a841c1cdcbee7b6ae21922a9494033bf79994c5be056f14b5e4ab` (API/shared code plus deployment-time templates; later documentation and backup units are maintained in this repository).

## Verification

- sec-helper audit passed locally and on the extracted VPS release before project code execution. No third-party packages. Dependency-Audit: sec-helper.
- 66 core and four API integration tests passed locally; all four API tests also passed on the VPS. Full Chromium suite passed, including query-based replay links, installed-mode UI, sharing and network-failure fallback.
- The running Caddy JSON matched the pre-change disk configuration. Candidate configuration validated before a graceful reload; no stop/restart of Caddy or existing applications.
- lesbar, lura-api, midnight-feedback, midnight-online and caddy retained the same MainPID and ActiveEnterTimestamp before/after deployment.
- Endpoint baselines unchanged: les.bar/blog 200; api.asgard.website/health 200; /v2/me 200; GET /v2/feedback 404 (same existing behavior).
- Public API HTTPS health 200, game-origin CORS allowed, unrelated origin rejected. A verified deployment-test flight was saved and fetched through HTTPS with `listed:false`; it was not added to the public leaderboard.
- GitHub Pages game still returns HTTP 200.

## Backups and operations

`minizap-backup.timer` is enabled daily with up to 30 minutes jitter. It runs `minizap-backup.service` as the minizap user, using SQLite's online backup API. Snapshots are mode 0600 under `/var/lib/minizap/backups/`. The first snapshot completed successfully. No snapshot deletion is automated. An off-VPS backup destination and retention policy are not configured yet.

Deployment evidence is root-readable in `/srv/minizap/deployment-records/`: original Caddyfile/hash, original running Caddy JSON, candidate configuration, service identities and endpoint baselines. Never include these host snapshots in the public site.

For a code update, audit and test a new release, switch only the MiniZap current symlink and restart only minizap-api.service. Keep canonical replay engine revisions compatible with the Pages frontend. For rollback, switch back to the previous MiniZap release; do not alter other apps. To remove exposure, remove only the api.minizap.online block from the current Caddyfile, validate and gracefully reload. Do not blindly restore an old complete Caddyfile if other sites have changed in the meantime. Stop the MiniZap API/backup timer only if taking MiniZap out of service; preserve its database and snapshots.

Caddy's supported configuration-change procedure: [command-line reload documentation](https://caddyserver.com/docs/command-line#caddy-reload).
