# Game implementation details

Internal maintenance reference moved out of the README. This describes shipped rules; it is not an introductory walkthrough. Code/configuration is authoritative for exact balancing.

## Input and session

Aim on the field, hold the pointer or charge button, release to launch. Keyboard arrows aim; hold/release Space to charge/shoot. Accessible activation toggles charge. Release fires exactly once even at the charge reversal or outside the button after capture loss. Escape, genuine pointer cancellation, blur, hidden tab or viewport resize cancel charge. Dialogs/hidden tabs pause flight; opening/closing them must not leak input into shooting.

New Space/touch/boost-button presses add flight impulse. Start with two charges, recharge on a survived UFO destruction up to two, with 0.8 simulation seconds between boosts. Holding does not consume every charge. Emergency detonation keeps loot and prepares a fresh charge. Closing the result prepares the next attempt; the result blocks gameplay but keeps top-right tools accessible. Browser default death view fits without internal scrolling on desktop. Fullscreen transitions close the modal menu first to avoid Chrome's inert-input state.

HUD displays distance, height, speed magnitude in m/s and material. The bottom-left pilot licence displays the current name and opens/highlights/selects menu name editing. It updates immediately and persists, sits above actions on narrow screens, and hides during results/replays.

## Simulation and rewards

Each attempt gets a fresh seed, small aim scatter and randomized launch load. Charge oscillates, with no trajectory preview or numeric launch sliders. Wind slowly changes before launch and is fixed throughout the flight; the flag is its only display. Sails amplify both favourable and adverse wind.

`CONFIG.launchRisk` is the risk authority: yellow load without protection has at most 3.5% launch destruction risk. Extreme load raises it without a guaranteed destruction threshold. Maximum-charge examples: about 75.5% unprotected, 39.3% with armour III, 19.2% additionally with tape III. Survived extreme launches cause damage; armour reduces it.

Static seeded debris groups span low/middle/high paths and additional sky lanes around 100/200/300 metres above prior groups. Larger gold nuts have greater value. Each item is collected once per attempt. Collected material survives destruction; distance and intact landing give separately displayed rewards.

Mushrooms, trampolines, scrap springs and potato toasters each grant one special impulse per object/flight; later contacts bounce normally. Hay slows/damps motion. Five fixed seeded updraft regions have irregular widths/heights/spacing, softly slow falling and taper in the upper quarter; fast rises get no extra lift. Each region lifts for at most five seconds per flight, then fades. Bounce-padding upgrades add limited trampoline impulses without endless loops.

Optional UFO traffic begins beyond the starting area. Side contact can damage; top contact launches upward. Destroyed UFOs tumble with smoke, briefly remain wrecks and can recharge boost. Toggle traffic in Help for the next flight. Launch recoil/muzzle flash and shell/eye/squash animations reflect motion. After the third ground bounce, rebound energy decays more; a bounce below 6 m/s upward transitions to rolling with horizontal friction. End as survived landing only once nearly still on the ground, never at the apex or mushroom launch.

Hard earth impacts plant one to three potatoes depending on speed. Plant sites need twelve metres separation; hay, mushrooms and repeated small contacts do not add plants. Crashes can plant. Per-flight gains settle once and join the local total; no shared garden or idle income. Milestones are 10/50/200 plants. Cosmetics can spend plants without reducing the lifetime achievement total.

## Progress and talents

Four branches, twelve talents, three ranks each, twenty concurrently allocated points maximum. Start at level 1 with one point; every 100 XP adds one level/point up to 20. XP keeps accumulating after the cap. Current test balancing halves rewards (round total rounded up): 30 base XP per completed attempt including failed launches, plus halved distance/loot/landing bonuses. Existing XP remains unchanged. Salvage talent adds 20% per rank to distance/landing XP. Settle every reward once.

| Branch | Linked talents |
| --- | --- |
| Tough shell | Armour → Tape → Emergency airbag |
| Flight | Gliding wings → Storm sails → Racing shell |
| Escalation | Bounce padding → Bounce amplifier → Can rocket |
| Loot | Scrap magnet → Loot bag → Salvage |

