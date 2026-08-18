// One-off seeding for Phase 4 content:
//   - services.json  <- `process` steps per service
//   - combos.json    <- `localAngle`, the per-town/per-service paragraph that
//                       makes a location page fail the swap test on purpose
//
// Idempotent: re-running overwrites these fields with the values below and
// leaves everything else (batch, published) alone.
//
//   node scripts/seed-phase4.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const file = (n) => join(dataDir, n);
const read = (n) => JSON.parse(readFileSync(file(n), 'utf8'));
const write = (n, v) => writeFileSync(file(n), JSON.stringify(v, null, 2) + '\n');

// --- service process steps --------------------------------------------------

const PROCESS = {
  'part-time-cleaning': [
    { title: 'Walkthrough on the first visit', body: 'You show the cleaner the flat and agree what the booked hours cover. This is the conversation that prevents most later disputes, because three hours cannot cover everything and it is better to decide the priorities than to discover them.' },
    { title: 'A settled routine', body: 'From the second visit the cleaner works the same sequence each time. This is why a regular cleaner is faster than a new one every week, and why the recurring rate is lower than a one-off.' },
    { title: 'Supplies and access agreed in writing', body: 'Who provides cloths, detergents and a vacuum, and how the cleaner gets in. Confirm both before the first session rather than at the door.' },
    { title: 'Review after a month', body: 'Four visits is enough to know whether the hours are right. Adjust up, down, or change the scope. Vendors expect this and it is easier than quietly being unhappy.' },
  ],
  'deep-cleaning': [
    { title: 'Quote against property size', body: 'A flat rate is set from your property type, and for larger or unusual homes from photographs or a site visit. If a vendor offers only an hourly figure for a deep clean, the overrun risk has been moved onto you.' },
    { title: 'You prepare the surfaces', body: 'Clear worktops, put away valuables and small items, and move what you want moved. Vendors will not shift heavy furniture, and a cluttered home converts cleaning time into tidying time.' },
    { title: 'Top down, in sequence', body: 'High surfaces, fittings and fans first, then vertical surfaces, then floors last. Working in this order is why a deep clean cannot simply be run in parallel across rooms.' },
    { title: 'Wet work and dwell time', body: 'Descalers and degreasers have to sit before they do anything. Bathrooms and the kitchen are usually started early for this reason, then returned to.' },
    { title: 'Walk it before they leave', body: 'Check the specific things you cared about while the team is still there. Everything is easy to put right in the moment and awkward the next day.' },
  ],
  'move-out-cleaning': [
    { title: 'Get the handover checklist first', body: 'Ask your landlord or agent for it before requesting a quote. The checklist, not the cleaning company scope list, is the standard the work will be judged against.' },
    { title: 'Book for after the unit is empty', body: 'The day after the movers, not the same day. Cabinet interiors, skirtings and floors under wardrobes are exactly what gets inspected and exactly what cannot be reached around furniture.' },
    { title: 'Room by room against the list', body: 'The vendor works the checklist rather than a generic scope, including cabinet and wardrobe interiors, hob and hood, grout and window tracks.' },
    { title: 'Inspect before you hand over the keys', body: 'Walk the unit yourself with the checklist. If something is short, it is fixed then, not after your deposit conversation has started.' },
  ],
  'move-in-cleaning': [
    { title: 'Confirm renovation is genuinely finished', body: 'Including the final touch-up visit. If any trade is still returning, this is the wrong service and the wrong week.' },
    { title: 'Schedule before the movers', body: 'Ideally the day before. The empty unit is the entire advantage, and it disappears the moment your belongings arrive.' },
    { title: 'Sanitise first', body: 'Bathrooms, sanitaryware, kitchen surfaces and every cabinet, wardrobe and drawer interior, before anything of yours goes into them.' },
    { title: 'Protective film and handover labels off', body: 'New fittings and appliances arrive covered in film and stickers. Removing them cleanly is easier before adhesive has had months in Singapore heat to set.' },
  ],
  'post-renovation-cleaning': [
    { title: 'Every trade off site first', body: 'This is the single most common scheduling mistake. If the contractor has one more visit, wait for it. Cleaning around outstanding work means paying twice.' },
    { title: 'Coarse debris and industrial vacuuming', body: 'Offcuts and heavy debris out, then vacuuming with filtration built for construction dust. A domestic vacuum recirculates fine gypsum and cement dust rather than capturing it.' },
    { title: 'Residue removal', body: 'Paint splatter, silicone smear, adhesive and grout haze come off with specific methods per surface. This is the stage that separates the service from a deep clean.' },
    { title: 'Let it settle', body: 'Dust lifted during the first pass has to come down before it can be removed. A vendor who skips this leaves you with a hazy unit the next morning.' },
    { title: 'Final detail pass', body: 'Surfaces, glass and fittings wiped down once the air has cleared. Expect a little residual dust over the following week regardless; that is the nature of the work, not a defect.' },
  ],
  'spring-cleaning': [
    { title: 'Book several weeks ahead', body: 'Demand builds from December. In the final fortnight before Chinese New Year the binding constraint is availability, not price, and no amount of negotiating creates a slot.' },
    { title: 'Declutter before the team arrives', body: 'Decisions about what to keep are yours and they are slow. Making them in advance converts the booked hours into cleaning rather than sorting.' },
    { title: 'Full deep clean scope', body: 'The same work as a deep clean: grout, window tracks, appliance interiors, high surfaces, behind and beneath furniture.' },
    { title: 'Guest-facing areas detailed last', body: 'Living and dining areas, display surfaces and the entrance finished at the end so they are at their best when people arrive.' },
  ],
  'mattress-sofa-cleaning': [
    { title: 'Material check and colourfast test', body: 'Fabric or leather, and a discreet test patch. Leather is cleaned and conditioned, never extracted. A vendor who quotes without asking what the item is made of has not understood the job.' },
    { title: 'Dry vacuum', body: 'Loose particulate and surface debris removed first, so the extraction stage is not simply pushing grit deeper into the weave.' },
    { title: 'Stain pre-treatment', body: 'Applied where the fabric permits. This is also when the vendor should tell you honestly which marks will not come out.' },
    { title: 'Hot water extraction', body: 'Solution injected into the material and drawn straight back out under vacuum, lifting body oils, soiling and dust mite matter from within rather than off the surface.' },
    { title: 'Drying, which matters more here than elsewhere', body: 'Four to eight hours with airflow, longer in humid conditions. Do not put covers or fitted sheets back on until it is completely dry, or Singapore humidity turns a stain problem into a mould problem.' },
  ],
};

