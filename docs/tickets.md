# Ticket register

Process: [workflow](workflow.md). Stable IDs are never reused. This English register consolidates historical completion evidence without changing its meaning. Original detailed acceptance/source records remain in the [immutable pre-cleanup register](https://github.com/expeter/potatoegun/blob/22560fcce7d734db26d6657c312f87bd5d8cf02a/docs/tickets.md). Captured feedback is source evidence, not implementation authorization.

| ID | Status | Scope | Source |
| --- | --- | --- | --- |
| CR-019 | Done | Compact payment choices and direct coffee support link | Owner chat 2026-10-03 |
| FR-011 | Ready for publication | First GitHub Release and version-specific release links | Owner chat 2026-10-03 |
| CR-018 | Done | English repository/docs cleanup and concise README | Owner chat 2026-10-03 |
| FR-010 | Done; legal finalization open | Secondary About author card and privacy/storage sections | Owner chat 2026-10-03 |
| SPEC-005 | Assessment/spec complete; operator decisions open | Shared MiniZap identity/contact and privacy assessment | Owner chat 2026-10-03 |
| SPEC-006 | Proposed | MiniZap Telegram announcement channel | Owner chat 2026-10-03 |
| CR-013 | Done | Taller browser field, result fits without scrolling | Chat 02.10.2026 |
| CR-017 | Done | Score timestamps and homepage list link | Chat 02.10.2026 |
| CR-016 | Done | Compact positions on shared card | Chat 02.10.2026 |
| CR-015 | Done | Pilot licence and direct name editing | Chat 02.10.2026 |
| CR-014 | Done | Local/global result positions | Chat 02.10.2026 |
| FR-009 | Done | Quiet world-record notifications | Chat 02.10.2026 |
| BUG-010 | Done | World scores on homepage | Chat 02.10.2026 |
| BUG-011 | Done | Two-colour share-card title | Chat 02.10.2026 |
| BUG-009 | Done | Release reliably shoots at charge reversal | Chat 02.10.2026 |
| BUG-008 | Done | Invisible modal blocked fullscreen input | Chat 02.10.2026 Chrome/Windows |
| BUG-007 | Done | Clickable fullscreen toolbar after a flight | Chat 02.10.2026 |
| BUG-001 | Done | Viewport changes and reachable controls | Inbox 085611 |
| CR-001 | Done | Consistent menus and action bar | Inbox 085855, 090216, 090322 |
| CR-002 | Done | Readable talent branches/prerequisites | Inbox 085535 |
| CR-003 | Done | Touch charge/shoot directly on the field | Inbox 085734 |
| FR-004 | Done; physical device check open | Homescreen launcher and installed layout | Chat 19.09.2026 |
| FR-003 | Done | Persistent flight statistics | Inbox 085535 |
| CR-004 | Done | Aligned talent cards and compact header | Follow-up inbox evidence |
| BUG-002 | Done | Dialog contrast independent of landscape | Follow-up inbox evidence |
| CR-005 | Done | Separate clothing and scenes | Follow-up inbox evidence |
| SPEC-004 | Done | API security review and remediation | Chat 20.09.2026 |
| SPEC-003 | Done | Isolated VPS API and Pages-compatible flight links | Chat 20.09.2026 |
| SPEC-002 | Done; historical device check open | Game/shared/API structure and launcher | Chat 20.09.2026 |
| SPEC-001 | Done | Plan three scrap-priced scenes | Follow-up inbox evidence |
| CR-006 | Done | Readable share card | Follow-up inbox evidence |
| CR-007 | Done | Complete talent overview without scrolling | Follow-up inbox feedback |
| CR-008 | Done | Large share-card values | Follow-up inbox feedback |
| BUG-003 | Done | Device scores and wardrobe menu | Follow-up inbox feedback |
| FR-007 | Done | DE/EN detection and language selection | Chat 20.09.2026 |
| FR-008 | Done | Build detection and safe manual update | Chat 20.09.2026 |
| CR-011 | Done; repository name retained | Correct game domain and version label | Chat 20.09.2026 |
| BUG-005 | Done; physical Samsung reproduction open | Automatic records and cross-device replay checks | Chat 20.09.2026 |
| BUG-004 | Done | Close talent details one level | Chat feedback |
| CR-009 | Done | Adaptive card fills available width | Chat feedback |
| FR-001 | Proposed | Harvest plants or grow bounce spots | [Backlog](backlog.md#fr-001--harvest-plants-or-grow-bounce-spots) |
| FR-002 | Proposed | Collection sprouts/beam during flight | [Backlog](backlog.md#fr-002--in-flight-collection-sprouts) |
| BUG-006 | Done | Global scores and installation in fullscreen | Historical chat evidence |
| CR-010 | Done | Full-width share-card statistics band | Historical chat evidence |
| CR-012 | Done | Global default and compact menu options | Historical chat evidence |
| FR-005 | Done | Player name in menu | Historical chat evidence |
| FR-006 | Done | Replay links and explicit talent import | Historical chat evidence |

## Historical verification and limits

Historical tests/commits are recorded in the linked baseline and [deployment record](../deploy/production.md); this cleanup does not claim to rerun historical device checks. Later completed VPS work supersedes the initial SPEC-002 deployment limitation. Native Android/iOS installation, actual target-app sharing and physical Samsung reproduction remain distinct from Chromium emulation.

v0.8.0: 96 module/API/language/feed tests and Chromium suite, no browser errors; exact all-entry ranks/ties verified read-only on VPS. v0.8.1: pilot tag, long/untrusted names as text, mouse/touch/Enter, focus/persistence/fullscreen and session pause verified. v0.8.2: 97 module tests, eight DE/EN adaptive PNG exports with proofs, four actual result-to-card paths and delayed global-rank redraw; old proofs compatible. v0.8.3: 98 module tests and full browser suite; UTC-to-Berlin score formatting, unknown old timestamps, persisted local timestamps and direct global navigation verified. No fresh sec-helper success claimed for these releases because the tool was unavailable; no dependency/runtime changes introduced.

## CR-018 — Documentation cleanup

Problem: README exposed detailed gameplay and stale local-only ranking statements; maintained specifications/workflow/history mixed languages.
Expected: short English introduction/build guide, implementation details under docs, navigation index, architecture, current baseline and preserved stable ticket/history references.
Scope: maintained prose only; source UI keys, immutable inbox evidence, licenses and archived game stay unchanged. Move future ideas to docs; preserve rules and known acceptance limitations. Do not remove tracked personal evidence or edit other MiniZap repositories.
Acceptance/checks: local documentation links resolve; active prose is English; instructions/architecture match build and code; detailed gameplay no longer dominates README. Existing core/API/browser suite remains unchanged in behavior.

## FR-010 — About and privacy

Expected: small secondary menu/footer entry; author/support/contact/source, current version and changelog; independent static privacy information and compact in-game summary. [Specification](specifications/minizap-about.md).
Acceptance/checks: DE/EN portrait/landscape/fullscreen, keyboard/back/close, wrapped wallet, actual links, no social/provider network calls merely opening About, unchanged flight/update behavior and standalone page without JavaScript.
Limit: notice documents existing automatic uploads; final legal controller/retention/basis decisions await owner facts. No invented channel URL, legal identity or compliance claim.

## SPEC-005 — Identity and privacy assessment

Contact specification completed from supplied handles and public Lura wallet. Primary legal sources in [assessment](privacy-review.md); domain suffix is not the legal consent criterion. Operator Peter Schulz, Frommannstr. 14, 90419 Nürnberg, Germany was confirmed by the owner on 2026-10-03 and added to the legal notice/privacy text. Processing basis and provider/log/record retention decisions remain unresolved. Do not mark legal finalization Done until these are resolved. Telegram remains proposed SPEC-006, not an account action.

## New ticket template

ID/title; status; source; problem/reproduction including device; expected behavior; scope; acceptance; check plan; verification and remaining limitations. Proposals require explicit implementation scope/authorization before work.

## Verification — v0.9.0 local candidate

98 module/API/language/feed tests and the full Chromium suite passed with zero browser errors. New checks cover real menu-to-About/privacy navigation, DE/EN, 1280×900 / 740×320 / 320×740, wallet wrapping, version/email, back/Escape, fullscreen, no embedded social/provider requests and standalone bilingual notice with scripting disabled. Extended existing five-size dialog layout checks include both new views. Relevant desktop/portrait screenshots visually reviewed; unsupported coffee/link glyphs replaced with local SVGs. Local documentation targets exist and diff whitespace checks pass. Actual Pages shell assembly was exercised in a temporary directory and includes privacy.html, matching release metadata and no backend/docs/environment files.

Audit limitation: sec-helper is not installed; no fresh audit success claimed. No dependency, runtime, physics, API, publication policy or production-service change. Candidate v0.9.0 is local; legal finalization remains under SPEC-005. Physical-device testing and Telegram channel creation were not performed.

## SPEC-005 follow-up — confirmed operator identity

Owner explicitly authorized the les.bar imprint identity: Peter Schulz, Frommannstr. 14, 90419 Nürnberg, Germany. Added the independently accessible bilingual legal notice, linked from About/footer/privacy, and updated both privacy languages and shared contact specification. Contact remains minizap@les.bar. No unrelated les.bar legal clauses or speculative company/tax details imported. Retention/publication-basis decisions remain open.

Verification: static build and actual Pages shell assembly passed; imprint/privacy contain the owner-confirmed address and mailbox, both privacy languages identify Peter Schulz, local page links resolve and both standalone notices work without scripts. No dependency/runtime/behavior change; sec-helper remains unavailable.

## CR-019 / FR-011 — Support polish and first formal release

Owner request: remove duplicated Solana presentation, use its icon, recommend Phantom, add the supplied PayPal.Me link, direct footer coffee access and explicit README address; next version becomes the first GitHub Release.
Scope: existing About/footer/docs, version v0.9.1 and exact-commit GitHub Release. No payment SDK, wallet connection, account login, test transaction, game/physics/API change or retroactive releases.
Acceptance: one PayPal and one Solana action, single expandable address, supplied recipient/profile and Phantom link, localized labels/accessibility, footer mouse/keyboard opens/focuses support without leaking into gameplay, no provider calls until navigation. Both builders resolve the exact release URL; actual GitHub Release tag must target the tested commit and Pages report that build.
Check plan: browser red/green footer shortcut and payment choices, existing responsive/fullscreen/translation suite, inspect screenshots, source/profile verification and public release/build checks.
Red check: all 98 module tests passed; new browser assertion failed specifically because the footer support entry was missing before implementation. Audit: sec-helper unavailable; no packages/runtime changes.

Green verification: 98 module/API/language/feed tests and the complete Chromium suite passed with zero browser errors. Real mouse and Enter footer navigation focuses support; DE/EN payment links, single wallet address, exact v0.9.1 release URL, no provider embeds and label bounds passed at 1280×900, 740×320, 390×844 and 320×740. Desktop/portrait screenshots reviewed; payment cards stack on narrow screens after a red wrapping check. Actual Pages shell assembly and local documentation links passed; diff whitespace clean. Publication is authorized; FR-011 awaits public Pages/release exact-commit verification after this candidate commit. No test payment or physical-device verification performed.
