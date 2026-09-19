# Publishing

The game is a static site with no server, package installation, or compilation step. GitHub Pages can host the game, replay links, card verification, fonts, and install manifest at **https://expeter.github.io/potatoegun/**. Saved games remain local to each browser and origin.

## Initial setup

1. On GitHub Free, make `expeter/potatoegun` public. Review tracked files and history before changing visibility; local feedback in `inbox/` is tracked even though it is excluded from the deployed site. Paid plans can also support Pages from private repositories.
2. In **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**.
3. Push to `main`, or run **Actions → Publish game → Run workflow**.

The publishing workflow packages only `index.html`, `verify.html`, both stylesheets, `manifest.webmanifest`, `src/`, `assets/`, and `variants/`. It excludes `.env`, Git history, tests, tools, and feedback. It uses pinned official GitHub actions and the built-in temporary `GITHUB_TOKEN`; no personal token or VPS SSH key belongs in workflow secrets.

Pull requests build the artifact without deploying. Pushes to `main` and manual runs publish it through the `github-pages` environment. To roll back, revert the relevant commit and push the revert to `main`.

The workflow only copies files: it does not install dependencies or execute project code. Before local tests, run `sec-helper audit`, then `node --test --test-isolation=none tests/core.test.mjs`. If compilation or dependencies are added later, integrate `sec-helper` into CI before executing project code or installing packages.

GitHub Pages hosting requires no VPS or Caddy changes. The existing les.bar and api.asgard.website configuration can stay as it is.

## License

A license is not a prerequisite for building or publishing your own work. MIT is an option if you want to permit reuse, modification, and commercial distribution with attribution. Choose a license separately from hosting; this setup does not assign one. The fonts retain their bundled SIL Open Font License notices.

References: [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [MIT license](https://choosealicense.com/licenses/mit/).
