// Seeds the deeper property-type content and per-type service prices.
//
//   node scripts/seed-property-depth.mjs
//
// Why this exists: on 25 Sep 2026 GSC showed /property/hdb-2-room/ ranking at
// position 3.9 while every service page sat between 33 and 90, even though the
// property pages were the thinnest on the site. They were also failing the
// swap test against each other: 54% of the 3-room page was word-for-word
// identical to the 5-room page, because the copy was written per category
// (HDB / condo / landed) rather than per type.
//
// Copy may use tokens resolved from the numeric data at build time, so a price
// update cannot leave a stale figure in an FAQ answer:
//   {floorArea} {routineHours} {deepHours} {deepPrice} {sessionPrice}
//
// Idempotent: re-running overwrites these fields and touches nothing else.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const file = (n) => join(dataDir, n);
const read = (n) => JSON.parse(readFileSync(file(n), 'utf8'));
const write = (n, v) => writeFileSync(file(n), JSON.stringify(v, null, 2) + '\n');

// --- property-type copy -----------------------------------------------------
// Facts checked: HDB counts the living room as a room, so a 5-room has the same
// three bedrooms as a 4-room; household shelters are mandatory from 1997;
// HDB stopped building executive maisonettes in 1995 and executive apartments
// in the early 2000s.

