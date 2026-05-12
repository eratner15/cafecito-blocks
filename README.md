# Cafecito Blocks

Sixteen sellable, deployable AI products — one repo, sixteen Cloudflare Worker apps. Each block ships as a parameterized template plus a deploy skill that spins up per-prospect instances. The salesperson clicks a block on https://cafecito-ai.com/new-hire, lands on a working demo, then runs `/cafecito:<name> <prospect-slug>` to mint a takeover URL.

## What's in here

```
blocks/
  voice/        # Bilingual Voice Receptionist     → voice.cafecito-ai.com
  intake/       # Smart Intake + Triage Form       → intake.cafecito-ai.com
  estimate/     # Quote / Estimate Generator       → estimate.cafecito-ai.com
  reviews/      # Review Response Bot              → reviews.cafecito-ai.com
  scan/         # AI Visibility / Citability Scan  → scan.cafecito-ai.com
  docs/         # Document AI Search               → docs.cafecito-ai.com
  reactivate/   # SMS Reactivation Agent           → reactivate.cafecito-ai.com
  outreach/     # Cold Outreach Engine             → outreach.cafecito-ai.com
  ops/          # Internal Ops Dashboard           → ops.cafecito-ai.com
  brand/        # Personal Brand Site + Booking    → brand.cafecito-ai.com
  orders/       # AI Order Desk                    → orders.cafecito-ai.com
  recovery/     # Missed Call Recovery             → recovery.cafecito-ai.com
  bilingual/    # Bilingual Conversion Layer       → bilingual.cafecito-ai.com
  status/       # Customer Status Portal           → status.cafecito-ai.com
  qa/           # AI Front Desk QA                 → qa.cafecito-ai.com
  form/         # Vertical Quote Form Rebuilder    → form.cafecito-ai.com

lib/            # Shared modules every block imports
  twilio.ts        # Outbound SMS + inbound webhook normalizer
  classifier.ts    # Claude intent/urgency/language/dollar-value extractor
  email.ts         # Resend wrapper + digest formatter + magic-link tokens
  vision-quote.ts  # Claude Vision → labor+materials → PDF
  google-places.ts # Reviews pull + author/date normalizer
  places-cards.ts  # KPI tile + status widget components
  copy-gen.ts      # Claude vertical-specific copy generator
  instances.ts     # Read/write INSTANCES KV registry
```

## Per-prospect instances

Each block deploys a canonical demo at `<subdomain>.cafecito-ai.com/` and seeds an in-memory showcase prospect. The deploy skill (in `~/.claude/skills/cafecito-blocks/`) creates per-prospect variants at `<subdomain>.cafecito-ai.com/<prospect-slug>/` and writes an entry to the `INSTANCES` KV namespace on the cafecito-ai Cloudflare account. The `/new-hire` block cards read INSTANCES KV at render-time to surface a live instance count.

## Mirror repos

`.github/workflows/mirror.yml` regenerates `eratner15/block-<name>` mirror repos on every push to `main`. Sales hands prospects the standalone mirror URL; engineers work in the monorepo.

## Chainability

```
/cafecito:chain garrido-hvac form,intake,voice,estimate
```

Runs four deploy skills sequentially against one prospect. One research pass, four INSTANCES entries, one cold-pitch email that references all four artifacts. The chain skill lives at `~/.claude/skills/cafecito-blocks/chain.md`.