// --- per-combo local angles --------------------------------------------------
// Keyed "service/town". Each is written against that town's actual housing
// stock. If you cannot write something true and specific for a new combo,
// leave it out — validate-data.mjs refuses to publish a combo without one.

const ANGLES = {
  // ---------------------------------------------------------------- Ang Mo Kio
  'part-time-cleaning/ang-mo-kio': 'Flats in the older parts of Ang Mo Kio are compact by current standards, so a three-hour session usually covers the whole home rather than being rationed room by room. What consumes the time here is age rather than floor area: original tiling and kitchen surfaces from the 1970s hold soiling in a way newer finishes do not, and the grilles on older blocks need more attention than in a 1990s estate. Fortnightly is the more common pattern locally, with weekly concentrated in the newer Kebun Baru and Cheng San blocks.',
  'deep-cleaning/ang-mo-kio': 'The estate’s age is the whole argument for a deep clean in Ang Mo Kio. Flats from the 1970s carry original grout, mosaic and terrazzo, and kitchens that have absorbed decades of cooking oil. The complication is the Home Improvement Programme: many bathrooms have been replaced, so the newest part of the flat needs the least work while the kitchen and floors need the most. A vendor quoting a flat 4-room rate without asking whether your block has been through HIP is guessing at the scope.',
  'post-renovation-cleaning/ang-mo-kio': 'Ang Mo Kio flats are deep into second and third renovation cycles, and hacking work in a forty-year-old flat generates considerably more dust than a cosmetic refresh in a newer one. Older blocks here also have smaller service lifts and tighter renovation hours, which constrains when a crew can get equipment up and how long they can run it. Book after the contractor’s final touch-up visit rather than after the main works, because the last trade through the door usually undoes the first clean.',

  // --------------------------------------------------------------------- Bedok
  'part-time-cleaning/bedok': 'Bedok covers a wide range of flat ages, and the practical effect on a recurring booking is where you sit within it. A Chai Chee 3-room and a Bedok Reservoir 5-room need different session lengths, and quoting the town as a single rate does not survive contact with either. The coastal position matters more than people expect: window grilles, sliding tracks and aircon casings pick up salt-laden grime faster than inland estates, so track cleaning belongs in the routine here rather than being left for an annual deep clean.',
  'deep-cleaning/bedok': 'Two different deep cleans exist in Bedok. In Chai Chee and Bedok South the job is age-driven: 1970s grout, original flooring and long-settled kitchen grease. Around Bedok Reservoir the stock is younger and the work shifts towards glass, balconies and built-in joinery. Both share the coastal problem. Salt air corrodes and soils metal fittings, window grilles and sliding door tracks faster than anywhere inland, and track and grille work is usually the largest single time item in a Bedok deep clean.',
  'post-renovation-cleaning/bedok': 'Renovation in Bedok’s older blocks means hacking through 1970s construction, which produces heavier and coarser debris than work in a newer flat. Sea air adds a specific complication afterwards: fine cement dust that settles into window tracks and grille channels combines with salt residue and sets harder than it would inland, so tracks need to be cleared properly rather than wiped. Blocks facing the coast also cannot simply be aired out during the settling stage without drawing more salt-laden air back in.',

  // -------------------------------------------------------------- Bukit Batok
  'part-time-cleaning/bukit-batok': 'Bukit Batok is weighted towards 4-room, 5-room and executive flats, so the three-hour minimum that suits a compact flat elsewhere is genuinely tight here and four hours is the more realistic booking. The town’s 1980s stock is at the stage where original kitchen and bathroom finishes are visibly at end of life, which changes what routine cleaning can achieve: a cleaner can keep a worn surface clean but cannot make it look new. Hillier blocks also mean some walk-up access, which is worth flagging when booking.',
  'deep-cleaning/bukit-batok': 'Most of Bukit Batok’s housing stock is now around forty years old and sitting in the window where households either renovate or commission a proper reset instead. That makes deep cleaning here largely a question of original finishes: 1980s grout, kitchen cabinetry and bathroom surfaces that regular cleaning has stopped improving. Larger flat types are the norm, so sessions run longer than the national average and executive units frequently need a two-person team to finish inside a single day.',
  'post-renovation-cleaning/bukit-batok': 'Bukit Batok has two separate sources of post-renovation demand. The 1980s core is renovating at scale as original fittings reach end of life, and the newer blocks along Bukit Batok West Avenues 8 and 9 are handing over to first-time owners who renovate before moving in. The second group has an additional problem: the Tengah build-out next door is an active construction site, so west-facing units keep taking in ambient dust after the internal works finish, and a second lighter pass is more often justified here.',

  // -------------------------------------------------------------- Bukit Merah
  'part-time-cleaning/bukit-merah': 'Bukit Merah holds an unusual mix for recurring work. Small 2-room and 3-room flats around Redhill and Telok Blangah are quick, and often occupied by older residents where consistency of cleaner matters more than speed. The Tiong Bahru conservation flats are a different proposition: original terrazzo, timber and curved plaster detailing that will not tolerate the aggressive chemicals or abrasive pads a general cleaner might reach for by default. If your flat is a conservation unit, say so when booking rather than on the day.',
  'deep-cleaning/bukit-merah': 'A deep clean in Bukit Merah depends entirely on which part of it you live in. The Dawson precinct flats are large and modern, and the work is conventional. The pre-war SIT blocks at Tiong Bahru are not: terrazzo, original timber and curved detailing need pH-neutral products and hand methods, and a vendor who arrives with a general kit and a scrubbing machine can cause damage that cleaning cannot undo. This is the clearest case on our books for matching to a vendor briefed on heritage finishes.',
  'post-renovation-cleaning/bukit-merah': 'Renovation in Bukit Merah spans two extremes. Work in the Dawson blocks is standard modern post-renovation cleaning. Work in the conservation flats at Tiong Bahru is constrained by what the building is: original surfaces cannot be aggressively cleaned to remove cement haze, and heritage guidelines limit what can be altered in the first place. Older blocks throughout the estate also have narrow stairwells and small or absent service lifts, which genuinely limits the equipment a crew can bring to the unit.',

  // ------------------------------------------------------------ Choa Chu Kang
  'part-time-cleaning/choa-chu-kang': 'Choa Chu Kang runs to larger flat types, so a routine session here more often needs four hours than three, and households booking the minimum tend to find the scope quietly shrinking to keep within it. Teck Whye is the exception within the town: those blocks are 1980s rather than 1990s and are noticeably more worn, which shows up as more time on kitchen and bathroom surfaces. Distance from the centre also thins vendor availability, so a fixed recurring slot is worth more here than flexibility.',
  'deep-cleaning/choa-chu-kang': 'Most of Choa Chu Kang was built in the 1990s, which puts the bulk of the town past the twenty-five year mark where original bathroom and kitchen finishes start losing the argument with regular cleaning. Executive flats and maisonettes are well represented, and a maisonette carries an internal staircase and a second-storey bathroom that are routinely left out of a quote given by flat type over the phone. Teck Whye, being a decade older, generally quotes at the upper end for its size.',
  'post-renovation-cleaning/choa-chu-kang': 'Choa Chu Kang sits directly on the Tengah boundary, and that is the fact worth knowing here. Beyond your own renovation, west-facing blocks take in construction dust from the adjacent build-out, so a unit can look hazy again within days of a clean through no fault of the vendor. Where that applies, it is worth scheduling the final detail pass later than usual and keeping windows shut through the settling stage. The estate’s larger flats and maisonettes also push sessions past a single day more often than elsewhere.',

  // ------------------------------------------------------------------ Hougang
  'part-time-cleaning/hougang': 'Hougang has one of the larger average unit sizes in the north-east, and executive maisonettes are common. A maisonette is a two-storey home with an internal staircase and a second bathroom, and neither fits inside a three-hour session. Households here who book the minimum on the assumption that it is a flat like any other generally end up adding hours after the first month. Four to six hours is the realistic range, and stair balustrades are the item most often quietly dropped when time runs short.',
  'deep-cleaning/hougang': 'Quoting a deep clean in Hougang by flat type alone is unreliable, because the town’s executive maisonettes carry an internal staircase, stair balustrades and a second-storey bathroom that a single floor-area figure does not capture. Bathroom count is the better predictor of cost here than square footage. The 1980s and 1990s stock is also into its second or third renovation cycle, so what a deep clean is actually working on varies enormously depending on when the current owner last renovated.',
  'post-renovation-cleaning/hougang': 'Renovation in a Hougang maisonette is a bigger post-renovation job than the floor area suggests, because dust settles across two storeys and a staircase acts as a chimney distributing it upward through the whole unit. Stair treads, balustrades and the upper landing hold fine dust that a ground-floor-focused clean misses entirely. The town is also well into its second and third renovation cycles, so hacking works through older construction are common and produce heavier debris than a cosmetic refresh would.',

  // -------------------------------------------------------------- Jurong West
  'part-time-cleaning/jurong-west': 'Jurong West is large enough that its size is a practical booking problem. Travel between Boon Lay, Pioneer, Taman Jurong and the Jurong West streets is significant, and a vendor advertising a flat rate for the whole town is usually pricing from whichever precinct they are already working in. Ask where your cleaner is coming from before agreeing a recurring slot. Proximity to the western industrial belt also means more airborne particulate than central estates, so surfaces and window tracks dust up faster between visits.',
  'deep-cleaning/jurong-west': 'The stock here is weighted to 4-room, 5-room and executive flats, so deep cleans quote at the upper end of published ranges rather than the middle. Taman Jurong is the outlier: those blocks date to the 1970s and carry original finishes a decade older than most of the town, which reliably adds hours. The western industrial belt contributes a heavier particulate load than central Singapore, and it shows up specifically in window tracks, grilles and the tops of high surfaces.',
  'post-renovation-cleaning/jurong-west': 'Two things shape post-renovation work in Jurong West. First, scale: the flats are large, so a full renovation clean here is a longer job than the same works in a compact central flat, and executive units routinely run across two days. Second, distance. Vendors who cover the west properly are worth booking early, because the town is far enough from central Singapore that crews will not take short-notice work at the far end of it, particularly around Boon Lay and Pioneer.',

  // ------------------------------------------------------------------ Punggol
  'part-time-cleaning/punggol': 'Punggol is a young town of young households, and recurring cleaning here is genuinely maintenance rather than recovery. The homes are almost all 4-room and 5-room flats built from 2007 onward, so there is no aged grout, no worn terrazzo and no decades-old kitchen residue for a cleaner to work against. That makes a three to four hour session go further than it would in a mature estate. What does take time is the volume of built-in carpentry that renovation-heavy new flats tend to have.',
  'deep-cleaning/punggol': 'Punggol is the town where a full deep clean is least often the right booking. Nothing here is old enough to have the accumulated grout staining, limescale and kitchen carbon that justify a whole-home flat-rate reset, and households sometimes pay deep-clean rates for what is really an enhanced routine session. The genuine cases are homes several years past a renovation, or units that have been tenanted. If your flat is newly handed over or newly renovated, move-in or post-renovation cleaning is the service you actually want.',
  'post-renovation-cleaning/punggol': 'This is the service Punggol actually needs. The town has been handing over in continuous waves rather than a single burst since 2007, so there is a permanent pipeline of newly renovated flats here rather than a seasonal spike. Almost every household renovates before moving in, which means post-renovation cleaning followed by move-in cleaning is the normal sequence locally, not an unusual one. Vendors who work Punggol regularly tend to quote the two together, and that is usually the cheaper way to buy it.',

  // ----------------------------------------------------------------- Sengkang
  'part-time-cleaning/sengkang': 'Sengkang is dominated by 4-room and 5-room flats holding young families, which is the profile where recurring weekly cleaning is most common rather than fortnightly. The town is younger than the mature estates, so sessions are not fighting decades of build-up and three to four hours genuinely covers a 4-room. Rivervale is the exception worth knowing: those flats date to the late 1990s and are now old enough that original kitchen and bathroom surfaces need noticeably more time than the rest of the town.',
  'deep-cleaning/sengkang': 'Sengkang is only now entering the phase where deep cleaning is widely justified, and it is doing so unevenly. Rivervale, the oldest precinct, is at the twenty-five to thirty year mark where first major renovations cluster and original finishes are visibly tiring. Compassvale, Anchorvale and Fernvale are younger and generally do not need the full flat-rate treatment yet. This is the practical difference between Sengkang and Punggol next door: the demand profile here is genuinely shifting from move-in work towards deep cleaning, and Punggol’s has not.',
  'post-renovation-cleaning/sengkang': 'Post-renovation demand in Sengkang now comes from two directions. Rivervale flats are hitting the age where owners commission full renovations with hacking works, which produce the heaviest dust load. The rest of the town generates lighter post-renovation work from resale purchases and cosmetic updates. The LRT-served layout also matters practically: several precincts are a walk from the nearest MRT, and crews carrying industrial vacuums and equipment factor that into whether they take the job.',

  // ----------------------------------------------------------------- Tampines
  'part-time-cleaning/tampines': 'Tampines is large enough that a vendor based in one part of it will sometimes decline a job at the other end, so ask where your cleaner is travelling from before fixing a recurring slot. The mature core along Tampines Streets 11 to 91 runs to 4-room, 5-room and executive flats, which puts a realistic routine session at four hours rather than three. Tampines North is newer and lighter work, and households there often find three hours genuinely sufficient.',
  'deep-cleaning/tampines': 'The mature Tampines core is prime deep-cleaning territory: 1980s flats, mostly large, deep into their renovation cycles, with original grout and kitchen surfaces that routine cleaning has stopped improving. Executive units here regularly need a two-person team to finish within a day. Tampines North is a different case entirely, with recently handed-over flats where a full flat-rate deep clean is usually premature. Which half of the town you are in is the single biggest factor in whether this is the right booking.',
  'post-renovation-cleaning/tampines': 'Tampines runs both post-renovation streams at once. In the mature core, owners of 1980s flats are hacking out original kitchens and bathrooms, which is the heaviest and dustiest category of the work. In Tampines North, newly handed-over flats are being renovated before first occupation, which is cleaner work but almost universal. The two need different scheduling: hacking works in an old flat justify a settling period and a second pass far more often than a fit-out in a new one.',

  // ---------------------------------------------------------------- Woodlands
  'part-time-cleaning/woodlands': 'Woodlands is weighted to 4-room, 5-room and executive flats, so four hours is the realistic session length and the three-hour minimum tends to mean something gets skipped. The bigger practical issue is travel. The town is far from the centre and Causeway traffic makes the trip unpredictable at peak times, which narrows the pool of cleaners willing to take short recurring sessions here. A fixed weekly or fortnightly slot with the same cleaner is worth more in Woodlands than almost anywhere else.',
  'deep-cleaning/woodlands': 'Most of Woodlands was built through the 1990s and is now past the twenty-five year mark, which is where original bathroom and kitchen finishes start needing more than routine cleaning. Marsiling is older still, dating to the 1980s, and quotes accordingly for its size. Flats here are large, so deep cleans run long and executive units generally need a two-person team. Vendor travel time also affects pricing more than in central towns, and some quote a call-out on top for the north.',
  'post-renovation-cleaning/woodlands': 'Woodlands is renovating at scale, because the bulk of the town crossed the twenty-five year mark at roughly the same time and original fittings are reaching end of life together. That means genuine hacking works rather than cosmetic refreshes, and correspondingly heavy cement and gypsum dust. The constraint here is logistics rather than technique: crews bringing industrial equipment this far north will not do it at short notice, and booking two weeks out is realistic rather than cautious.',

  // ------------------------------------------------------------------- Yishun
  'part-time-cleaning/yishun': 'Yishun’s 3-room and 4-room flats are compact enough that a three-hour session covers the whole home, which is not true across much of the north. The Home Improvement Programme has been extensive here, and it changes what routine cleaning should prioritise: many bathrooms are newer than the flats containing them and need relatively little attention, while original kitchen surfaces, window tracks and floor tiling need more. Improved connectivity at Khatib and Canberra has widened the pool of cleaners willing to travel here.',
  'deep-cleaning/yishun': 'The Home Improvement Programme is the fact that shapes deep cleaning in Yishun. Bathroom condition is a poor proxy for flat age here, because upgraded sanitaryware frequently sits inside an otherwise original 1980s flat. A vendor who inspects the bathroom, assumes the flat is newer than it is and quotes accordingly will under-scope the kitchen, the window tracks and the original floor tiling, which is where the actual work is. Say whether your block has been through HIP when requesting a quote.',
  'post-renovation-cleaning/yishun': 'Renovation in Yishun frequently means working around what the Home Improvement Programme already replaced, so the works are more often partial than a full gut: a kitchen hacked out while an upgraded bathroom stays. Partial renovations are deceptively messy for cleaning, because dust travels through the whole flat while only part of it is stripped, and the finished areas that were never touched still need the full treatment. Newer development towards Miltonia and Canberra generates more conventional whole-unit post-renovation work.',
};

// --- apply ------------------------------------------------------------------

const services = read('services.json');
let seededProcess = 0;
for (const s of services) {
  const steps = PROCESS[s.slug];
  if (!steps) {
    console.warn(`  no process steps defined for service "${s.slug}"`);
    continue;
  }
  s.process = steps;
  seededProcess++;
}
write('services.json', services);

const combos = read('combos.json');
let seededAngles = 0;
for (const c of combos) {
  const key = `${c.serviceSlug}/${c.townSlug}`;
  c.localAngle = ANGLES[key] ?? null;
  if (c.localAngle) seededAngles++;
}
write('combos.json', combos);

const words = (t) => t.trim().split(/\s+/).length;
const counts = Object.values(ANGLES).map(words);

console.log(`process steps seeded on ${seededProcess}/${services.length} services`);
console.log(`localAngle seeded on ${seededAngles}/${combos.length} combos`);
console.log(`localAngle words: min ${Math.min(...counts)}, max ${Math.max(...counts)}`);
console.log(`combos still without a localAngle: ${combos.length - seededAngles} (cannot be published)`);
