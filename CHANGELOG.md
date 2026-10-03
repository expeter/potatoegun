# Changelog

## v0.9.2 — 2026-10-03

- CR-020: Aligned desktop footer text and links; shortened menu/footer entry to About. Solana address has a copy action with inline success and manual-selection fallback when clipboard access is unavailable. Narrow layouts keep wrapped address text and accessible controls.

## v0.9.1 — 2026-10-03

- CR-019: Simplified About support into PayPal and Solana-icon/SOL options, one expandable wallet address and a Phantom recommendation. Direct footer coffee shortcut focuses the support section; README includes the wallet address.
- FR-011: First formal GitHub Release, with version-tagged About link and README latest-release link. Prior versions remain changelog history.
- Public PayPal.Me profile checked against Peter Schulz; no test payment performed. Updated external-payment privacy disclosure.

## v0.9.0 — 2026-10-03

- SPEC-005 follow-up: Owner-confirmed Peter Schulz operator/address in privacy information and bilingual legal notice, accessible from About/footer/privacy.

- CR-018: Concise English README, docs index, architecture and current feature specifications; detailed rules moved out of the introduction. English workflow/ticket register and release history preserve stable IDs and historical evidence.
- FR-010: Secondary About/privacy menu/footer links, optional SOL coffee support, email/Twitch/Telegram/source links, version and changelog. Static bilingual storage/privacy overview works without the game or JavaScript.
- SPEC-005: Shared MiniZap author/contact convention and sourced privacy assessment. Operator/legal policy details remain open. Telegram announcements remain a proposal; no channel created.

## v0.8.3 — 2026-10-02

- CR-017: World/new local score timestamps in browser-local time with exact tooltip; old undated records stay unknown. Homepage link opens global Top 20.

## v0.8.2 — 2026-10-02

- CR-016: Small shared local/global rank row, coloured Top-3 cups, clear provisional/offline states, late-rank redraw and rank proof metadata.

## v0.8.1 — 2026-10-02

- CR-015: Pilot licence at bottom left; opens/highlights name editing, updates immediately, supports DE/EN and small screens.

## v0.8.0 — 2026-10-02

- CR-014: Local/global result ranks, Top-3 cups and exact all-entry rank query; separate provisional, verified and unranked states.
- FR-009: Quiet world-record notices, six phrases and batched bursts, one visible-tab ten-second feed with backoff.
- BUG-010: Homepage uses worldwide Top 5 from shared API; device records stay separate.
- BUG-011: Two-colour wordmark on exported cards in both languages.

## v0.7.5 — 2026-10-02

- BUG-009: Releases before/at/after charge reversal shoot exactly once, including outside-button/capture-loss cases; actual cancellations still cancel.

## v0.7.4 — 2026-10-02

- CR-013: Taller browser field, compact header/result; desktop death view fits without inner scrolling.
- BUG-008: Close modal before fullscreen so Chrome does not block input; restore menu on denied fullscreen.

## v0.7.3 — 2026-10-02

- BUG-007: Top-right tools remain mouse-accessible after a flight in fullscreen; result leaves toolbar room while blocking gameplay.

## v0.7.2 — 2026-10-02

- BUG-006 / CR-012: Global default scores with separate device view, aligned entries, fullscreen/installation in menu, menu-only language choice and compact talents.

## v0.7.1 — 2026-10-02

- Shared wrapping menu headers and long translated labels/names remain inside their containers. Added fixed local test wrapper.

## Earlier releases

- FR-007 / v0.7.0: DE/EN, browser detection, saved manual language; translate UI/cards/numbers without changing names or replays.
- FR-008 / v0.7.0: Detect builds and offer safe manual updates; versioned resources, retained progress/language, no live-flight reload.
- CR-011 / v0.6.0: Correct domain to potato.minizap.online; transitional CORS allows old/new game addresses; menu version label.
- BUG-005: Automatic new personal traffic-enabled ground records, bounded persistent retry queue and tiny floating-point portability tolerance; exact inputs/discrete results and server-derived scores remain required.
- SPEC-004: Storage/backup/upload/worker limits, wind/talent validation, generic JSON errors; isolated Node 24.21.0 via sec-helper, private data and additional systemd confinement. VPS update checked without changing other apps.
- SPEC-003: Isolated VPS API, resource limits, persistent SQLite/daily backups; static frontend on Pages and query-based short links.
- SPEC-002: Split game/shared/API/deploy, dependency-free artifact and development server, entry/installation hints, bounded verified replay API and backup tests. Initial explicit publication was later superseded by BUG-005 automatic records.
- Test balancing: Extra sky debris lanes, halved new XP rewards with existing progress retained, compact score actions and closable results.
- FR-006: Versioned deterministic replay links, separate viewing session, explicit affordable talent import, native share and copy/text fallbacks.
- CR-010: Nearly full-width mobile card preview with large distance/statistics band; six mobile sizes and PNG proofs checked.
- FR-005: Locally saved player name captured at launch; old records retain names.
- BUG-004 / CR-009: Talent close returns one level; adaptive landscape/portrait card and rotating preview/PNG, legacy proof support.
- CR-007 / CR-008 / BUG-003: Complete talent overview replaces branch tabs; large card values/emblem, device Top 5 and wardrobe accessible on mobile.
- CR-004 / BUG-002 / CR-005 / CR-006: Aligned talents/header reset, scene-independent dialog contrast, clothing/scene tabs, readable card/actions with proof ID retained.
- SPEC-001: Three future scrap-priced cosmetic scenes specified, not implemented.
- FR-004: Homescreen manifest/icons/installed fullscreen-landscape preference, tested in Chromium. Physical Android installation remains open; no offline cache/APK.
- BUG-001 / CR-001–003 / FR-003: Viewport-responsive field/dialogs, consistent comic menus, talent prerequisites, direct touch charging and once-per-flight persistent stats. Original tab/fullscreen decisions later superseded by follow-up tickets.
- Local project inbox/SPEC workflow added; FR-001/002 registered as proposals only.

Original release evidence and detailed historical descriptions remain in [the pre-cleanup history](https://github.com/expeter/potatoegun/blob/22560fcce7d734db26d6657c312f87bd5d8cf02a/CHANGELOG.md). Earlier gameplay is maintained in [game details](docs/specifications/game-details.md).
