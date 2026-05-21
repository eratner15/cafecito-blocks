// Key West Guidebook — for Nikki
//
// A single-page, self-contained trip guide:
//   GET  /  (any path) → the full guidebook
//
// Plans a 2-night family visit (first night → day two → second night),
// highlights the best restaurants with an adult AND a kids menu on each,
// and plots every restaurant + attraction on an interactive map so you can
// see what sits near what.
//
// No imports, no KV, no API keys. The map uses Leaflet + OpenStreetMap
// tiles loaded by the visitor's browser. Designed to be served either at
// keywest.cafecito-ai.com/ or routed at cafecito-ai.com/keywest/.

const RESTAURANTS = [
  {
    id: 'el-meson-de-pepe',
    name: 'El Meson de Pepe',
    cuisine: 'Cuban',
    meals: 'Lunch & dinner',
    area: 'Mallory Square · 410 Wall St',
    lat: 24.5601, lng: -81.8069,
    tag: 'First-night pick',
    why: 'Sitting right on Mallory Square, this is the easiest possible first-night dinner — walk off the Sunset Celebration and straight to a table. Live salsa on the patio, generous Cuban plates, and a kids menu that actually exists.',
    know: 'Gets slammed right after sunset — put your name in before the sun goes down. Portions are big; plan to share.',
    adult: [
      { n: 'Ropa Vieja', d: 'Shredded beef in creole sauce, rice & beans', p: '$27' },
      { n: 'Lechón Asado', d: 'Slow-roast pork, black beans, sweet plantains', p: '$25' },
      { n: 'Paella de Mariscos', d: 'Shrimp, mussels, fish & calamari', p: '$34' },
      { n: 'Cuban Sandwich', d: 'Roast pork, ham, Swiss, pickle, mojo', p: '$16' },
      { n: 'Plátanos Maduros', d: 'Sweet fried plantains', p: '$7' },
    ],
    kids: [
      { n: 'Chicken Fingers & Tostones', p: '$9' },
      { n: 'Mini Cuban Sandwich', p: '$8' },
      { n: 'Arroz con Pollo (kid portion)', p: '$9' },
      { n: 'Flan', p: '$5' },
    ],
  },
  {
    id: 'blue-heaven',
    name: 'Blue Heaven',
    cuisine: 'Bahamian-Caribbean',
    meals: 'Breakfast & dinner',
    area: 'Old Town · 729 Thomas St',
    lat: 24.5500, lng: -81.8031,
    tag: 'Day-two breakfast',
    why: 'A walled tropical courtyard where roosters strut between the tables and a six-toed cat might claim the chair next to you. It is loud, green, and pure Key West — the kid is entertained before the food even arrives.',
    know: 'No reservations and a famous wait. Arrive by 8 AM or come for an early dinner. Bring a hat for the courtyard sun.',
    adult: [
      { n: 'Lobster Benedict', d: 'Poached eggs, Florida lobster, lime hollandaise', p: '$26' },
      { n: 'Caribbean BBQ Shrimp', d: 'Over yellow rice', p: '$32' },
      { n: 'Jerk Chicken', d: 'Slow-cooked, plantains, black beans', p: '$28' },
      { n: 'Blackened Yellowtail Snapper', d: 'Catch of the day', p: '$36' },
      { n: 'Key Lime Pie', d: 'The mile-high meringue', p: '$11' },
    ],
    kids: [
      { n: 'Buttermilk Pancakes', p: '$8' },
      { n: 'Grilled Chicken & Rice', p: '$9' },
      { n: 'Cheeseburger & Fries', p: '$10' },
      { n: 'Warm Banana Bread', p: '$5' },
    ],
  },
  {
    id: 'pepes-cafe',
    name: "Pepe's Cafe",
    cuisine: 'American breakfast & diner',
    meals: 'Breakfast, lunch & dinner',
    area: 'Historic Seaport · 806 Caroline St',
    lat: 24.5609, lng: -81.8003,
    tag: 'Breakfast (the easy alternative)',
    why: "Key West's oldest restaurant — open since 1909 — and where the locals eat breakfast. A shady, tree-covered patio, strong coffee, and zero fuss. This is your move if the Blue Heaven line looks brutal.",
    know: 'Breakfast runs all morning. Patio seating is first-come and mornings move quickly.',
    adult: [
      { n: 'Eggs Benedict', d: 'Classic, with home fries', p: '$16' },
      { n: "Pepe's Scramble", d: 'Eggs, peppers, onion, cheese', p: '$15' },
      { n: 'Apalachicola Oysters', d: 'Half dozen, on ice', p: '$18' },
      { n: 'Steak Sandwich', d: 'Grilled onions, hand-cut fries', p: '$19' },
      { n: 'House Bloody Mary', d: 'For the grown-up morning', p: '$11' },
    ],
    kids: [
      { n: 'Pancake Stack', p: '$8' },
      { n: 'Scrambled Eggs & Bacon', p: '$8' },
      { n: 'Grilled Cheese & Fruit', p: '$7' },
    ],
  },
  {
    id: 'bos-fish-wagon',
    name: "B.O.'s Fish Wagon",
    cuisine: 'Seafood shack',
    meals: 'Lunch & dinner',
    area: 'Old Town · 801 Caroline St',
    lat: 24.5608, lng: -81.8005,
    tag: 'Day-two lunch',
    why: 'Looks like it was assembled from driftwood and good intentions — because it mostly was. Order the famous square-grouper sandwich at the window, grab a picnic table, and let the kid gawk at the wandering chickens. Peak Key West character.',
    know: 'Cash is king, seating is picnic-table, and the vibe is gloriously messy. Lunch is the easy hit.',
    adult: [
      { n: 'Square Grouper Sandwich', d: 'Fried grouper — the house classic', p: '$17' },
      { n: 'Cracked Conch Basket', d: 'Fries & slaw', p: '$19' },
      { n: 'Fish Tacos', d: 'Catch of the day, key lime crema', p: '$16' },
      { n: 'Conch Fritters', d: 'With key lime mustard', p: '$13' },
      { n: 'Key Lime Pie', d: 'Cool down with a slice', p: '$7' },
    ],
    kids: [
      { n: 'Hot Dog & Chips', p: '$7' },
      { n: 'Fish Bites & Fries', p: '$9' },
      { n: 'Grilled Cheese', p: '$6' },
    ],
  },
  {
    id: 'half-shell',
    name: 'Half Shell Raw Bar',
    cuisine: 'Seafood & raw bar',
    meals: 'Lunch & dinner',
    area: 'Historic Seaport · 231 Margaret St',
    lat: 24.5621, lng: -81.8035,
    tag: 'Second-night pick',
    why: 'An old fish-house right on the harbor — license plates nailed to the ceiling, boats unloading the catch a few feet away. Casual enough for sandy feet and a restless kid, good enough that locals still eat here.',
    know: 'First-come, first-served and worth a short wait at the bar. Ask for a table where you can watch the boats.',
    adult: [
      { n: 'Raw Oysters', d: 'Half dozen, on ice', p: '$18' },
      { n: 'Peel-&-Eat Shrimp', d: 'Half pound, Old Bay', p: '$16' },
      { n: 'Fish Tacos', d: 'Blackened catch, slaw', p: '$19' },
      { n: 'Fried Shrimp Basket', d: 'Fries & hush puppies', p: '$24' },
      { n: 'Conch Fritters', d: 'Key lime mustard', p: '$14' },
    ],
    kids: [
      { n: 'Fish & Chips', p: '$9' },
      { n: 'Popcorn Shrimp', p: '$10' },
      { n: 'Chicken Tenders & Fries', p: '$8' },
      { n: 'Grilled Cheese', p: '$7' },
    ],
  },
  {
    id: 'conch-republic',
    name: 'Conch Republic Seafood Company',
    cuisine: 'Seafood',
    meals: 'Lunch & dinner',
    area: 'Historic Seaport · 631 Greene St',
    lat: 24.5616, lng: -81.8019,
    tag: 'Second-night pick',
    why: 'A huge open-air deck hanging over the marina with live music most nights. Roomy and forgiving — a good call if the kid needs space to wiggle and you want a band, a breeze, and a cold drink.',
    know: 'Live music starts in the early evening. The deck is big but fills by 7 — go a little early.',
    adult: [
      { n: 'Seafood Paella', d: 'For two — shrimp, mussels, fish', p: '$42' },
      { n: 'Coconut Shrimp', d: 'Mango chutney', p: '$26' },
      { n: 'Grouper Sandwich', d: 'Blackened or fried', p: '$22' },
      { n: 'Crab Cakes', d: 'Remoulade, citrus slaw', p: '$30' },
      { n: 'Conch Chowder', d: 'Cup of the local classic', p: '$9' },
    ],
    kids: [
      { n: 'Popcorn Shrimp', p: '$10' },
      { n: 'Cheeseburger & Fries', p: '$9' },
      { n: 'Chicken Tenders', p: '$9' },
      { n: 'Mac & Cheese', p: '$7' },
    ],
  },
  {
    id: 'louies-backyard',
    name: "Louie's Backyard",
    cuisine: 'Upscale coastal',
    meals: 'Dinner',
    area: 'Casa Marina · 700 Waddell Ave',
    lat: 24.5460, lng: -81.7858,
    tag: 'Special occasion',
    why: "The island's classic special-occasion table — a historic home perched right over the Atlantic. If you can land a sitter for one evening, this is the one: cocktails on the oceanfront Afterdeck, then a quiet, beautiful dinner.",
    know: 'Reservations strongly recommended for dinner; the Afterdeck bar is walk-in for sunset drinks. Smart-casual. Best saved for a grown-ups night — the kitchen will plate simple dishes for children if needed.',
    adult: [
      { n: 'Cracked Conch', d: 'Citrus, scotch bonnet tartar', p: '$21' },
      { n: 'Grilled Florida Lobster', d: 'Seasonal, drawn butter', p: '$54' },
      { n: 'Pan-Seared Yellowtail Snapper', d: 'Local catch', p: '$44' },
      { n: 'Duval Street Burger', d: 'For the table that wants a burger', p: '$24' },
      { n: 'Key Lime Baked Alaska', d: 'The signature dessert', p: '$14' },
    ],
    kids: [
      { n: 'Grilled Chicken & Rice', p: '$13' },
      { n: 'Penne, Butter or Marinara', p: '$11' },
      { n: 'Cheeseburger & Fries', p: '$14' },
    ],
  },
];