Two parent ranks unlock a successor. Alternate outer-node paths: airbag via tape or sails; racing shell via sails or bounce amplifier; rocket via bounce amplifier or loot bag; salvage via loot bag or tape. One valid path suffices. Rank selection activates all ranks up to the target if affordable; selecting an active rank removes it and higher ranks. Reject removal that strands dependent equipment and highlight affected nodes. Full refund is free. Allocation is locked during flight.

All twelve nodes appear in four coloured rows, with separate details containing effect, drawback, three individual rank targets and linked prerequisites. X/Escape returns exactly one level to the complete tree even after prerequisite jumps. XP is a growing potato bed; material is a collection/XP value, not talent currency.

Achievements persist locally after settlement; the unprotected extreme-launch achievement requires three survived flight seconds and is not lost by a later crash. Other milestones include debris, traffic, bounce combinations and garden growth. Statistics count launches immediately and detailed outcomes once at settlement. Do not fabricate historical crashes/UFO events; show the introduction date for detailed counters.

## Appearance and archived version

Goblin Garage and the original field are free scene choices. Clothing and landscapes use separate wardrobe tabs; lighting darkens the selected scene, while dialogs always keep a readable dark palette. Cosmetics never alter physics or hitboxes. Prior purchases remain. Three additional scrap-priced scenes are only [proposed](landscapes.md); do not add locked shop placeholders. Aircraft/space worlds are not exposed in the current game; old progress remains and new sessions start on the ground.

`game/variants/acker-v1/` intentionally preserves the original German game, graphics and rules. It is an archive, not a translated/current production client.

## Scores, cards and sharing

Names are at most 24 characters, saved locally, and copied into flight data at launch; previous records keep their names. Empty names use the localized pilot default. Homepage displays world Top 5; menu defaults to world Top 20, with separate device Top 5. “View all positions” opens world scores even after prior local selection. Public names are not authenticated.

World data comes from one visible-tab ten-second feed. First load, background/offline resume and failures stay quiet; deduplicate new IDs, batch bursts into one notice, no queue, one notice per ten seconds, hide after 5.5 seconds, back off to sixty seconds on failures. Toast stays within the field/fullscreen and never blocks controls.

Result and PNG card display local/global positions, tiny gold/silver/bronze cups only for 1–3. Local rank beyond retained five is honestly >5. Global rank counts all valid listed current-engine traffic flights, initially comparison/provisional, then confirmed by ID. Zero/unlisted/offline states never fabricate a number. Async rank responses redraw an open card using the same completed-flight snapshot, safely across competing card generations. Rank metadata is optional/version-compatible for old proofs.

Adaptive cards are 1200 px wide, 343–1600 px high. Wide cards place pilot/distance above a four-part full-width statistics band; narrow cards use portrait. The local/global row is one small band below distance, not more statistic tiles. Title is two-colour in DE/EN. The bottom 60 px carry the ID; remaining pixels are hashed. Preview and PNG regenerate together on rotation. Keep native sharing/copy/save actions reachable; legacy cards remain verifiable. Native share is simulated in browser checks and needs physical-device confirmation.

Dates use browser-local time and ISO datetime plus full timestamp tooltip. API timestamps come from server creation; new local records store settlement time. Old/invalid timestamps remain unknown, never inferred.

## Save compatibility

Schema is 3, key remains `kartoffelkanone.v2`. Store XP, allocation, material, distance/height records, garden totals, achievements, wardrobe, preferences and statistics. Migrate old attempts at 60 XP each, preserve prior equipment/point entitlement up to twenty, prioritize base nodes then dependents, and enforce prerequisites. Keep historical purchases as snapshots; excess ranks do not raise the cap. Retain prior-world data and original `kartoffelkanone.v1` save; mark old records as original v1 flights.

Stable ties retain order in device scores. Validate/sanitize stored data; malformed state falls back safely. Denied persistence keeps a session with a notice. Origin includes protocol/host/port: localhost and 127.0.0.1 have different saves. A separate bounded record queue survives reload/offline operation; clearing website data clears pending uploads but cannot remove server records.
