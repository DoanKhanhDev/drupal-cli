#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<EOF
Usage: install.sh [--no-install]

Options:
  --no-install Skip running `npm install` (assume deps are present)
  -h, --help   Show this help
EOF
  exit 1
}

NO_INSTALL=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-install) NO_INSTALL=true; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown argument: $1"; usage ;;
  esac
done

command -v npm >/dev/null 2>&1 || { echo "Error: npm not found in PATH." >&2; exit 2; }

if [ "$NO_INSTALL" = false ]; then
  echo "Installing npm dependencies..."
  npm install
fi

echo "Building TypeScript..."
if npm run | grep -q " build"; then
  npm run build
else
  # fallback to tsc if present
  if command -v tsc >/dev/null 2>&1; then
    tsc -p tsconfig.json
  else
    echo "No build script or tsc available. Install devDependencies or run build manually." >&2
    exit 3
  fi
fi

CLI_DIST="dist/cli.js"
if [ ! -f "$CLI_DIST" ]; then
  echo "Build artifact not found: $CLI_DIST" >&2
  exit 4
fi

# Ensure shebang exists
if ! head -n1 "$CLI_DIST" | grep -q '^#!'; then
  echo "Adding shebang to $CLI_DIST"
  tmpfile="$(mktemp)"
  echo '#!/usr/bin/env node' > "$tmpfile"
  cat "$CLI_DIST" >> "$tmpfile"
  mv "$tmpfile" "$CLI_DIST"
fi

chmod +x "$CLI_DIST"

echo "Installing globally (may require sudo)..."
if npm install -g .; then
  echo "Installed globally."
else
  echo "Global install failed; try running with sudo:" >&2
  echo "  sudo npm install -g ." >&2
  exit 5
fi

echo "Done. Run 'drupal-cli --help' to verify."
