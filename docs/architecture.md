# Architecture

## Browser and simulation

`game/src/app.mjs` coordinates live sessions, dialogs, controls, rendering, progress and API access. UI modules format Canvas/DOM state; shared modules contain canonical rules. Browser compatibility re-exports preserve existing imports.

`shared/physics.mjs` advances deterministic state at 120 Hz. Seeded generation, launch data, equipment and tick-indexed actions define a flight independently of rendering rate. Dialogs and hidden tabs pause gameplay. Charge release and cancellation are distinct states.

Replays record simulation inputs and outcomes. Engine identity includes an explicit physics revision and configuration fingerprint. Bump the revision when simulation behavior changes; reject incompatible recordings rather than replaying with new rules. Cosmetics affect only rendering. PNG proofs bind pixels and recorded values; they are not authenticated scores.

## Storage and network

Progress uses localStorage key `kartoffelkanone.v2` (schema 3), preserving older saves. Separate keys store language, an installation hint and queued records. Saves are per origin/device; no account or cloud profile exists. Restricted storage degrades to session operation.

The API uses built-in Node HTTP, SQLite, crypto and workers. SQLite WAL lives outside release/public directories. Prepared statements store canonical replay JSON, digest, name, engine, distance, visibility and timestamp. Workers reproduce flights within resource limits. Current-engine traffic-enabled listed flights form rankings; unlisted flights remain retrievable by ID. Names are unauthenticated labels.

The API computes distance itself. Continuous outcomes allow an absolute 1e-6 portability tolerance; ticks/discrete outcomes remain exact. Per-process rate limits use transient IP entries; no IP column exists in the flight database. Limits do not prove human play or ownership.

Visible tabs share one world-score feed, polling about every ten seconds with backoff and no overlapping requests. The homepage shows five entries; the dialog twenty. Rank queries count all eligible flights. Updates use static `version.json`, no more often than every five minutes, and offer manual reload at a safe point.

## Delivery

`tools/build.mjs` copies game, shared modules and license into `_site/`, rewrites shared imports and applies build cache keys. Pages uses the commit SHA as build ID. Only `_site/` is published; tools, feedback, backend, environment and database files stay outside it.

The game is `https://potato.minizap.online/`; the VPS API is `https://api.minizap.online`, behind Caddy. Development uses same-origin `/api`. Unknown static hosts disable online features unless explicitly configured by meta tag. `?flight=` short links work on Pages; legacy fragment links remain supported.

No service worker, offline-play promise, external font service, analytics SDK or runtime package loader is present. Author links navigate only when followed. See [privacy](privacy-review.md) and [deployment](../deploy/README.md) for operational boundaries.
