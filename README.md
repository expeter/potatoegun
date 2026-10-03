# Kartoffelkanone · Potato Cannon

A small browser game about launching a potato, making questionable engineering decisions, and trying again. Built with Canvas, native JavaScript modules and locally served assets. [Play the game](https://potato.minizap.online/). [Latest GitHub release](https://github.com/expeter/potatoegun/releases/latest).

## Develop

Use **Node.js 24.21 or later** for built-in SQLite. There is no npm install step or third-party application dependency.

```sh
sec-helper audit
node tools/serve.mjs
```

Open **http://localhost:8000**. The development server builds the static game and runs the API at `/api`; SQLite is stored in ignored `data/`. Restart after edits. If `sec-helper` is unavailable, record that limitation rather than claiming an audit passed.

## Build and verify

```sh
node tools/build.mjs
tools/check.sh
```

Publish **only `_site/`**. The fixed test wrapper builds and runs core/API/language/feed tests plus Chromium checks. Set `BROWSER_BIN` if Chromium is not detected; no browser is downloaded and no arbitrary commands are accepted. For a focused simulation check:

```sh
node --test --test-isolation=none tests/core.test.mjs
```

Use HTTP, not `file://`. For a frontend-only phone preview, serve the built `_site/` over your LAN and use the host's LAN address rather than the phone's `localhost`.

## Architecture

| Directory | Responsibility |
| --- | --- |
| `game/` | Canvas, UI, audio, local progress, sharing and installation hints |
| `shared/` | Canonical deterministic simulation, replay validation and PNG proof format |
| `api/` | Node HTTP service, SQLite and bounded replay-verification workers |
| `tools/` | Dependency-free build, development server and test wrapper |
| `deploy/` | Separate API runtime, deployment, backup and rollback |
| `docs/` | Architecture, feature specifications, workflow, tickets and privacy assessment |

GitHub Pages hosts the frontend. The MiniZap API supplies public rankings and short replay links. Progress belongs to the browser origin. Browser and server share the simulation so the API can reproduce runs; verification does not prove human play.

## Documentation

See the [documentation index](docs/README.md), [architecture](docs/architecture.md), [publishing guide](docs/publishing.md) and [API deployment guide](deploy/README.md). Detailed rules and balancing belong in [specifications](docs/specifications/game.md), keeping this introduction free of a walkthrough. Maintained documentation is English; the game supports German and English.

## Author and privacy

Made by **expeter / Pestivator** for MiniZap. Contact [minizap@les.bar](mailto:minizap@les.bar), [Twitch](https://twitch.tv/pestivator), or [Telegram @expeter](https://t.me/expeter). [Source repository](https://github.com/expeter/potatoegun).

**Buy me a coffee:** [PayPal](https://www.paypal.com/paypalme/expeter) or SOL on Solana:

```text
E684K1q1gzodtZK3xgdBXfTeRQbWWhSu8kVbzZNiw9Cz
```

[Phantom](https://phantom.com/download) is a recommended wallet: choose Send, paste the address above and use SOL on Solana. Support is optional and never unlocks gameplay benefits. The game's footer opens the same support choices.

The [legal notice](game/imprint.html) identifies the operator. The [privacy overview](game/privacy.html) describes local saves, automatic public record uploads and hosting requests. The [assessment](docs/privacy-review.md) records legal sources and remaining operator decisions. Shared author/contact conventions are [specified here](docs/specifications/minizap-about.md).

## License

[MIT](LICENSE), copyright © 2026 expeter. Retain copyright and license notices when redistributing. Bundled fonts retain their [SIL Open Font Licenses](game/assets/fonts/README.md).