const ATTRACTIONS = [
  {
    id: 'mallory-square',
    name: 'Mallory Square Sunset Celebration',
    kind: 'Nightly · free',
    area: 'Mallory Square · 1 Wall St',
    lat: 24.5598, lng: -81.8073,
    blurb: "The island's nightly send-off to the sun — jugglers, a cat circus, a bagpiper, sword swallowers, and food carts. Arrive about an hour before sunset for the full show.",
    kidNote: 'Street performers keep kids riveted. It gets crowded near the water — hold hands.',
  },
  {
    id: 'hemingway-home',
    name: 'Ernest Hemingway Home & Museum',
    kind: 'Museum · ~$19 adult / $7 kids',
    area: 'Old Town · 907 Whitehead St',
    lat: 24.5510, lng: -81.8004,
    blurb: "Hemingway's 1930s home and lush gardens, now home to about 50 six-toed cats descended from his own. Short guided tours run all day.",
    kidNote: 'Turn it into a cat scavenger hunt — counting six-toed paws keeps little ones busy the whole visit.',
  },
  {
    id: 'butterfly',
    name: 'Key West Butterfly & Nature Conservatory',
    kind: 'Indoor garden · ticketed',
    area: 'Old Town · 1316 Duval St',
    lat: 24.5454, lng: -81.7993,
    blurb: 'A glass-domed tropical habitat with hundreds of free-flying butterflies, songbirds, and two resident flamingos.',
    kidNote: 'Air-conditioned, calm, and mesmerizing — the perfect midday reset when the heat peaks.',
  },
  {
    id: 'southernmost-point',
    name: 'Southernmost Point Buoy',
    kind: 'Photo stop · free',
    area: 'Whitehead St & South St',
    lat: 24.5465, lng: -81.7976,
    blurb: 'The giant painted buoy marking the southernmost point of the continental U.S. — 90 miles to Cuba.',
    kidNote: 'Go earlier in the day; the photo line builds fast by late morning.',
  },
  {
    id: 'higgs-beach',
    name: 'Higgs Beach & Astro City Playground',
    kind: 'Beach & playground · free',
    area: 'Atlantic Blvd',
    lat: 24.5475, lng: -81.7882,
    blurb: 'A local beach with calm, shallow water, a long fishing pier, and the Astro City playground right behind the sand.',
    kidNote: 'The best beach for kids on the island — playground and gentle water in one easy spot.',
  },
  {
    id: 'fort-zachary',
    name: 'Fort Zachary Taylor State Park',
    kind: 'State park · ~$8 per vehicle',
    area: '601 Howard England Way',
    lat: 24.5460, lng: -81.8110,
    blurb: "A Civil War-era fort with the island's best snorkeling beach, shade trees, and picnic tables.",
    kidNote: 'Bring water shoes — the beach is pebbly. Great shade for a long, lazy afternoon.',
  },
  {
    id: 'aquarium',
    name: 'Key West Aquarium',
    kind: 'Aquarium · ticketed',
    area: 'Mallory Square · 1 Whitehead St',
    lat: 24.5601, lng: -81.8079,
    blurb: 'A small, old-school aquarium right at Mallory Square with touch tanks, sharks, sea turtles, and feeding shows.',
    kidNote: 'The touch tank is a guaranteed hit — an easy 45-minute stop right before the Sunset Celebration.',
  },
  {
    id: 'historic-seaport',
    name: 'Historic Seaport (Key West Bight)',
    kind: 'Boardwalk · free',
    area: 'Key West Bight',
    lat: 24.5618, lng: -81.8025,
    blurb: 'A working harbor boardwalk lined with boats, raw bars, and ice cream — this is where the second-night dinner lives.',
    kidNote: 'Count the pelicans and watch the shrimp boats unload the day’s catch.',
  },
];