const COPY = {
  'hdb-2-room': {
    bedrooms: '1',
    bathrooms: '1',
    layoutSummary:
      'HDB counts the living room as a room, so a 2-room flat has one bedroom, one bathroom, a kitchen and a combined living and dining area, in about {floorArea}. New ones are sold as 2-room Flexi, which HDB designed for singles aged 35 and over, elderly owners who can choose a shorter lease, and young families starting out. There is very little floor to cover, and that is what to understand before booking: what you pay is set by the vendor’s minimum hours, not by the size of the flat.',
    whereTimeGoes: [
      { title: 'The minimum booking', body: 'The flat itself needs {routineHours} of routine work, but most vendors bill at least three hours. Plan how the spare time is used, such as window tracks, the inside of the fridge or the kitchen cabinets, rather than paying for an hour of nothing.' },
      { title: 'The one bathroom', body: 'Shower, toilet and basin share one small room that is used for everything, so limescale on the glass and tiles builds faster than in a flat with two bathrooms to spread the load.' },
      { title: 'The kitchen', body: 'In a flat this compact the kitchen is the only room that really works hard. The hob, the wall behind it and the cabinet fronts nearest the cooker usually take the largest share of a session.' },
    ],
    bookingTips: [
      'Ask about the minimum hours before you book, and give the vendor a list for any time left over.',
      'Fortnightly usually suits a 2-room flat better than weekly. There is less to build up between visits, so the saving is real and the flat stays on top.',
      'For a deep clean, {deepPrice} is the typical flat rate. A quote well above that for a one-bedroom flat is worth questioning.',
    ],
    faqs: [
      { q: 'Is a part-time cleaner worth it for a 2-room flat?', a: 'Often on a fortnightly rather than weekly basis. A 2-room flat needs about {routineHours} of routine work, but most vendors charge a three-hour minimum, so a session typically costs {sessionPrice} before GST whatever the flat needs. Fortnightly spreads that over a flat that builds up little between visits.' },
      { q: 'How much does a deep clean of a 2-room HDB cost?', a: 'Typically {deepPrice} before GST, as a flat rate for the whole job, with {deepHours} of work. Because the flat is small, the price depends more on how long it has been since the last thorough clean than on its size.' },
      { q: 'Can I book a cleaner for less than three hours?', a: 'It is hard to find. Most vendors set a three-hour minimum because of the travel between jobs. If your flat only needs two hours, the better value is usually to keep the three and spend the extra hour on the jobs a routine session skips.' },
    ],
  },

  'hdb-3-room': {
    bedrooms: '2',
    bathrooms: '2 (some older flats have 1)',
    layoutSummary:
      'Two bedrooms, a combined living and dining area, a kitchen and a service yard, in about {floorArea}. Newer 3-room flats have two bathrooms; some older ones have only one. This is the flat type that dominates the oldest estates, including Toa Payoh, Ang Mo Kio and Queenstown, so a large share of 3-room flats are now more than forty years old. That age matters more than the floor area: original mosaic and terrazzo floors and decades-old grout decide how long a deep clean takes.',
    whereTimeGoes: [
      { title: 'Original floors', body: 'Terrazzo and mosaic in older flats cannot take the acid-based cleaners that shift grime quickly on modern tiles, because acid etches them. They are cleaned by hand with milder products, which is slower and is the right way to do it.' },
      { title: 'Grout scrubbed for decades', body: 'Grout in an older bathroom has worn and stained in a way new grout has not. Cleaning lifts the dirt, but it cannot replace grout that has eroded, and a vendor who promises it will look new is overselling.' },
      { title: 'Kitchen cabinets', body: 'Original kitchen cabinets absorb cooking grease into their edges and hinges over the years. They need degreasing rather than a wipe, and that is often the longest single task in a 3-room deep clean.' },
    ],
    bookingTips: [
      'Tell the vendor roughly when the flat was built and when it was last renovated. Age changes the job more than the flat type does.',
      'Say whether the bathrooms were redone under the Home Improvement Programme or a renovation. A newer bathroom inside an older flat moves the work to the kitchen and floors.',
    ],
    faqs: [
      { q: 'How long does it take to clean a 3-room HDB?', a: 'Routine part-time cleaning takes about {routineHours}, which typically comes to {sessionPrice} per session before GST. A deep clean takes {deepHours}.' },
      { q: 'What does a deep clean of a 3-room HDB cost?', a: 'Typically {deepPrice} before GST, as a flat rate. Where a quote lands in that range depends mostly on the age of the finishes: an original 1970s or 1980s flat takes longer than a renovated one of the same size.' },
      { q: 'Why is my 3-room quote higher than the average?', a: 'Usually because of the flat’s age rather than its size. Original floors, worn grout and old kitchen cabinets all take longer to clean properly. Ask the vendor what drove the price; a good one will point to specific things.' },
    ],
  },

  'hdb-4-room': {
    bedrooms: '3',
    bathrooms: '2',
    layoutSummary:
      'Three bedrooms, two bathrooms, a combined living and dining area, a kitchen and a service yard, in about {floorArea}. The 4-room flat is the national default and the size most published price lists quote against, so a headline deep-clean price with no size given is almost always the 4-room figure. Flats built from the late 1990s also have a household shelter, the reinforced room many households use as a storeroom.',
    whereTimeGoes: [
      { title: 'Two bathrooms in daily use', body: 'A 4-room flat usually houses a family, and both bathrooms are used every day. Each needs its own descaling, grout and glass work, which makes the bathrooms a large share of any deep clean.' },
      { title: 'Three bedrooms of furniture', body: 'Beds, wardrobes and desks in three rooms mean a lot of floor that routine cleaning never reaches. A deep clean gets under and behind them, but only if they can be moved; vendors generally will not shift heavy furniture themselves.' },
      { title: 'The household shelter', body: 'If your flat has one, it is probably full. Vendors do not clean inside unless it is in the scope and cleared enough to work in, and because it has no window it gathers dust quickly.' },
    ],
    bookingTips: [
      'Use {deepPrice} as your benchmark for a deep clean. If a 4-room quote sits well above it, ask what the vendor has seen that justifies it.',
      'Say whether the household shelter should be included, and clear it first if so.',
    ],
    faqs: [
      { q: 'How much does it cost to deep clean a 4-room HDB?', a: 'Typically {deepPrice} before GST, as a flat rate for the whole job, with {deepHours} of work. Because most price lists are written for the 4-room, quotes are easier to compare for this flat type than for any other.' },
      { q: 'How much is a part-time cleaner for a 4-room HDB?', a: 'A routine session takes about {routineHours}, which typically comes to {sessionPrice} before GST at the usual hourly rates. A recurring weekly or fortnightly booking is normally cheaper per hour than a one-off.' },
      { q: 'Will the cleaner clean the bomb shelter?', a: 'Only if you ask, and only if it is clear enough to work in. The household shelter is usually a storeroom, so empty or rearrange it before the day and put it in the written scope. It has no window, so leave the door open afterwards to let it air.' },
    ],
  },

  'hdb-5-room': {
    bedrooms: '3',
    bathrooms: '2',
    layoutSummary:
      'Three bedrooms and two bathrooms, the same count as a 4-room, but with noticeably more living and dining space, in about {floorArea}. That extra space is where the extra cleaning time goes: more floor, more window area and usually more furniture. 5-room flats dominate the 1990s towns such as Pasir Ris, Bukit Panjang and Woodlands, so many are now past the twenty-five year mark, where original kitchen and bathroom finishes need more than routine cleaning.',
    whereTimeGoes: [
      { title: 'Living and dining floors', body: 'The bigger communal area means more floor to clean and more furniture to clean around. It is the single biggest difference between a 5-room job and a 4-room one.' },
      { title: 'Windows and their tracks', body: 'More wall means more windows, and every window has a track that collects grit. Tracks are slow to do properly, and they are one of the first things cut when a session runs short.' },
      { title: 'Finishes at twenty-five years', body: 'Many 5-room flats are old enough that original kitchen and bathroom surfaces no longer respond to routine cleaning. A deep clean helps, but it will not make a worn surface look new.' },
    ],
    bookingTips: [
      'Do not accept a price worked out from the bedroom count. A 5-room has the same three bedrooms as a 4-room but more space, and a quote built on bedrooms alone tends to grow on the day.',
      'A deep clean takes {deepHours}. Ask whether that is one cleaner over a long day or a team, since it changes when the job finishes.',
    ],
    faqs: [
      { q: 'How much does a deep clean of a 5-room HDB cost?', a: 'Typically {deepPrice} before GST, as a flat rate, with {deepHours} of work. It sits above the 4-room range because of the extra floor and window area, not because of extra rooms.' },
      { q: 'Why does a 5-room cost more than a 4-room when both have three bedrooms?', a: 'Because cleaning time follows floor and window area more than room count. A 5-room has a larger living and dining area, more windows and more furniture, and all of that takes time a bedroom count does not show.' },
      { q: 'How many hours of part-time cleaning does a 5-room HDB need?', a: 'About {routineHours} for a routine session, which typically comes to {sessionPrice} before GST. Booking only the three-hour minimum for a 5-room usually means something gets skipped.' },
    ],
  },

  'hdb-executive': {
    bedrooms: '3, plus a study',
    bathrooms: '2',
    layoutSummary:
      'Three bedrooms, a study, two bathrooms and, in some, a balcony, in about {floorArea}, the largest HDB flat type. HDB stopped building executive maisonettes in 1995 and executive apartments in the early 2000s, so every one is now more than twenty years old. A maisonette is split over two storeys with an internal staircase, and that staircase, its balustrade and the upper landing add time that a quote given by flat type often leaves out.',
    whereTimeGoes: [
      { title: 'The staircase', body: 'In a maisonette, every tread, riser and balustrade has to be done by hand, and dust from the upper floor settles on the stairs. It is slow work and easy to leave off a quote.' },
      { title: 'The largest floor area in HDB', body: 'At {floorArea}, an executive flat has more floor, more windows and more furniture than any other HDB type. A deep clean takes {deepHours}, which is usually a two-person job if it is to finish in a day.' },
      { title: 'Twenty years of wear', body: 'With none built for two decades, every executive flat has either original finishes or a past renovation that has now aged. Kitchens and bathrooms usually need proper degreasing and descaling, not a wipe.' },
    ],
    bookingTips: [
      'Say whether it is a maisonette, and list the staircase and upper landing in the scope.',
      'Expect a team for a deep clean, and ask how many people are coming so the time estimate makes sense.',
      'In a maisonette, ask the crew to work from the top floor down: the upper storey first, then the staircase, then the ground floor. Otherwise dust from upstairs settles on rooms that have already been done.',
    ],
    faqs: [
      { q: 'How much does it cost to deep clean an executive HDB flat?', a: 'Typically {deepPrice} before GST, as a flat rate, with {deepHours} of work. A maisonette usually lands towards the top of that range because of the staircase and second floor.' },
      { q: 'Does a maisonette cost more to clean than an executive apartment?', a: 'Usually, yes. The floor areas are similar, but a maisonette adds an internal staircase, a balustrade and an upper landing, and dust spreads across two floors. Those take time a single-floor flat does not.' },
      { q: 'How long does part-time cleaning take in an executive flat?', a: 'A routine session takes about {routineHours}, typically {sessionPrice} before GST. In a maisonette, ask whether the stairs are part of the routine or saved for a deep clean.' },
    ],
  },

  'condo-1-2-bed': {
    bedrooms: '1–2',
    bathrooms: '1–2',
    layoutSummary:
      'One or two bedrooms, one or two bathrooms, a kitchen that is often open to the living area, and almost always a balcony, in about {floorArea}. That is similar to or smaller than a 3-room HDB, but the finish is different: more glass, more built-in joinery and often a sliding balcony door across the living room. The balcony and that glass are the two items most often left out of a headline price.',
    whereTimeGoes: [
      { title: 'Glass', body: 'Balcony doors, shower screens and mirrors all have to be cleaned without streaks, which takes longer than it looks. In a small condo, glass can be a surprising share of the job.' },
      { title: 'The balcony', body: 'Outdoor dust, the door track and the drainage outlet all collect grit. Confirm the balcony is in the scope; it is often assumed to be and then left out.' },
      { title: 'Glossy joinery', body: 'Built-in wardrobes and high-gloss kitchen cabinets show every smear, so they need a careful finish rather than a quick wipe.' },
    ],
    bookingTips: [
      'Check your condo’s rules before the day. Many management offices want contractors registered in advance, and some require the service lift to be booked.',
      'Confirm the balcony is included, and be clear that the outside of high windows is not part of a home clean.',
      'If the unit is tenanted, or you are handing it back to a landlord, read the tenancy agreement first. Many require the aircon to be serviced at handover, and that is a separate trade from a clean.',
    ],
    faqs: [
      { q: 'How much does a deep clean of a 1 or 2-bedroom condo cost?', a: 'Typically {deepPrice} before GST, as a flat rate, with {deepHours} of work. Glass and the balcony are what move a small condo towards the top of that range.' },
      { q: 'Do cleaners need to register with condo management?', a: 'Often, yes. Rules vary by development, but many management offices ask for the contractor’s details in advance and may issue a pass. Check with yours before booking so the cleaner is not turned away at the gate.' },
      { q: 'Is part-time cleaning cheaper for a condo than for an HDB flat?', a: 'The hourly rate is the same; what changes is the hours. A routine session in a 1 or 2-bedroom condo takes about {routineHours}, typically {sessionPrice} before GST.' },
      { q: 'How often does a small condo need a deep clean?', a: 'For most, once every twelve to eighteen months is enough if a routine cleaner keeps on top of things in between. A balcony facing a main road or a construction site soils faster and can justify a shorter gap.' },
    ],
  },

  'condo-3-bed-plus': {
    bedrooms: '3 or more',
    bathrooms: '2–3, often plus a utility toilet',
    layoutSummary:
      'Three or more bedrooms, usually two or three bathrooms, and in many a utility or helper’s room with its own toilet, in about {floorArea}. At this size the number of bathrooms, not the floor area, is the biggest single driver of cost: each one adds grout, glass and sanitaryware work that extra living space does not. Many units built from the late 1990s also have a household shelter.',
    whereTimeGoes: [
      { title: 'Bathrooms', body: 'Two, three or more, plus the utility toilet. Each needs descaling, grout and glass work, and together they can take as long as the rest of the home.' },
      { title: 'Balconies and glass', body: 'Larger condos often have more than one balcony and a lot of full-height glass. Streak-free glass is slow, and balcony tracks and drains collect grit.' },
      { title: 'Utility room and shelter', body: 'These are usually storage and often packed. They are only cleaned inside if they are in the scope and cleared enough to work in.' },
    ],
    bookingTips: [
      'When you ask for a quote, give the number of bathrooms, not just bedrooms. It is the figure that moves the price most.',
      'Register the vendor with management and book the service lift if your development requires it, especially for a deep clean with equipment.',
      'If you have a live-in helper, say so when asking for a quote. In a home that is kept tidy day to day, a deep clean can be scoped around the jobs a helper does not reach, such as high surfaces, grout and appliance interiors, which can make it smaller than a like-for-like quote assumes.',
    ],
    faqs: [
      { q: 'How much does it cost to deep clean a 3-bedroom condo?', a: 'Typically {deepPrice} before GST, as a flat rate, with {deepHours} of work. The wide range is mostly about bathrooms: a three-bathroom unit with a utility toilet sits well above a two-bathroom one of the same floor area.' },
      { q: 'Why do quotes vary so much for condos of the same size?', a: 'Because floor area is a weak predictor at this size. Bathroom count, the number of balconies, how much glass there is and the finish of the joinery all change the hours, so two units of the same size can quote very differently.' },
      { q: 'How long does part-time cleaning take in a large condo?', a: 'About {routineHours} for a routine session, typically {sessionPrice} before GST. For the larger units, a longer booking or two cleaners is often more realistic than the minimum.' },
    ],
  },

  landed: {
    bedrooms: '3 or more',
    bathrooms: '3 or more',
    layoutSummary:
      'Terrace, semi-detached and detached houses across two to four storeys, with several bathrooms and staircases, and outdoor areas a flat does not have: a car porch, a garden, sometimes a roof terrace or a pool. An internal floor area of {floorArea} does not predict the job on its own, which is why careful vendors want to see the house before they commit to a price.',
    whereTimeGoes: [
      { title: 'Several storeys', body: 'Equipment has to be carried between floors, and every staircase adds treads, risers and balustrades. The more levels, the longer the job, whatever the floor area.' },
      { title: 'Bathrooms', body: 'Three or more, each needing its own descaling and grout work. In a house, the bathroom count is often a better guide to the hours than the square footage.' },
      { title: 'High and hard-to-reach glass', body: 'Double-height voids, skylights and tall windows can need ladders or equipment a routine home clean does not bring. Ask what is reachable and what needs a specialist.' },
    ],
    bookingTips: [
      'Expect a site visit, and treat a firm price given over the phone with caution. There are too many variables to price a house unseen.',
      'Agree in writing what the house includes. The car porch, garden, roof terrace and pool deck are usually separate from an internal clean.',
      'Ask how many cleaners are coming and for how long. For a house, the size of the crew says more about whether the job will be finished in the booked time than the hourly rate does, and for a deep clean one cleaner for a multi-storey house is a warning sign.',
    ],
    faqs: [
      { q: 'How much does it cost to deep clean a landed house?', a: 'As a guide, {deepPrice} before GST, over {deepHours}, but most vendors will only confirm a price after seeing the house. Storeys, bathroom count and glazing move it more than the floor area does.' },
      { q: 'Why won’t cleaners give me a price over the phone?', a: 'Because a house has too many variables to price unseen: the number of storeys and staircases, the bathrooms, high glass and the outdoor areas. A vendor who quotes firmly without seeing it is guessing, and the price tends to change on the day.' },
      { q: 'Are the car porch and garden included in a house clean?', a: 'Usually not. A home clean covers the inside; the car porch, garden, roof terrace and any pool deck are normally quoted separately. List what you want done so it is priced rather than assumed.' },
    ],
  },
};

