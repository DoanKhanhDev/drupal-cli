#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
ORIGINAL_PWD="$(pwd)"

# If script is being piped via curl, $0 may not point to the repo; do not cd yet.


usage() {
  cat <<EOF
Usage: install.sh [--no-install] [--tag <tag>] [--archive-url <url>]

Options:
  --no-install     Skip running `npm install` (assume deps are present)
  --tag <tag>      Download a specific GitHub tag (e.g. v1.0.0)
  --archive-url    Download a specific tar.gz archive URL
  -h, --help       Show this help
EOF
  exit 1
}

NO_INSTALL=false
TAG=""
ARCHIVE_URL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-install) NO_INSTALL=true; shift ;;
    --tag) TAG="$2"; shift 2 ;;
    --archive-url) ARCHIVE_URL="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown argument: $1"; usage ;;
  esac
done

command -v npm >/dev/null 2>&1 || { echo "Error: npm not found in PATH." >&2; exit 2; }

install_from_dir() {
  local dir="$1"
  echo "Installing from directory: $dir"
  cd "$dir"

  if [ "$NO_INSTALL" = false ]; then
    echo "Installing npm dependencies..."
    npm install
  fi

  echo "Building TypeScript..."
  if npm run | grep -q " build"; then
    npm run build
  else
    if command -v tsc >/dev/null 2>&1; then
      tsc -p tsconfig.json
    else
      echo "No build script or tsc available. Install devDependencies or run build manually." >&2
      return 3
    fi
  fi

  CLI_DIST="dist/cli.js"
  if [ ! -f "$CLI_DIST" ]; then
    echo "Build artifact not found: $CLI_DIST" >&2
    return 4
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
    return 0
  else
    echo "Global install failed; try running with sudo:" >&2
    echo "  sudo npm install -g ." >&2
    return 5
  fi
}

# Determine installation source: prefer current working directory if it contains package.json,
# then script's directory, otherwise download from GitHub repo (default).
TARGET_DIR=""
if [ -f "$ORIGINAL_PWD/package.json" ]; then
  TARGET_DIR="$ORIGINAL_PWD"
elif [ -f "$ROOT_DIR/package.json" ]; then
  TARGET_DIR="$ROOT_DIR"
else
  # Download from GitHub by default
  REPO_OWNER="DoanKhanhDev"
  REPO_NAME="drupal-cli"
  tmpdir=""
  echo "No local package.json found; will download ${REPO_OWNER}/${REPO_NAME} into a temporary directory"

  if [ -n "$ARCHIVE_URL" ]; then
    tmpdir="$(mktemp -d)"
    echo "Downloading archive URL: $ARCHIVE_URL"
    if curl -fsL "$ARCHIVE_URL" | tar -xzf - -C "$tmpdir" --strip-components=1; then
      echo "Downloaded archive from $ARCHIVE_URL"
      TARGET_DIR="$tmpdir"
    else
      echo "Failed to download archive from $ARCHIVE_URL" >&2
      rm -rf "$tmpdir"
      exit 6
    fi
  elif [ -n "$TAG" ]; then
    tmpdir="$(mktemp -d)"
    archive_url="https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/tags/${TAG}.tar.gz"
    echo "Downloading tag archive: $archive_url"
    if curl -fsL "$archive_url" | tar -xzf - -C "$tmpdir" --strip-components=1; then
      echo "Downloaded and extracted tag '$TAG'."
      TARGET_DIR="$tmpdir"
    else
      echo "Failed to download tag '$TAG' from $archive_url" >&2
      rm -rf "$tmpdir"
      exit 6
    fi
  else
    tmpdir="$(mktemp -d)"
    for branch in main master; do
      archive_url="https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/heads/${branch}.tar.gz"
      echo "Trying $archive_url"
      if curl -fsL "$archive_url" | tar -xzf - -C "$tmpdir" --strip-components=1; then
        echo "Downloaded and extracted branch '$branch'."
        TARGET_DIR="$tmpdir"
        break
      else
        echo "Branch $branch not found, trying next..."
      fi
    done

    if [ -z "$TARGET_DIR" ]; then
      echo "Failed to download repository ${REPO_OWNER}/${REPO_NAME}." >&2
      rm -rf "$tmpdir"
      exit 6
    fi
  fi
fi

install_from_dir "$TARGET_DIR"
rc=$?

# If we downloaded into a tempdir, clean up
if [ -n "$tmpdir" ] && [ -d "$tmpdir" ]; then
  rm -rf "$tmpdir"
fi

echo "Done. Run 'drupal-cli --help' to verify."
exit $rc