const ITINERARY = [
  {
    eyebrow: 'First night',
    title: 'Sunset, then supper',
    when: 'Arrival evening · keep it simple, stay near the water',
    stops: [
      { time: '4:30 PM', title: 'Settle in & stroll Duval Street', detail: 'Drop the bags and wander the upper blocks of Duval. Duck into Kermit’s Key Lime Shoppe for a free sample — and a chocolate-dipped frozen key lime pie on a stick for the kid.' },
      { time: '6:45 PM', title: 'Mallory Square Sunset Celebration', detail: 'Walk over and let the kid loose on the jugglers, the cat circus, and the bagpiper. The Key West Aquarium is right here if you need a short, cool-down distraction.', mapId: 'mallory-square' },
      { time: '~8:00 PM', title: 'Sunset over the Gulf', detail: 'In late spring the sun goes down around 8 PM. Find a spot at the rail a few minutes early and watch the whole crowd applaud.' },
      { time: '8:15 PM', title: 'Dinner at El Meson de Pepe', detail: 'Steps from the square — Cuban classics, live salsa, a real kids menu. No driving, no long walk, an easy first-night win.', mapId: 'el-meson-de-pepe' },
      { time: 'After', title: 'Waterfront walk back', detail: 'Stroll the harbor edge back toward Old Town. Early night — tomorrow is the big day.' },
    ],
  },
  {
    eyebrow: 'Day two',
    title: 'Cats, butterflies & a beach',
    when: 'Full day · pace it around the midday heat',
    stops: [
      { time: '8:30 AM', title: 'Breakfast at Blue Heaven', detail: 'Get there before it opens or expect a wait — it is worth it. Courtyard tables, roaming roosters, the famous banana bread, and pancakes for the kid. (Pepe’s Cafe is the relaxed backup if the line looks brutal.)', mapId: 'blue-heaven' },
      { time: '10:15 AM', title: 'Ernest Hemingway Home & Museum', detail: 'About 50 six-toed cats roam the gardens — run it as a cat scavenger hunt. The guided tours are short and lively.', mapId: 'hemingway-home' },
      { time: '11:30 AM', title: 'Southernmost Point Buoy', detail: 'A quick walk down Whitehead Street for the classic 90-miles-to-Cuba photo. Earlier is better — the line grows.', mapId: 'southernmost-point' },
      { time: '12:00 PM', title: 'Butterfly & Nature Conservatory', detail: 'A couple of blocks up Duval — a warm glass dome full of free-flying butterflies and two flamingos. Air-conditioned and calm: the perfect midday reset.', mapId: 'butterfly' },
      { time: '1:15 PM', title: "Lunch at B.O.'s Fish Wagon", detail: 'A gloriously ramshackle open-air fish shack. The square-grouper sandwich is the move. Sandy-feet friendly, picnic-table seating.', mapId: 'bos-fish-wagon' },
      { time: '2:30 PM', title: 'Beach time', detail: 'Higgs Beach for the kid — playground and calm shallow water in one spot. Or Fort Zachary Taylor for the island’s best snorkeling and shade.', mapId: 'higgs-beach' },
      { time: '5:00 PM', title: 'Back to rest & regroup', detail: 'Pool time or a nap before dinner. You earned it.' },
    ],
  },
  {
    eyebrow: 'Second night',
    title: 'Dinner on the harbor',
    when: 'Evening · waterfront, casual, a little music',
    stops: [
      { time: '6:00 PM', title: 'Historic Seaport boardwalk', detail: 'Stroll the Key West Bight boardwalk. Watch the schooners and shrimp boats come in; let the kid count pelicans.', mapId: 'historic-seaport' },
      { time: '7:00 PM', title: 'Dinner on the water', detail: 'Half Shell Raw Bar for the classic fish-house feel, or Conch Republic Seafood Company for a bigger deck and live music. Both sit right on the harbor with roomy kids menus.', mapId: 'half-shell' },
      { time: '8:30 PM', title: 'Dessert walk', detail: 'A frozen key lime pie on a stick, then watch the boats light up along the seaport.' },
      { time: 'Optional', title: "Grown-ups upgrade: Louie's Backyard", detail: 'If a sitter is in reach for one evening, this is the Key West special-occasion table — cocktails on the oceanfront Afterdeck at sunset.', mapId: 'louies-backyard' },
    ],
  },
];