// --- per-type flat-rate prices ----------------------------------------------
// Only where the research named that exact flat type. Condos, executive flats
// and landed homes are left out for the services whose sources lumped them into
// bands ("5-room or condominium"): mapping those would be extrapolation, and a
// move-out price below the deep-clean price for the same unit showed it.
//
// deep-cleaning mirrors propertyTypes.deepCleanFlatRateSGD, which the homepage
// and pricing page already publish. validate-data.mjs fails if they diverge.

const PRICES = {
  'move-out-cleaning': {
    'hdb-2-room': { min: 290, max: 380 },
    'hdb-3-room': { min: 290, max: 380 },
    'hdb-4-room': { min: 380, max: 550 },
    'hdb-5-room': { min: 450, max: 650 },
  },
  'move-in-cleaning': {
    'hdb-2-room': { min: 250, max: 350 },
    'hdb-3-room': { min: 250, max: 350 },
    'hdb-4-room': { min: 380, max: 600 },
    'hdb-5-room': { min: 380, max: 600 },
  },
  'spring-cleaning': {
    'hdb-3-room': { min: 260, max: 350 },
    'hdb-4-room': { min: 320, max: 450 },
    'hdb-5-room': { min: 380, max: 550 },
  },
  'post-renovation-cleaning': {
    'hdb-4-room': { min: 400, max: 550 },
  },
};

