# Privacy and legal assessment

Reviewed 2026-10-03 against current source. This is an implementation assessment, not a legal opinion or certification. Operator jurisdiction/identity and some operational policies remain unconfirmed. The public notice must be finalized after those facts are supplied.

## What the game actually does

| Data | Location and purpose | Current retention/removal |
| --- | --- | --- |
| XP, equipment, records, name, stats, appearance/preferences | Browser localStorage `kartoffelkanone.v2`; game continuity | Until website data is cleared or browser evicts it; old `kartoffelkanone.v1` may remain |
| Language choice | `minizap.language`; chosen UI language | Until cleared |
| Installation suggestion marker | `minizap.install-suggested`; avoid repeating prompt | Until cleared; not gameplay-critical, assess necessity separately |
| Pending replay uploads/completed digests | `minizap.record-sync.v1`; reliable record submission/deduplication | Up to 20 pending/200 completed, no fixed expiry; until sent/rotated/cleared |
| Canonical replay, display name, verified distance, engine, visibility, creation time/digest | MiniZap API SQLite; ranking and replay retrieval | No automatic age-based deletion exists; manual administration required |
| Client IP | In-memory API rate-limit map | One-minute window, expired entries removed on next request; no persistent IP column |
| Technical HTTP data including IP, headers/path/time | GitHub Pages and API reverse proxy/hosting | Provider/proxy policies; retention must be confirmed, not inferred from application schema |
| Daily database snapshots | Private API backup directory | Seven dated daily snapshots configured; copies/off-server backups require separate confirmation |
| Email/contact requests | Operator mailbox or selected third-party contact service | Policy not yet supplied |
| SOL donation | Public blockchain/recipient wallet | Public transaction history is not erasable by clearing game data |

Local fonts/artwork, no analytics/advertising SDK, no application cookies, no service worker. Browser language, viewport/input features and install-platform detection are used locally; a frontend user-agent upload is not part of the replay. HTTP clients still send ordinary request metadata. No request to a social/donation service occurs just by opening About.

Leaderboard is fetched automatically roughly every ten seconds while visible (shared requests, failure backoff); release metadata at least five minutes apart. Successful new personal ground records with traffic enabled are automatically uploaded; compatible prior local records/pending uploads can be recovered at startup. Manual sharing can upload an unlisted replay. Both listed and unlisted data can be retrieved by ID. Do not call an unlisted URL private.

## Consent banner: decision depends on behavior, not domain

The `.online` suffix does not impose a special EU cookie-banner rule. Applicability depends on operator/visitor jurisdiction and processing. In Germany, [TDDDG §25](https://www.gesetze-im-internet.juris.de/ttdsg/__25.html) covers storing/accessing information on terminal equipment, including technologies beyond cookies. Its strictly-necessary exception concerns a service explicitly requested by the user, not everything convenient to the operator. The [Lower Saxony authority FAQ](https://www.lfd.niedersachsen.de/download/177334/FAQ_TDDDG_nicht_vollstaendig_barrierefrei_.pdf) describes this distinction and warns against treating third-party or convenience functions as automatically exempt.

Inference for this implementation: a persistent game save and deliberately selected language can support a necessary-functionality assessment; absence of cookies alone is not an exemption. The automatic upload queue, installation marker and potentially unnecessary persistence need separate documented assessment. No analytics/ad/social embeds means a generic advertising cookie banner would not address the important current issue: automatic publication of replay/name data.

Do not claim “no banner legally required” without that assessment. If nonessential terminal storage is introduced, obtain consent before storage/access, with equal rejection/withdrawal. If necessary-only storage can be substantiated, clear information can be sufficient without a decorative banner. GDPR information/legal basis still apply separately.

## GDPR and hosting

[GDPR Articles 5, 6, 12–14 and 15–22](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679) require minimization/storage limits, a lawful basis, transparent information and applicable rights. A privacy notice needs the controller's identity/contact, purposes/bases, recipients/transfers, retention criteria, rights and complaint route. Browser save storage and processing of data sent to a host are separate assessments.

Security/HTTP delivery may support Article 6(1)(f) legitimate interests, subject to a documented balancing test. Record publication must have its own defensible basis; pseudonyms can still be personal data. Existing automatic submission is not an affirmative consent mechanism. Recommended follow-up: explicit optional publication with clear notice before the first upload, including legacy queued records, a way to withdraw/stop future publication, and particular care if consent from children is relied upon (Article 8/local age rules). This release documents existing behavior; it does not pretend to convert it into consent.

[GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) describes technical/service usage information and international transfers. Do not apply all github.com marketing-cookie descriptions to the custom Pages game or invent a Pages-specific IP retention period. Confirm provider role, any required DPA, recipient entities and transfer safeguards for the actual account/hosting arrangement. GitHub's statement is an additional recipient disclosure, not a replacement for the game's own notice.

The VPS runtime uses IONOS infrastructure according to the deployment record; confirm contracted entity/location, processor terms and Caddy/journal access logging before finalizing public retention/recipient text. Seven backups do not imply server records expire after seven days. Deletion must cover database, restore procedures and any independently retained backups.

## About versus legal notice

For a German operator, [DDG §5](https://www.gesetze-im-internet.juris.de/ddg/__5.html) can require operator name/address and electronic contact for covered businesslike services. A free game is not automatically exempt just because there is no purchase price; donation/project-promotion context warrants review. Other national/media-law duties may also apply. Domain suffix does not decide this. An author nickname, wallet and email are not a complete required imprint.

## Owner decisions still needed

1. Legal operator name, country/service address and whether operating privately or commercially; then finalize controller/Impressum information and applicable supervisory authority.
2. Basis for public record/replay processing and explicit publication choice, with treatment of legacy queue recovery and minors.
3. Real hosting recipients/locations/DPA/transfer arrangements, access-log retention, server-record retention, backup/offsite/mailbox retention and operational deletion verification.
4. Actual MiniZap Telegram channel URL/account owner if created. Current link is direct contact only.

No analytics, cookie platform, account service or Telegram automation was added. Do not describe the current local notice as complete legal compliance until these decisions are resolved.
