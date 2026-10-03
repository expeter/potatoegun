# MiniZap About, author and contact convention

Source: owner request, 2026-10-03. Implement in Kartoffelkanone; recommend for other MiniZap projects without editing them automatically.

## Identity and contacts

- Brand: MiniZap; author: expeter / Pestivator.
- Operator/data controller: Peter Schulz, Frommannstr. 14, 90419 Nürnberg, Germany. Owner supplied these details on 2026-10-03 and explicitly authorized reusing the les.bar imprint identity.
- Legal notice: `game/imprint.html`, linked from About, footer and privacy page.
- Email: `minizap@les.bar`.
- Twitch: `https://twitch.tv/pestivator`.
- Telegram direct contact: `https://t.me/expeter`.
- Repository: `https://github.com/expeter/potatoegun`; substitute the actual repository in other projects.
- PayPal.Me: `https://www.paypal.com/paypalme/expeter`. Public profile returned HTTPS 200 and identified Peter Schulz on 2026-10-03; no payment or account-status verification performed.
- Recommended wallet: `https://phantom.com/download`; ordinary outbound recommendation, no wallet connection or promised URI support.
- Solana: `E684K1q1gzodtZK3xgdBXfTeRQbWWhSu8kVbzZNiw9Cz`, checked against the public Lura author card on 2026-10-03. Use the official local Solana mark and a concise SOL label for one `solana:` action. Keep exactly one selectable address behind “Wallet address & help”; a wallet handler is optional. The helper explains manual Send/address/SOL for Phantom or another wallet.

Use one localized “Buy me a coffee” heading with quiet explanatory text. Equal compact PayPal and Solana-mark/SOL options replace the duplicated coffee/Solana presentation. No payment gate, tracking widget, remote avatar, wallet connection or game benefit. Ordinary outbound links use `noopener noreferrer`. Opening About must not request Twitch, Telegram or wallet services.

## Placement and release information

Small text links below main menu destinations and in the page footer open About/Privacy. A direct footer “Buy me a coffee” shortcut opens About, focuses the support heading and scrolls that section into view; preserve modal pause and input isolation. README includes the explicit Solana address and PayPal/Phantom links. Keep the author card inside About, without a toast, launch popup or prominent menu tile. Reuse dialog back/close/focus/pause/fullscreen behavior. Allow vertical scrolling on short screens, no horizontal scrolling. Wallet addresses wrap; controls support mouse, touch and keyboard in DE/EN.

About combines short author credit, optional support, contact/source links, current version, exact version-tagged GitHub release link and truthful update explanation: detection automatic, reload manual, no interrupted flights. Reuse the existing checker; do not add another poller.

Privacy combines a compact game summary with an independently accessible static page requiring neither gameplay nor JavaScript. Describe real storage, publication, recipients, retention, deletion limits and rights. An author alias does not replace legally required operator disclosures.

## Telegram announcements — proposed

Prefer one MiniZap broadcast channel for new games and releases. An optional linked discussion group can collect conversation; actionable requests still enter the inbox/ticket register. Announcements contain game, version, brief changes, play link and source/changelog.

Until the owner provides a real channel URL, label `Telegram · expeter` as direct contact. Do not invent or advertise a channel or send announcements. Channel creation needs the owner's Telegram account and an explicit follow-up; no Telegram account integration is available here.

## Acceptance

DE/EN, 320-pixel portrait, short landscape, menu/footer entry, Escape/back, no leaked game inputs, correct immutable email/wallet/repository, visible version and unchanged updates. Privacy copy must match code; unresolved legal facts stay in the assessment, not invented claims.

## Release publication

v0.9.1 is the first formal GitHub Release; preceding versions remain changelog history, without invented past releases. Publish tag `v0.9.1` at the exact tested/deployed commit. Link About to `/releases/tag/v__VERSION__` (resolved by both builders), and README to `/releases/latest`. Include concise release notes with play/source/docs, changes and actual validation. GitHub automatically supplies source ZIP/tarball; do not imply a downloadable native application. Release creation is a repository publication, distinct from Pages and API deployment.

Logo reference: [official Solana mark](https://solana.com/src/img/branding/solanaLogoMark.svg), fetched 2026-10-03, embedded locally without external requests. Preserve shape/gradient and clear spacing. Other asset licenses remain unchanged; this brand mark is not an original MIT game illustration.
