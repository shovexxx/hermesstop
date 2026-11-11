#!/usr/bin/env bash
# hermesstop installer — copies the desktop plugin into $HERMES_HOME/desktop-plugins/hermesstop
set -euo pipefail

HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
DEST="$HERMES_HOME/desktop-plugins/hermesstop"
REPO_RAW="https://raw.githubusercontent.com/shovexxx/hermesstop/main"
SRC_DIR="${BASH_SOURCE[0]:-}"
SRC_DIR="${SRC_DIR%/*}"

mkdir -p "$DEST"

if [ -n "${SRC_DIR:-}" ] && [ -f "$SRC_DIR/plugin.js" ]; then
  cp "$SRC_DIR/plugin.js" "$DEST/plugin.js"
else
  # Piped (curl | bash): download from the repo
  command -v curl >/dev/null || { echo "curl required"; exit 1; }
  curl -fsSL "$REPO_RAW/plugin.js" -o "$DEST/plugin.js"
fi

echo "hermesstop installed to $DEST/plugin.js"
echo "In the Hermes desktop app press Ctrl/Cmd+K -> 'Reload desktop plugins' if it was already running."
