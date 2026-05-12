#!/usr/bin/env bash
# Add a prospect to the workboard via INSTANCES KV.
#
# Usage:
#   bash scripts/add-prospect.sh <slug> "<Business Name>" "<vertical>" "<city>" "<url>" "<notes>"
#
# Example:
#   bash scripts/add-prospect.sh ramirez-pool "Ramirez Pool Service" "Pool service" "Miami" "https://ramirezpool.com" "After-hours service line dumps to a personal cell; photo-quote workflow non-existent"
#
# After this runs, the new prospect appears at https://cafecito-ai.com/prospects
# immediately — no wrangler deploy needed. The page reads /_prospect/<slug> KV
# entries on every request and unions them with the hardcoded roster.

set -euo pipefail

if [ "$#" -lt 6 ]; then
  echo "Usage: bash scripts/add-prospect.sh <slug> \"<Business>\" \"<vertical>\" \"<city>\" \"<url>\" \"<notes>\"" >&2
  exit 1
fi

SLUG="$1"
BUSINESS="$2"
VERTICAL="$3"
CITY="$4"
URL="$5"
NOTES="$6"
NS="be84ff4be8374716ae15c62648bcf072"
NOW_MS=$(($(date +%s) * 1000))

# Sanity-check Miami-only (warning, not blocking)
if ! echo "$CITY" | grep -qiE "miami|aventura|hialeah|coral|brickell|kendall|doral|wynwood|little havana|south beach|miami beach|miami-dade|sweetwater"; then
  echo "⚠  warning: '$CITY' is not obviously in Miami-Dade — proceeding anyway." >&2
fi

source ~/.nvm/nvm.sh 2>/dev/null && nvm use 20 >/dev/null 2>&1 || true

tmpf=$(mktemp)
cat > "$tmpf" <<JSON
{
  "slug": "${SLUG}",
  "business": "${BUSINESS}",
  "vertical": "${VERTICAL}",
  "city": "${CITY}",
  "url": "${URL}",
  "notes": "${NOTES}",
  "added_at": ${NOW_MS},
  "source": "manual"
}
JSON

NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt npx wrangler kv key put \
  "_prospect/${SLUG}" \
  --path "$tmpf" \
  --namespace-id "$NS" \
  --remote >/dev/null

rm "$tmpf"

echo "✓ Added ${BUSINESS} (${SLUG}) to the workboard"
echo "  Now at: https://cafecito-ai.com/prospects (refresh)"
echo ""
echo "Next: pick suggested blocks + deploy:"
echo "  bash scripts/deploy-prospect.sh ${SLUG} <block1>,<block2> \"${BUSINESS}\""
