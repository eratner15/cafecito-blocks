# Customer Status Portal — Cafecito Block

> "Where is my order/project/request?" — a search-anything status portal with timeline, file uploads, and AI-written customer updates.

- **Live demo:** https://status.cafecito-ai.com/
- **Per-prospect instances:** https://status.cafecito-ai.com/`<prospect-slug>`/
- **Playbook:** https://cafecito-ai.com/new-hire/blocks/14-customer-status-portal
- **Pricing:** $2,500 setup · $400/mo · cancel anytime
- **Best fit:** law firms, home services, condo management, eviction PM, agencies — anyone whose customers ask "what's happening?"

## What it is

One Worker + one D1 table + one Claude prompt. The customer types their case/order/job ID (or their email/phone), sees a timeline of events, sees AI-written plain-English status, can upload files, can leave notes. Staff sees the same view plus admin actions.

Replaces three things at once:
- The "where's my project" email/text the customer sends three times a week
- The Slack DM to the project manager asking for status
- The painful "let me check with the team and get back to you" pause

## How to deploy a prospect instance

```
/cafecito:status <prospect-slug>
```

The skill reads the prospect from `/new-hire/prospects`, seeds D1 with 5-10 realistic records of the prospect's likely flow type, deploys at `https://status.cafecito-ai.com/<prospect-slug>/`, writes to INSTANCES KV, returns: live URL, takeover URL, draft cold-pitch.

## What's parameterized

Every block instance reads from its `prospect_slug` row:
- Business name + logo + brand color
- Record-type vocabulary (Case / Order / Project / Service Ticket / Permit / …)
- Stage list (Intake → Filed → Hearing → Judgment → Writ → Closed for eviction; Quote → Approved → In Progress → Complete for home services; etc)
- Customer-update tone (formal / warm / plain-spanish-on-request)
- Optional staff email + Twilio number for new-event SMS
