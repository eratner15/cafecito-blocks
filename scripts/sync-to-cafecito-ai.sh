#!/usr/bin/env bash
# Vendor cafecito-blocks lib + per-block handlers into the cafecito-ai
# worker source tree so wrangler can bundle them.
#
# Canonical source: /home/eratner/cafecito-blocks/
# Deploy target:    /home/eratner/cafecito-ai/new-hire/blocks/handlers/
#
# Run after editing any blocks/<name>/src/handler.js or any lib/*.js:
#   bash scripts/sync-to-cafecito-ai.sh
# Then from cafecito-ai/: npx wrangler deploy

set -euo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)"
DST="/home/eratner/cafecito-ai/new-hire/blocks/handlers"
mkdir -p "$DST"

# Lib modules
mkdir -p "$DST/lib"
cp -f "$SRC"/lib/*.js "$DST/lib/"
echo "synced: lib/* → $DST/lib/"

# Per-block handlers (only those that have a src/handler.js)
for d in "$SRC"/blocks/*/; do
  name="$(basename "$d")"
  if [ -f "$d/src/handler.js" ]; then
    cp -f "$d/src/handler.js" "$DST/$name.js"
    echo "synced: blocks/$name/src/handler.js → $DST/$name.js"
  fi
done
echo "done."
