# Key West Guidebook — for Nikki

> A two-night family guide to Key West: the best restaurants (with an adult menu **and** a kids menu on each), an interactive map of where everything sits, and a plan for the first night, the next day, and the next night.

- **Live page:** https://cafecito-ai.com/keywest/  (also serves at https://keywest.cafecito-ai.com/)

## What it is

One Cloudflare Worker handler, one self-contained HTML page. No KV, no D1, no API keys.

The guidebook has four parts:

1. **The plan** — three itinerary cards (First night → Day two → Second night), each a timed list of stops. Sunset-first arrival night, a full sightseeing day paced around the midday heat, and a waterfront dinner to close.
2. **The map** — an interactive Leaflet + OpenStreetMap map. Every restaurant (coral pins) and attraction (teal pins) is plotted so you can see what sits near what. Filter buttons focus on just restaurants or just sights. Any "View on map" button anywhere on the page recenters the map and opens that pin.
3. **Where to eat** — seven restaurant cards. Each card carries a toggle between an **Adult menu** and a **Kids menu**, plus a "good to know" note (waits, cash, reservations).
4. **Things to do** — eight attractions and beaches, each with a travelling-with-a-kid note.

## How it routes

`handleKeywest` serves the full guidebook on any `GET`/`HEAD` request, so it works whether the worker is mounted at a `keywest.cafecito-ai.com` subdomain or routed at the `cafecito-ai.com/keywest/` path.

## Editing the content

All content lives in plain data arrays at the top of `src/handler.js`:

- `RESTAURANTS` — name, location, coordinates, the "why", a "good to know" line, plus `adult` and `kids` menu item lists.
- `ATTRACTIONS` — sights and beaches with coordinates and a kid note.
- `ITINERARY` — the three-part plan; a stop's optional `mapId` wires its "View on map" button to a pin.
- `NOTES` — the practical-tips footer.

Add a restaurant or attraction and it shows up in its section **and** on the map automatically — the map markers are derived from the same arrays.

> Menus and prices are a representative sample. Key West kitchens change with the catch and the season; confirm the latest before the trip.