// --- apply ------------------------------------------------------------------

const propertyTypes = read('propertyTypes.json');
for (const pt of propertyTypes) {
  const copy = COPY[pt.slug];
  if (!copy) {
    console.warn(`  no copy defined for property type "${pt.slug}"`);
    continue;
  }
  Object.assign(pt, copy);
}
write('propertyTypes.json', propertyTypes);

const services = read('services.json');
for (const s of services) {
  if (s.slug === 'deep-cleaning') {
    s.priceByProperty = Object.fromEntries(
      propertyTypes.filter((p) => p.deepCleanFlatRateSGD).map((p) => [p.slug, { ...p.deepCleanFlatRateSGD }]),
    );
  } else if (PRICES[s.slug]) {
    s.priceByProperty = PRICES[s.slug];
  }
}
write('services.json', services);

const words = (t) => t.trim().split(/\s+/).length;
for (const pt of propertyTypes) {
  const c = COPY[pt.slug];
  const n =
    words(c.layoutSummary) +
    c.whereTimeGoes.reduce((a, x) => a + words(x.title) + words(x.body), 0) +
    c.bookingTips.reduce((a, x) => a + words(x), 0) +
    c.faqs.reduce((a, x) => a + words(x.q) + words(x.a), 0);
  console.log(`  ${pt.slug.padEnd(18)} +${n} words of type-specific copy`);
}
console.log(`priceByProperty set on ${services.filter((s) => s.priceByProperty).length} services`);