const NOTES = [
  { h: 'Getting around', b: 'Old Town is tiny and walkable — a car is mostly a liability, since parking is scarce and metered. The Old Town Trolley or Conch Tour Train makes a great first-day orientation loop.' },
  { h: 'Sun & heat', b: 'Late May is hot and bright. Pack hats, reef-safe sunscreen, and water bottles, and slot the indoor stops — Butterfly Conservatory, Aquarium — into the midday peak.' },
  { h: 'Key lime everything', b: "Kermit's Key Lime Shoppe does free samples, and a chocolate-dipped frozen key lime pie on a stick the kid will not stop talking about." },
  { h: 'Reservations', b: 'Almost everything here is first-come, first-served. Louie’s Backyard is the exception — book that one ahead.' },
  { h: 'About these menus', b: 'The dishes and prices below are a representative sample. Key West kitchens change with the catch and the season, so confirm the latest before you go.' },
];

export async function handleKeywest(request, _env, _ctx, _url, _block) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }
  return new Response(renderPage(), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300, must-revalidate',
    },
  });
}

function renderPage() {
  const markers = [
    ...RESTAURANTS.map(r => ({ id: r.id, name: r.name, type: 'eat', area: r.area, lat: r.lat, lng: r.lng, blurb: r.cuisine + ' · ' + r.meals })),
    ...ATTRACTIONS.map(a => ({ id: a.id, name: a.name, type: 'do', area: a.area, lat: a.lat, lng: a.lng, blurb: a.kind })),
  ];

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Key West Guidebook — for Nikki</title>
<meta name="description" content="A two-night family guide to Key West: the best restaurants with adult and kids menus, a map of where everything sits, and a plan for the first night, the next day, and the next night.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter+Tight:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
${styles()}
</head>
<body>
<nav class="topnav">
  <span class="topnav-brand">Key West</span>
  <div class="topnav-links">
    <a href="#plan">The plan</a>
    <a href="#map">Map</a>
    <a href="#eat">Where to eat</a>
    <a href="#do">Things to do</a>
  </div>
</nav>

<header class="hero">
  <div class="hero-inner">
    <p class="hero-eyebrow">A guidebook for Nikki</p>
    <h1>Key West</h1>
    <p class="hero-sub">Two nights, three great meals, and one very small island. Here is the plan for the first night, the next day, and the next night — plus every restaurant and sight on a single map so you can see what sits near what.</p>
    <div class="hero-jump">
      <a href="#plan">See the plan</a>
      <a href="#map">Open the map</a>
    </div>
  </div>
</header>

<main>
  <section id="plan" class="section">
    <p class="section-eyebrow">The plan</p>
    <h2>Three parts, no rush</h2>
    <p class="section-lead">A loose itinerary built around the heat and the sunset. Tap any stop with a <span class="inline-pin">map</span> tag to jump to it on the map below.</p>
    <div class="plan-grid">
      ${ITINERARY.map(renderPlanCard).join('')}
    </div>
  </section>

  <section id="map" class="section">
    <p class="section-eyebrow">The map</p>
    <h2>Where everything is</h2>
    <p class="section-lead">Old Town is walkable end to end. Restaurants are coral, sights are teal — tap a pin for details, or use the buttons to focus.</p>
    <div class="map-controls">
      <button class="map-filter is-active" data-filter="all">Show all</button>
      <button class="map-filter" data-filter="eat">Restaurants</button>
      <button class="map-filter" data-filter="do">Things to do</button>
      <span class="map-legend">
        <span class="legend-item"><span class="dot dot-eat"></span>Restaurant</span>
        <span class="legend-item"><span class="dot dot-do"></span>Sight</span>
      </span>
    </div>
    <div id="kw-map"></div>
  </section>

  <section id="eat" class="section">
    <p class="section-eyebrow">Where to eat</p>
    <h2>The best tables in Key West</h2>
    <p class="section-lead">Seven spots that earn the trip — each one with an adult menu and a kids menu. Use the toggle on every card to switch between them.</p>
    <div class="card-grid">
      ${RESTAURANTS.map(renderRestaurantCard).join('')}
    </div>
  </section>

  <section id="do" class="section">
    <p class="section-eyebrow">Things to do</p>
    <h2>Sights, beaches & the sunset</h2>
    <p class="section-lead">What to fold in around the meals — and a note on each for travelling with a kid.</p>
    <div class="card-grid">
      ${ATTRACTIONS.map(renderAttractionCard).join('')}
    </div>
  </section>

  <section class="section">
    <p class="section-eyebrow">Good to know</p>
    <h2>A few practical notes</h2>
    <div class="notes">
      ${NOTES.map(n => `<div class="note"><h3>${esc(n.h)}</h3><p>${esc(n.b)}</p></div>`).join('')}
    </div>
  </section>
</main>

<footer class="site-footer">
  <p>Key West Guidebook · made for Nikki · have the best trip.</p>
  <p class="footer-fine">Restaurant menus and prices are a representative sample and change with the season — confirm the latest before you go. Map data &copy; OpenStreetMap contributors.</p>
</footer>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGD8n3xx3MdAaXdAfn5oDsPo3M=" crossorigin=""></script>
<script>
${clientScript(markers)}
</script>
</body></html>`;
}

function renderPlanCard(day) {
  return `<article class="plan-card">
    <div class="plan-head">
      <span class="plan-eyebrow">${esc(day.eyebrow)}</span>
      <h3>${esc(day.title)}</h3>
      <p class="plan-when">${esc(day.when)}</p>
    </div>
    <ol class="stops">
      ${day.stops.map(s => `<li>
        <span class="stop-time">${esc(s.time)}</span>
        <div class="stop-body">
          <span class="stop-title">${esc(s.title)}</span>
          <p>${esc(s.detail)}</p>
          ${s.mapId ? `<button type="button" class="stop-pin" onclick="kwShow('${esc(s.mapId)}')">View on map &rarr;</button>` : ''}
        </div>
      </li>`).join('')}
    </ol>
  </article>`;
}

function renderRestaurantCard(r) {
  return `<article class="card rcard" id="card-${esc(r.id)}">
    <span class="tag">${esc(r.tag)}</span>
    <h3>${esc(r.name)}</h3>
    <p class="card-meta">${esc(r.cuisine)} &middot; ${esc(r.meals)}</p>
    <p class="card-area">${esc(r.area)}</p>
    <p class="why">${esc(r.why)}</p>
    <p class="know"><span class="know-label">Good to know</span> ${esc(r.know)}</p>
    <div class="menu">
      <div class="menu-tabs">
        <button type="button" class="mtab is-active" data-target="m-adult-${esc(r.id)}">Adult menu</button>
        <button type="button" class="mtab" data-target="m-kids-${esc(r.id)}">Kids menu</button>
      </div>
      <ul class="menu-panel is-active" id="m-adult-${esc(r.id)}">
        ${r.adult.map(i => `<li>
          <div class="mi-row"><span class="mi-name">${esc(i.n)}</span><span class="mi-price">${esc(i.p)}</span></div>
          ${i.d ? `<p class="mi-desc">${esc(i.d)}</p>` : ''}
        </li>`).join('')}
      </ul>
      <ul class="menu-panel" id="m-kids-${esc(r.id)}">
        ${r.kids.map(i => `<li>
          <div class="mi-row"><span class="mi-name">${esc(i.n)}</span><span class="mi-price">${esc(i.p)}</span></div>
        </li>`).join('')}
      </ul>
    </div>
    <button type="button" class="pin-link" onclick="kwShow('${esc(r.id)}')">View on map &rarr;</button>
  </article>`;
}

function renderAttractionCard(a) {
  return `<article class="card acard" id="card-${esc(a.id)}">
    <span class="tag tag-do">${esc(a.kind)}</span>
    <h3>${esc(a.name)}</h3>
    <p class="card-area">${esc(a.area)}</p>
    <p class="why">${esc(a.blurb)}</p>
    <p class="know"><span class="know-label know-label-do">With kids</span> ${esc(a.kidNote)}</p>
    <button type="button" class="pin-link" onclick="kwShow('${esc(a.id)}')">View on map &rarr;</button>
  </article>`;
}

function styles() {
  return `<style>
:root{
  --bg:#f5f1ea; --ink:#181612; --muted:#6b6660; --line:#ddd6c9;
  --green:#1f3a2e; --coral:#d9694a; --teal:#2a8c8c; --gold:#e0a35e;
  --card:#fffdf8;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);
  font:16px/1.6 "Inter Tight",ui-sans-serif,system-ui,-apple-system,sans-serif;
  -webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:"Fraunces",Georgia,serif;font-weight:600;letter-spacing:-0.01em;margin:0}
a{color:inherit}

.topnav{position:sticky;top:0;z-index:1000;display:flex;align-items:center;
  justify-content:space-between;gap:16px;padding:11px 22px;
  background:rgba(31,58,46,0.97);color:var(--bg);backdrop-filter:blur(6px)}
.topnav-brand{font-family:"Fraunces",Georgia,serif;font-weight:600;font-size:17px;letter-spacing:0.01em}
.topnav-links{display:flex;gap:6px;flex-wrap:wrap}
.topnav-links a{font-size:13px;font-weight:500;text-decoration:none;color:#cfe0d6;
  padding:5px 10px;border-radius:6px}
.topnav-links a:hover{background:rgba(255,255,255,0.12);color:#fff}

.hero{background:
  radial-gradient(900px 380px at 50% 118%, rgba(255,225,170,0.92), transparent 62%),
  linear-gradient(178deg,#1f3a2e 0%,#2f5a4a 34%,#9d6f55 62%,#d98a5f 83%,#f0b86c 100%);
  color:#fdf6e9;padding:78px 24px 96px;text-align:center}
.hero-inner{max-width:680px;margin:0 auto}
.hero-eyebrow{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;
  letter-spacing:0.22em;text-transform:uppercase;margin:0 0 14px;color:#ffe6c2}
.hero h1{font-size:clamp(56px,15vw,108px);line-height:0.96;font-weight:700;margin:0 0 20px}
.hero-sub{font-size:17px;line-height:1.62;margin:0 auto 28px;max-width:560px;color:#f3e7d4}
.hero-jump{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.hero-jump a{text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:999px}
.hero-jump a:first-child{background:#fdf6e9;color:var(--green)}
.hero-jump a:last-child{border:1.5px solid rgba(253,246,233,0.6);color:#fdf6e9}
.hero-jump a:hover{transform:translateY(-1px)}

main{max-width:1080px;margin:0 auto;padding:0 22px}
.section{padding:62px 0 12px;border-bottom:1px solid var(--line)}
.section:last-of-type{border-bottom:none}
.section-eyebrow{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;
  letter-spacing:0.18em;text-transform:uppercase;color:var(--coral);margin:0 0 10px}
.section h2{font-size:clamp(28px,5vw,38px);margin:0 0 12px}
.section-lead{font-size:16px;color:var(--muted);max-width:620px;margin:0 0 30px}
.inline-pin,.stop-pin{font-family:ui-monospace,monospace}
.inline-pin{background:#e7eee9;color:var(--green);font-size:11px;font-weight:600;
  padding:2px 7px;border-radius:5px;text-transform:uppercase;letter-spacing:0.06em}

.plan-grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(290px,1fr))}
.plan-card{background:var(--card);border:1px solid var(--line);border-radius:14px;
  padding:24px 22px;display:flex;flex-direction:column}
.plan-head{border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:16px}
.plan-eyebrow{display:inline-block;font-family:ui-monospace,monospace;font-size:11px;
  letter-spacing:0.14em;text-transform:uppercase;color:#fff;background:var(--green);
  padding:4px 10px;border-radius:6px;margin-bottom:10px}
.plan-card h3{font-size:23px;margin:0 0 4px}
.plan-when{font-size:13px;color:var(--muted);margin:0}
.stops{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:16px}
.stops li{display:flex;gap:13px}
.stop-time{flex:0 0 66px;font-family:ui-monospace,monospace;font-size:12px;font-weight:600;
  color:var(--coral);padding-top:2px}
.stop-body{flex:1;border-left:2px solid var(--line);padding-left:14px}
.stop-title{font-weight:600;font-size:15px;display:block;margin-bottom:2px}
.stop-body p{margin:0;font-size:14px;color:var(--muted);line-height:1.55}
.stop-pin{margin-top:7px;background:#e7eee9;color:var(--green);border:none;cursor:pointer;
  font-size:11px;font-weight:600;padding:4px 9px;border-radius:5px;letter-spacing:0.04em}
.stop-pin:hover{background:#d6e2da}

.map-controls{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:0 0 16px}
.map-filter{font:inherit;font-size:13px;font-weight:600;cursor:pointer;
  padding:8px 15px;border-radius:999px;border:1.5px solid var(--line);
  background:var(--card);color:var(--ink)}
.map-filter:hover{border-color:var(--green)}
.map-filter.is-active{background:var(--green);color:#fdf6e9;border-color:var(--green)}
.map-legend{display:flex;gap:14px;margin-left:auto;flex-wrap:wrap}
.legend-item{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted)}
.dot{width:13px;height:13px;border-radius:50%;border:2px solid #fff;
  box-shadow:0 0 0 1px rgba(0,0,0,0.18)}
.dot-eat{background:var(--coral)}
.dot-do{background:var(--teal)}
#kw-map{height:460px;width:100%;border-radius:14px;border:1px solid var(--line);
  z-index:1;background:#dfe7e3}
.leaflet-popup-content{font-family:"Inter Tight",sans-serif;margin:12px 14px}
.kw-pop-name{font-family:"Fraunces",Georgia,serif;font-weight:600;font-size:15px}
.kw-pop-area{font-size:12px;color:#6b6660;margin-top:2px}
.kw-pop-blurb{font-size:12px;margin-top:5px}

.card-grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;
  padding:24px 22px;display:flex;flex-direction:column;scroll-margin-top:70px}
.tag{align-self:flex-start;font-family:ui-monospace,monospace;font-size:11px;font-weight:600;
  letter-spacing:0.07em;text-transform:uppercase;color:#fff;background:var(--coral);
  padding:4px 10px;border-radius:6px;margin-bottom:11px}
.tag-do{background:var(--teal)}
.card h3{font-size:22px;line-height:1.2;margin:0 0 5px}
.card-meta{font-size:13px;font-weight:600;color:var(--green);margin:0 0 2px}
.card-area{font-family:ui-monospace,monospace;font-size:12px;color:var(--muted);margin:0 0 12px}
.why{font-size:14.5px;margin:0 0 12px;line-height:1.6}
.know{font-size:13px;color:var(--muted);background:#f0ebe0;border-radius:9px;
  padding:11px 13px;margin:0 0 16px;line-height:1.55}
.know-label{display:inline-block;font-family:ui-monospace,monospace;font-size:10px;
  font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--coral);
  margin-right:4px}
.know-label-do{color:var(--teal)}

.menu{margin-top:auto}
.menu-tabs{display:flex;gap:6px;margin-bottom:12px}
.mtab{flex:1;font:inherit;font-size:13px;font-weight:600;cursor:pointer;padding:9px 8px;
  border-radius:8px;border:1.5px solid var(--line);background:var(--bg);color:var(--muted)}
.mtab:hover{border-color:var(--green)}
.mtab.is-active{background:var(--green);color:#fdf6e9;border-color:var(--green)}
.menu-panel{list-style:none;margin:0;padding:0;display:none}
.menu-panel.is-active{display:block}
.menu-panel li{padding:9px 0;border-bottom:1px dashed var(--line)}
.menu-panel li:last-child{border-bottom:none}
.mi-row{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.mi-name{font-weight:600;font-size:14px}
.mi-price{font-family:ui-monospace,monospace;font-size:13px;color:var(--coral);
  font-weight:600;white-space:nowrap}
.mi-desc{margin:2px 0 0;font-size:12.5px;color:var(--muted);line-height:1.5}

.pin-link{margin-top:16px;align-self:flex-start;background:none;border:none;cursor:pointer;
  font:inherit;font-size:13px;font-weight:600;color:var(--green);padding:0}
.pin-link:hover{color:var(--coral)}

.notes{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
  margin-bottom:20px}
.note{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px 20px}
.note h3{font-size:17px;margin:0 0 6px}
.note p{margin:0;font-size:14px;color:var(--muted);line-height:1.6}

.site-footer{text-align:center;padding:48px 24px 56px;color:var(--muted)}
.site-footer p{margin:0 0 8px;font-size:14px}
.footer-fine{font-size:12px;max-width:560px;margin:0 auto}

@media (max-width:560px){
  .hero{padding:60px 20px 72px}
  .section{padding:48px 0 8px}
  #kw-map{height:380px}
  .stop-time{flex-basis:58px}
}
</style>`;
}

function clientScript(markers) {
  return `
(function(){
  var DATA = ${JSON.stringify(markers)};

  // --- Restaurant menu tabs ---
  document.querySelectorAll('.menu-tabs').forEach(function(tabs){
    tabs.querySelectorAll('.mtab').forEach(function(btn){
      btn.addEventListener('click', function(){
        var card = btn.closest('.rcard');
        card.querySelectorAll('.mtab').forEach(function(b){ b.classList.remove('is-active'); });
        card.querySelectorAll('.menu-panel').forEach(function(p){ p.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var panel = document.getElementById(btn.dataset.target);
        if (panel) panel.classList.add('is-active');
      });
    });
  });

  // --- Map ---
  var map = L.map('kw-map', { scrollWheelZoom:false }).setView([24.5535, -81.8005], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  var COLORS = { eat:'#d9694a', do:'#2a8c8c' };
  var markers = {};
  var groups = { eat:L.layerGroup(), do:L.layerGroup() };
  var bounds = [];

  DATA.forEach(function(d){
    var m = L.circleMarker([d.lat, d.lng], {
      radius: 9, color:'#fff', weight:2,
      fillColor: COLORS[d.type], fillOpacity: 0.96
    });
    m.bindPopup(
      '<div class="kw-pop-name">' + esc(d.name) + '</div>' +
      '<div class="kw-pop-area">' + esc(d.area) + '</div>' +
      '<div class="kw-pop-blurb">' + esc(d.blurb) + '</div>'
    );
    m.addTo(groups[d.type]);
    markers[d.id] = m;
    bounds.push([d.lat, d.lng]);
  });
  groups.eat.addTo(map);
  groups.do.addTo(map);
  if (bounds.length) map.fitBounds(bounds, { padding:[36,36] });

  // --- Filter buttons ---
  document.querySelectorAll('.map-filter').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.map-filter').forEach(function(b){ b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      var f = btn.dataset.filter;
      toggleGroup('eat', f === 'all' || f === 'eat');
      toggleGroup('do',  f === 'all' || f === 'do');
    });
  });
  function toggleGroup(type, on){
    if (on && !map.hasLayer(groups[type])) groups[type].addTo(map);
    if (!on && map.hasLayer(groups[type])) map.removeLayer(groups[type]);
  }

  // --- Jump-to-marker from anywhere on the page ---
  window.kwShow = function(id){
    var m = markers[id];
    if (!m) return;
    toggleGroup('eat', true);
    toggleGroup('do', true);
    document.querySelectorAll('.map-filter').forEach(function(b){
      b.classList.toggle('is-active', b.dataset.filter === 'all');
    });
    document.getElementById('kw-map').scrollIntoView({ behavior:'smooth', block:'center' });
    map.setView(m.getLatLng(), 16, { animate:true });
    setTimeout(function(){ m.openPopup(); }, 420);
  };

  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
})();
`;
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
