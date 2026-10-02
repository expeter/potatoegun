#!/bin/sh
# Fixed local checks; no command or argument passthrough.
set -eu
if [ "$#" -ne 0 ]; then
  echo 'Usage: tools/check.sh (no arguments)' >&2
  exit 2
fi
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
if [ -z "${BROWSER_BIN:-}" ]; then
  if [ -x /tmp/chromium ]; then
    BROWSER_BIN=/tmp/chromium
    if [ -d /tmp/al2023/lib ]; then
      LD_LIBRARY_PATH="/tmp/al2023/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
      export LD_LIBRARY_PATH
    fi
    if [ -z "${FONTCONFIG_PATH:-}" ] && [ -f /tmp/fonts/fonts.conf ]; then
      FONTCONFIG_PATH=/tmp/fonts
      export FONTCONFIG_PATH
    fi
  elif command -v chromium >/dev/null 2>&1; then
    BROWSER_BIN=$(command -v chromium)
  elif command -v chromium-browser >/dev/null 2>&1; then
    BROWSER_BIN=$(command -v chromium-browser)
  else
    echo 'Set BROWSER_BIN to an installed Chromium executable.' >&2
    exit 1
  fi
fi
export BROWSER_BIN
SCREENSHOT_DIR=${SCREENSHOT_DIR:-/tmp/potato-menu-check}
export SCREENSHOT_DIR
node tools/build.mjs
node --test tests/core.test.mjs tests/api.test.mjs tests/language-updates.test.mjs tests/leaderboard-feed.test.mjs
node tests/browser.mjs
