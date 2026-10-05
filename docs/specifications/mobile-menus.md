# Menus and responsive layouts

Welcome uses a top-right close action with music beside it and a consistent Play now CTA, regardless of saved attempts. Closing returns focus to the cannon. Background music waits for the first actual shot in each loaded page; pre-shot settings, navigation and charging do not start it. Music and effects preferences remain independent and persistent (CR-021).

Initial evidence: six inbox captures, 2026-09-19. BUG-001, CR-001–003 and FR-003 establish reachable controls and consistent panels. Later tickets supersede initial tabbed talent designs and omitted fullscreen controls.

Dark aubergine, warm cream text, orange primary actions, mint active state. Consistent padding, corners, headings, toolbar/back/close across all views. One question per view; vertical scrolling only where necessary, accessible actions, targets at least 44 px. Long translated words and player names wrap within their own containers.

Field: compact tools, centred charge/boost/detonation actions; holding directly on the field also charges. Main menu exposes talents, wardrobe, achievements, global/device scores, statistics and help. Fullscreen and installation controls are in the menu; language only in its header. Secondary About/privacy text links sit below primary destinations. Every subdialog returns to menu; closing resumes the flight. Closing talent details returns exactly to tree, including after prerequisite jumps.

Current talent tree (CR-007) displays twelve nodes in four coloured rows/three columns, no required panning/tab switching. Details show effect, drawback and three ranks with 44 px targets, plus linked prerequisites and labelled alternative paths. Level/XP/free points persist in header; reset is a separate header action. No currency/system rewrite. Overview/details usable at 740×320 without scroll. Compact spacing (CR-012) must not compromise touch targets.

Statistics uses known legacy attempts/plants and new event counters only since introduction; do not estimate old UFO/crash values. Resize updates visible viewport, cancels charging and rearranges cards/dialogs without losing progress/live flight.

Dialog palette stays independent of scene (BUG-002). Wardrobe separates clothing/scenes (CR-005). Share preview gets remaining area under actions (CR-006). Adaptive PNG and preview rotate together; four large stats use full-width horizontal band in landscape and readable portrait layout. Test 667×375, 740×320, 924×412, 932×430, 390×844 and 320×740. Keep legacy proof support. Original CR-010 requires at least 20 CSS px statistic labels in those views; browser verification also records actual sizes and width utilization.

Fullscreen transition closes modal menu before requesting fullscreen (BUG-008), reinstating menu on denial. Toolbar stays mouse-accessible after flight; result must not cover tools (BUG-007). Browser field is tall enough for default death view without inner scrolling (CR-013).

Design references: [WoW talent preview](https://news.blizzard.com/en-us/article/23797209/world-of-warcraft-dragonflight-talent-preview), [WoW talents](https://worldofwarcraft.blizzard.com/en-us/news/23865972/), [Diablo IV grouping](https://news.blizzard.com/en-us/article/23583664/diablo-iv-quarterly-updatedecember-2020). Inference: make prerequisites/directed connections visible and group related nodes. No borrowed assets. Early branch tabs were an intermediate approach, superseded by the complete overview.

No new abilities, idle systems or backlog implementation. Planned scenes remain [SPEC-001](landscapes.md), not locked shop placeholders.
