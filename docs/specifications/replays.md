# FR-006 — Flight links and replays

Record angle, energy, seed, wind seed/time/value, traffic, talent ranks, name, landscape and appearance. Successful boosts and emergency detonations use integer 120 Hz ticks, never wall time, pauses or frame rate.

Device Top 5 stores recordings. Keep old records without complete inputs: offer their equipment but never fabricate a replay. Self-contained links use UTF-8/base64url URL fragments and current game address; no upload required. LAN URLs only work on that LAN. Optional short links use the [API](minizap-api.md).

Opening a link shows preview/player/distance/equipment. Explicit replay starts a separate session, pauses a live flight and restores it on exit. Replays grant no launches, records, XP, material/plants and ignore live controls. Restart/exit remain reachable in fullscreen.

Explicit “Use talents” replaces allocation only if affordable/valid, never during a live flight or replay. No level/cosmetic grants; opening/viewing does not import. Native share uses link and optional PNG when supported, otherwise link-only/copy/save. Clipboard denial shows selectable text. Share cancellation is quiet; recipient apps may discard part of combined content.

## Compatibility and limits

`REPLAY_ENGINE` in `shared/replay.mjs` combines explicit physics revision with config fingerprint. Increment revision after simulation changes. Reject incompatible recordings; compare full outcome after playback and report mismatch. Local consistency is not server authentication.

Validate size/types/ranges/ordered inputs/actions before playback. At most thirty minutes, 256 successful actions, 32,000 encoded characters. Longer runs remain playable and may share image/normal game URL. New actions require recorder, versioned dispatcher and determinism tests.

## Verification

Compare full outputs/actions at 30/60/144 Hz, launch destruction and first/last-tick detonation. Browser: persisted replays, URL loading without profile change, explicit imports, blocked live input, restored live sessions, fullscreen/mobile, share/clipboard fallbacks. Native share is mocked; target apps need device tests.
