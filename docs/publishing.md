# Publishing

The game frontend is static; the optional replay/highscore API is a separate VPS service. No third-party packages are required. GitHub Pages can host the game, replay links, card verification, fonts, and install manifest at **https://expeter.github.io/potatoegun/**. Saved games remain local to each browser and origin.

## Initial setup

1. On GitHub Free, make `expeter/potatoegun` public. Review tracked files and history before changing visibility; local feedback in `inbox/` is tracked even though it is excluded from the deployed site. Paid plans can also support Pages from private repositories.
2. In **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**.
3. Push to `main`, or run **Actions → Publish game → Run workflow**.

The publishing workflow packages the public contents of `game/`, `shared/` and `LICENSE`, adjusting shared-module imports for the static layout. It excludes `.env`, Git history, tests, tools, and feedback. It uses pinned official GitHub actions and the built-in temporary `GITHUB_TOKEN`; no personal token or VPS SSH key belongs in workflow secrets.

Pull requests build the artifact without deploying. Pushes to `main` and manual runs publish it through the `github-pages` environment. To roll back, revert the relevant commit and push the revert to `main`.

The workflow copies files and normalizes relative import paths: it does not install dependencies or execute project code. Before local tests, run `sec-helper audit`, then `node --test --test-isolation=none tests/core.test.mjs`. If compilation or dependencies are added later, integrate `sec-helper` into CI before executing project code or installing packages.

GitHub Pages hosting requires no VPS or Caddy changes. For MiniZap VPS hosting, see [deployment instructions](../deploy/README.md). GitHub Pages retains local play and legacy replay links; production short URLs require the VPS `/f/*` rewrite and API.

## License

The project uses the [MIT license](../LICENSE), Copyright (c) 2026 expeter. Copies or substantial portions must retain the copyright and permission notice. MIT permits reuse, modification, and commercial distribution; it does not require an on-screen credit or backlink. The publishing workflow includes `LICENSE` in the deployed site. The fonts retain their bundled SIL Open Font License notices.

References: [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [MIT license](https://choosealicense.com/licenses/mit/).
