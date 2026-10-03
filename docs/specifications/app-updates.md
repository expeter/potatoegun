# FR-008 — App updates

Implemented in v0.7.0. Static web app, no service worker, downloaded executable or forced reload.

## Release source and delivery

`game/version.json` stores visible version and local build ID. Build substitutes HTML metadata/labels; Pages uses commit SHA, local builds use the file ID. Publish version JSON with matching HTML/CSS/modules. Query-version all imports in src/shared plus entry scripts/styles so a newly opened build does not mix old cached modules.

## Behavior

Check at startup, pageshow, visible-tab return, reconnect and visible periodic ticks. Minimum five minutes between checks; one request at a time. Fetch no-store with a time query and eight-second timeout. Ignore offline/HTTP/JSON errors and invalid formats. Same build is quiet; announce each different build once per session, including rollbacks.

Short notice/update button in start and game menus, plus a quiet toast. No automatic navigation. Disable while charging/flying or replaying a suspended live flight. Recheck safety on click, persist progress and replace current URL with `_v=<build>`. Preserve flight query/hash, language, origin-local saves and pending uploads.

## Verification

Pure tests cover language preference, placeholders, same/different/invalid releases, network errors, cooldown and concurrency. Browser tests cover visible notices, paused-flight lock, actual manual reload with unchanged save/language. Inspect artifact metadata and all import cache keys. Legacy v0.6.0 requires one manual reload to acquire the checker.
