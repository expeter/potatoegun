# MiniZap game and API — implementation specification

Status: implemented and locally verified, 2026-09-20. Scope: potato game only; no homepage, DNS changes or live deployment.

## Repository and delivery

- `game/`: HTML, CSS, manifest, browser modules, assets and archived variant.
- `shared/`: canonical deterministic physics, configuration, world generation, cosmetics, replay and proof modules. Browser and API use identical code; no simulation changes in this migration.
- `api/`: Node 24 HTTP service, SQLite persistence and bounded replay verification.
- `deploy/`: reverse-proxy, service and backup instructions for the VPS.
- `tools/`: dependency-free static assembly and local development server.
- `tests/`: existing core/browser checks plus API integration tests.
- `_site/`: generated static artifact containing game files and shared modules. Never publish repository root, API, database or environment files.

Keep existing browser module URLs through tiny re-export modules. Keep local-storage keys and legacy `#flug=` replay links. GitHub Pages remains a static-only deployment. VPS adds short links and API. No new third-party dependencies; run sec-helper audit before project code.

## Start screen and installation

A compact modal over the existing scene offers “Jetzt spielen” / “Weiterspielen”, personal best, installation, scores and help. Shared flight links bypass this screen. Starting a replay preserves local progress. Installed display modes hide installation UI. Native installation is offered only when the browser supplies beforeinstallprompt; otherwise show platform instructions. iPhone instructions explain Safari, Share, Add to Home Screen and Open as Web App. One dismissible suggestion appears after the first completed round; installation remains in the menu. No login or install gate. Offline caching is out of scope; do not promise offline play.

## HTTP contract

Namespace `/v1/potatoe`, JSON responses and stable error codes.

- `GET /health`: readiness.
- `POST /v1/potatoe/flights`: `{replay, listed: boolean}`. Validate and re-simulate before persisting. Return `{id, url}`. New personal ground records with traffic are submitted publicly without an extra click; sharing other flights stores an unlisted, publicly retrievable replay.
- `GET /v1/potatoe/flights/:id`: canonical replay and server-verified distance.
- `GET /v1/potatoe/leaderboard`: current-engine, traffic-enabled top 20 runs, ordered by distance, then creation time and ID. Names are display labels, not authenticated identities. Repeated identical submissions reuse the same ID; listing may promote an unlisted run.

IDs: 12 cryptographically random base64url characters. Public URLs: `https://potato.minizap.online/?flight=:id`. Store the full replay, engine revision, normalized player name, computed distance, visibility, timestamp and content digest. SQLite WAL, prepared statements, index for leaderboard, persistent data outside release directories.

Limit body size to 32 KiB, request duration, per-client requests, verification concurrency and verification wall time. Run replay simulation in a worker so HTTP remains responsive. Only trust forwarded client IPs with an explicit proxy setting; production listener binds loopback. Explicit CORS origin allowlist; no credentials. Validation rejects incomplete, incompatible and forged results. Continuous final values have a fixed absolute tolerance of 1e-6 for cross-engine Math approximations; ticks, action consumption and discrete outcomes remain exact. Scores always come from server simulation, never submitted distance. Existing engine identity and physics remain unchanged. This verifies reproducibility, not human play: synthetic valid runs and chosen seeds remain possible. No claim of competitive anti-cheat or account ownership.

## Browser/API integration

API base defaults to api.minizap.online only on the production game hostname; development server uses same-origin `/api`; static previews have API disabled. A meta tag can override the base URL.

Prepare a short link while the share dialog is open so native share retains its user gesture. On failure keep the existing self-contained link and explain the fallback. Automatically publish new personal ground records with traffic; remove the separate publish button. Retain at most 20 pending records in a separate local queue across reloads; retry transient failures with 1–15 minute backoff and process one per pass. Remember up to 200 successful/permanently rejected submissions to avoid repeated uploads. Recover the best compatible local traffic-enabled record on startup. Keep API-disabled previews local. Public rankings remain separate from local top five. Names and replays are public; explain automatic publication near the name input. Resolve `?flight=:id` (also accept `/f/:id` on self-hosted previews) to the existing replay preview; show loading/missing/offline errors with a path back to play. Use safe text rendering for server data. Preserve legacy link decoding.

## VPS

GitHub Pages serves `_site/` on potato.minizap.online. The existing VPS HTTPS proxy adds only api.minizap.online to loopback Node; other sites remain unchanged. Query-based short links need no rewrite. A systemd service runs as an unprivileged user with a persistent SQLite directory. Document DNS A/AAAA, certificate prerequisites, environment, static assembly, atomic release considerations, online SQLite backup/restore, engine compatibility and rollback. Do not publish or modify DNS in this task.

## Acceptance and verification

- Existing core and browser tests pass after the move; static artifact contains no server/data/secrets.
- API tests cover valid persistence/restart, deduplication, explicit listing, forged scores, invalid IDs, unsupported engines, CORS, body limits and ranking.
- Browser checks cover start screen, install fallback, short-link resolve/share and legacy/local behavior where feasible.
- sec-helper audit passes; no dependency installs required.
- Actual iOS/Android installation and live VPS/TLS remain deployment/device checks, explicitly documented.

References: https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html ; https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt ; https://support.apple.com/guide/iphone/iphea86e5236/ios

## Verification result

66 core tests, four API integration tests and the full Chromium suite passed. Browser coverage includes native-install prompt simulation, installed-mode hiding, compact entry layout, real API short-link loading, public listing, native sharing/copying and an injected network outage falling back to the legacy link. SQLite online backup restored successfully and passed integrity_check. Canonical simulation files are byte-identical to their original versions. sec-helper audit passed with no findings and no third-party packages. Desktop and phone screenshots reviewed. VPS API deployment/TLS was subsequently completed under SPEC-003; native device installation remains unperformed. No homepage changes.

## BUG-005 device replay verification

The previous JSON equality rejected even insignificant floating-point drift. A 100-seed test perturbs sin/cos/exp/hypot during simulation by one relative epsilon, restores normal Math for verification, and exercises formerly rejected results. This is a controlled reproduction of a numerical portability defect, not a physical Samsung test or confirmation of the exact reported flight. ECMAScript specifies [implementation-approximated Math results](https://tc39.es/ecma262/2025/multipage/numbers-and-dates.html#sec-math.sin). Discrete divergence remains rejected; do not relax collision/tick checks to hide larger mismatches.
