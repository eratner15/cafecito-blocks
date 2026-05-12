#!/usr/bin/env bash
# Deploy a per-prospect chain in 60 seconds — pure KV writes, no wrangler deploy.
#
# Usage:
#   bash scripts/deploy-prospect.sh <prospect-slug> <block1>,<block2> "<Business Name>" [decision-maker-email]
#
# Example:
#   bash scripts/deploy-prospect.sh tracy-bakery orders,form "Tracy Bakery" orders@tracybakery.com
#
# Writes one INSTANCES KV entry per block + a _chains/<slug> meta record.
# After this completes, https://<block>.cafecito-ai.com/<prospect-slug>/ goes
# live immediately (no wrangler deploy — handlers read overrides at request time).
#
# Requires: wrangler authed (OAuth or token in env), Node 20.

set -euo pipefail

if [ "$#" -lt 3 ]; then
  echo "Usage: bash scripts/deploy-prospect.sh <slug> <block1>,<block2> \"<Business>\" [email]" >&2
  echo "  blocks: voice|intake|estimate|reviews|scan|docs|reactivate|outreach|ops|brand|orders|recovery|bilingual|status|qa|form" >&2
  exit 1
fi

PROSPECT_SLUG="$1"
BLOCKS_CSV="$2"
BUSINESS_NAME="$3"
EMAIL="${4:-info@example.com}"
NS="be84ff4be8374716ae15c62648bcf072"
NOW_MS=$(($(date +%s) * 1000))

declare -A BLOCK_SLUG
BLOCK_SLUG[voice]="01-bilingual-voice-receptionist"
BLOCK_SLUG[intake]="02-smart-intake-triage"
BLOCK_SLUG[estimate]="03-quote-estimate-generator"
BLOCK_SLUG[reviews]="04-review-response-bot"
BLOCK_SLUG[scan]="05-ai-visibility-citability-scanner"
BLOCK_SLUG[docs]="06-document-ai-search"
BLOCK_SLUG[reactivate]="07-sms-reactivation-agent"
BLOCK_SLUG[outreach]="08-cold-outreach-engine"
BLOCK_SLUG[ops]="09-internal-ops-dashboard"
BLOCK_SLUG[brand]="10-personal-brand-site-booking"
BLOCK_SLUG[orders]="11-ai-order-desk"
BLOCK_SLUG[recovery]="12-missed-call-recovery"
BLOCK_SLUG[bilingual]="13-bilingual-conversion-layer"
BLOCK_SLUG[status]="14-customer-status-portal"
BLOCK_SLUG[qa]="15-ai-front-desk-qa"
BLOCK_SLUG[form]="16-vertical-quote-form-rebuilder"

# Node toolchain
source ~/.nvm/nvm.sh 2>/dev/null && nvm use 20 >/dev/null 2>&1 || true

IFS=',' read -ra BLOCKS <<< "$BLOCKS_CSV"
deployed=()

for sub in "${BLOCKS[@]}"; do
  sub="${sub// /}"
  block_slug="${BLOCK_SLUG[$sub]:-}"
  if [ -z "$block_slug" ]; then
    echo "skip: unknown block '$sub'" >&2
    continue
  fi

  tmpf=$(mktemp)
  cat > "$tmpf" <<JSON
{
  "block_slug": "${block_slug}",
  "prospect_slug": "${PROSPECT_SLUG}",
  "demo_url": "https://${sub}.cafecito-ai.com/${PROSPECT_SLUG}/",
  "takeover_url": "https://${sub}.cafecito-ai.com/${PROSPECT_SLUG}/",
  "status": "live",
  "deployed_at": ${NOW_MS},
  "prospect": {
    "name": "${BUSINESS_NAME}",
    "decision_maker_email": "${EMAIL}"
  },
  "overrides": {
    "business": "${BUSINESS_NAME}"
  }
}
JSON
  NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt npx wrangler kv key put \
    "${block_slug}/${PROSPECT_SLUG}" \
    --path "$tmpf" \
    --namespace-id "$NS" \
    --remote >/dev/null
  rm "$tmpf"
  deployed+=("${sub}")
  echo "  ✓ ${sub}.cafecito-ai.com/${PROSPECT_SLUG}/"
done

# Chain meta record
tmpf=$(mktemp)
blocks_json=$(printf '"%s",' "${deployed[@]}")
blocks_json="[${blocks_json%,}]"
cat > "$tmpf" <<JSON
{
  "prospect_slug": "${PROSPECT_SLUG}",
  "business_name": "${BUSINESS_NAME}",
  "blocks": ${blocks_json},
  "created_at": ${NOW_MS}
}
JSON
NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt npx wrangler kv key put \
  "_chains/${PROSPECT_SLUG}" \
  --path "$tmpf" \
  --namespace-id "$NS" \
  --remote >/dev/null
rm "$tmpf"

echo ""
echo "✓ Chain deployed for ${BUSINESS_NAME} (${PROSPECT_SLUG})"
echo "✓ INSTANCES KV entries written: ${#deployed[@]} blocks + 1 chain meta"
echo ""
echo "Live demo URLs:"
for sub in "${deployed[@]}"; do
  echo "  https://${sub}.cafecito-ai.com/${PROSPECT_SLUG}/"
done
echo ""
echo "Workboard: https://cafecito-ai.com/prospects"
