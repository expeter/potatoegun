# FR-007 — German and English

Implemented v0.7.0; menu-only switch since v0.7.2. Repository name retained by owner request.

## Behavior

Choose the first supported language in ordered navigator.languages, including regional de/en variants; otherwise English. Saved manual choice wins. Denied storage permits session-only switching. Flags are local SVGs with visible DE/EN labels, accessible language names and pressed state; never rely only on colour/flags. English is a language choice, not a regional gate.

Switches appear only in the main-menu header. Other dialogs return there; no duplicate switches on the field/start screen. Switch without reload or losing flight/dialog/progress/name/equipment/record state. Keep physics, engine, API IDs and save key unchanged.

Translate start, menus, HUD, talents, achievements, wardrobe, results, scores, replay/share/install/error views and accessibility labels. Format numbers, units/plurals and document.lang. Player names and published content are not translated. New cards use current language; existing cards are immutable. Map known API errors with understandable unknown fallback. No translation service or extra network dependency.

`messages.mjs` maps stable German keys to English. `i18n.mjs` detects/saves choice, interpolates messages and updates static trusted markup. Protect name fields, score names, replay descriptions and raw proof data from translation. Rerender data-dependent views after switch. Links do not force recipient language. Archived v1 stays intentionally German; installed OS shortcut title may retain its original label.

## Acceptance

Ordered mixed/missing/regional browser lists, manual precedence and denied storage; keyboard/touch/mouse state; portrait/landscape/installed layouts; complete text inventory including About/privacy, cards and errors; no state loss during replay/flight/dialog switch. Distinguish Chromium emulation from native-device evidence. No extra languages, name translation, accounts, cloud sync, physics changes or separate language domains.
