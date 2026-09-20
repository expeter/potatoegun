# Live API deployment — 2026-09-20

The frontend remains on GitHub Pages at `https://potatoe.minizap.online`. The API is live at `https://api.minizap.online`; `/health` returns `{"ok":true}`. Frontend commit `7cd008f` was subsequently pushed with explicit authorization; GitHub Pages deployment succeeded and serves the query-link flow.

## Isolation and layout

- VPS: existing `vpsionos` host, alongside les.bar and api.asgard.website.
- Service: `minizap-api.service`, user/group `minizap`, loopback `127.0.0.1:3001`.
- Runtime: `/opt/minizap/runtime/bin/node`, Node 24.21.0 after the security audit, selected through `/opt/minizap/runtime` → `runtime-24.21.0`. Installed through sec-helper on the VPS from the exact provisioning lockfile. No shared Node replacement. Blog's `/usr/bin/node` remains Node 20.19.2; other service runtimes unchanged.
- Active release: `/srv/minizap/current` → `releases/security-v1`. Contains API, canonical shared modules, API tests and deployment templates. No environment secrets, frontend files or blog data copied.
- Database: `/var/lib/minizap/flights.sqlite`, persistent outside releases.
- Limits: MemoryMax=384M, CPUQuota=100% (one core), TasksMax=64; empty capabilities, no-new-privileges, private devices/temp, kernel/namespace restrictions, loopback-only IP access and a denied connect syscall. State is mode 0700; code/runtime are root-owned.
- CORS: only `https://potatoe.minizap.online`. No auth cookies or API credentials required.
- Caddy: one appended API host pointing to port 3001. The original site blocks are byte-for-byte preserved. No change to frontend DNS, blog content or existing application units.

Current runtime binary SHA-256: `7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c`. Previous Node 24.18.0 runtime is retained at `/opt/minizap/runtime-24.18.0` for emergency rollback only; it predates security fixes.
Initial API release archive SHA-256: `6e7748a1388a841c1cdcbee7b6ae21922a9494033bf79994c5be056f14b5e4ab` (API/shared code plus deployment-time templates; later documentation and backup units are maintained in this repository).

## Verification

- sec-helper audit passed locally and on the extracted VPS release before project code execution. No third-party application libraries; one guarded Node binary provisioning package. Dependency-Audit: sec-helper.
- 66 core and four API integration tests passed locally; all four API tests also passed on the VPS. Full Chromium suite passed, including query-based replay links, installed-mode UI, sharing and network-failure fallback.
- The running Caddy JSON matched the pre-change disk configuration. Candidate configuration validated before a graceful reload; no stop/restart of Caddy or existing applications.
- lesbar, lura-api, midnight-feedback, midnight-online and caddy retained the same MainPID and ActiveEnterTimestamp before/after deployment.
- Endpoint baselines unchanged: les.bar/blog 200; api.asgard.website/health 200; /v2/me 200; GET /v2/feedback 404 (same existing behavior).
- Public API HTTPS health 200, game-origin CORS allowed, unrelated origin rejected. A verified deployment-test flight was saved and fetched through HTTPS with `listed:false`; it was not added to the public leaderboard.
- GitHub Pages game still returns HTTP 200.

## Backups and operations

`minizap-backup.timer` is enabled daily with up to 30 minutes jitter. It runs `minizap-backup.service` as the minizap user, using SQLite's online backup API. Snapshots are mode 0600 under `/var/lib/minizap/backups/`. The first snapshot completed successfully. The security update verifies each new snapshot and retains the newest seven matching dated snapshots, leaving unrelated files/symlinks alone. An off-VPS backup destination and retention policy are not configured yet.

Deployment evidence is root-readable in `/srv/minizap/deployment-records/`: original Caddyfile/hash, original running Caddy JSON, candidate configuration, service identities and endpoint baselines. Never include these host snapshots in the public site.

For a code update, audit and test a new release, switch only the MiniZap current symlink and restart only minizap-api.service. Keep canonical replay engine revisions compatible with the Pages frontend. For rollback, switch back to the previous MiniZap release; do not alter other apps. To remove exposure, remove only the api.minizap.online block from the current Caddyfile, validate and gracefully reload. Do not blindly restore an old complete Caddyfile if other sites have changed in the meantime. Stop the MiniZap API/backup timer only if taking MiniZap out of service; preserve its database and snapshots.

Caddy's supported configuration-change procedure: [command-line reload documentation](https://caddyserver.com/docs/command-line#caddy-reload).


## Security update verification

The security-v1 release archive SHA-256 is `4236f0be2819a5112a655f43ae6085bbb2d65154b90f7a0ac8af89bc2eb83207`. Twelve API tests passed on the VPS after the runtime audit; 78 core/API tests and Chromium passed locally. The existing database was backed up before switching releases and restarting only minizap-api. A fresh unlisted HTTPS replay exercised worker verification and persistence under the final service restrictions. The daily backup succeeded; the outbound-connect test returned EPERM. Caddy's file checksum, other service PIDs/start times and baseline HTTP statuses were unchanged.

The first copied-runtime audit failed installation verification. No service was switched at that point. `sec-helper install` then installed the exact locked runtime on the VPS; the installed-package audit passed before activation. No overrides or policy bypass were used.

Rollback evidence: `/srv/minizap/deployment-records/minizap-api.before-security.service`, `minizap-backup.before-security.service`, `release.before-security` and the security-before/after service snapshots. Previous release `pages-api-v1` remains available. A rollback to that release also requires its backup service unit because it lacks daily-backup.mjs; prefer retaining the patched runtime unless a proven runtime regression requires otherwise.

Full findings: [API security audit](../docs/security/api-audit-2026-09-20.md).
