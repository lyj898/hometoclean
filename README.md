# hometoclean.com

Lead generation site for **HomeToClean**, the trading name of **SKAP Waste Management Pte Ltd** (est. 2009).

HomeToClean is a **matching service**. It connects households in Singapore with vetted, independent cleaning vendors. It does not carry out cleaning work. Copy must never say "our cleaners" or "our team will arrive" — say "matched with vetted cleaners". This is a legal accuracy requirement, not a style preference.

Market: Singapore only. English only. No locale prefixes, ever.

---

## Stack

| | |
|---|---|
| Framework | Astro 5, `output: 'static'`, `trailingSlash: 'always'` |
| Language | TypeScript, strict + `noUncheckedIndexedAccess` |
| Styling | Tailwind CSS v4 |
| Hosting | GitHub Pages, deployed from `main` by GitHub Actions |

```bash
npm install
npm run dev        # local dev server
npm run validate   # data integrity checks (runs before every build)
npm run build      # validate + astro check + astro build
npm run audit      # checks dist against the acceptance criteria
npm run verify     # build + audit
npm run status     # what is published, and what is in the sitemap
npm run publish 2  # take a batch live (see Publication batches)
node scripts/verify-tracking.mjs   # drives the form in a real browser
```

## Deployment

GitHub Pages, from `main`, via `.github/workflows/deploy.yml`. Two files in
`public/` are load-bearing and easy to lose:

- **`.nojekyll`** — Astro emits hashed assets into `_astro/`. GitHub Pages runs
  Jekyll by default, and Jekyll strips underscore-prefixed directories. Without
  this file every stylesheet 404s and the site renders unstyled.
- **`CNAME`** — the custom domain. It must be in the published output, not just
  the repo root, or Pages drops the domain on each deploy.

`npm run audit` checks for both, so a missing one fails CI rather than the live
site.

## Contact model

The enquiry form is the **only** contact channel. There is no WhatsApp link and
no `tel:` link anywhere on the site, and the audit fails the build if one
appears.

The form mirrors ourkampung.com: Name, Email, Mobile (optional), Message, plus a
`_honey` honeypot, posted as JSON to FormSubmit.

**FormSubmit needs a one-time activation.** The first real submission sends a
confirmation link to the destination inbox; nothing is delivered until that link
is clicked. Once activated, replace the address in
`company.formSubmit.endpoint` with the hashed alias FormSubmit provides, so the
inbox address stops appearing in page source where scrapers can read it.

## Analytics

GA4 via `PUBLIC_GA4_ID`. Two events, both fired from the form: `form_start`
(first field focus, once per page view) and `form_submit` (successful POST
only). There is no generic `button_click`, and no `whatsapp_click` or
`phone_click` — this site has no such channels, and an event that can never fire
is worse than no event.

With no `PUBLIC_GA4_ID` set, no analytics script is emitted at all. It is set as
a **repository variable** (Settings → Secrets and variables → Actions →
Variables), not a secret: the measurement ID is public in page source by design.

Verified live: `page_view`, `form_start` and `form_submit` all reach GA4.

**When testing the form, scope any fetch stub to `formsubmit.co`.** GA4's
transport also uses `fetch`, so a blanket stub swallows analytics hits and makes
it look as though `form_submit` never reached Google.

`form_submit` still has to be marked as a **key event** in GA4 (Admin → Events)
before it counts as a conversion. That is a console setting, not a code change.

Lighthouse mobile on the homepage: **100 / 100 / 100 / 100**, CLS 0, LCP 1.3s.
The site ships **zero JavaScript** — the mobile nav and FAQ accordions are native
`<details>` elements, and there are no images, so there is nothing to shift.

---

## Build status

| Phase | Scope | State |
|---|---|---|
| 1 | Data layer + types | Complete |
| 2 | Routing, SEO plumbing, schema | Complete |
| 3 | Design system + homepage | Complete |
| 4 | Service / location / property templates | Complete |
| 5 | Conversion tracking + legal | Complete |

---

## The data layer

Every page on this site is generated from `src/data/*.json`. **Nothing about the site structure is hardcoded in a template.** Adding a town or a service to the data is the only edit needed to produce working pages.

Types live in [`src/types/index.ts`](src/types/index.ts).

### `services.json`

The seven services. Each carries its own pricing basis, inclusions, exclusions, per-property durations, FAQs, and — importantly — `chooseInsteadIf`, which drives the "you may be booking the wrong service" section. Most customers do book the wrong thing, so this is genuinely useful content rather than filler.

**Pricing is the field to be careful with.** `pricingModel` distinguishes hourly services from flat-rate ones. Conflating the two is the most common way Singapore customers overpay, and saying so plainly is good content.

```jsonc
"priceRangeSGD": {
  "min": 22, "max": 32,
  "unit": "per hour",              // always state the basis
  "notes": "...",                  // rendered to users; carries GST position and caveats
  "confidence": "researched",      // "researched" | "unknown"
  "sourceBasis": "...",            // internal provenance, not rendered
  "minimumHours": 3                // null for flat-rate services
}
```

If a real market rate cannot be established, set `min`/`max` to `null` and `confidence` to `"unknown"`. The validator enforces that pairing, and such a service must render as "quoted on request" — never as an invented number.

All published prices are **before GST** (currently 9%). `company.gstRegistered` is `null` until confirmed; the GST wording cannot be finalised until it is set.

### `locations.json`

The 27 residential towns. Deliberately towns only — no MRT stations, no industrial estates, no condo names. Those have no search volume.

`housingProfile` is the critical field and the reason these pages are not 27 copies of one page. It carries 60–100 words of genuinely town-specific fact: dominant flat types and floor areas, estate age, private stock share, and BTO handover activity.

> **The test every location page must pass:** if you swapped the town name, would the page still be accurate? If yes, it is too thin. Rewrite it.

`adjacentSlugs` drives internal linking between neighbouring towns. `dominantPropertyTypes` drives the per-town pricing table, which is why a Pasir Ris page quotes higher than a Toa Payoh page without any template change.

### `propertyTypes.json`

Eight property sizes. Cleaning pricing keys off property size far more than location, so this file — not `locations.json` — is what actually drives quoted figures.

### `combos.json`

The `{service, town}` pairs that become location pages. **Generated, not hand-written:**

```bash
npm run gen:combos
```

Only services with `locationEnabled: true` produce combos. Currently that is `part-time-cleaning`, `deep-cleaning` and `post-renovation-cleaning` — 3 × 27 = **81 combos**.

The generator **preserves existing entries**, so hand-edits to `batch` or `published` survive a regeneration. It only adds missing combos and drops ones whose service or town no longer exists. `npm run validate` fails the build if `combos.json` is out of date.

### `company.json`

Entity name, address, hours, year established, and the FormSubmit endpoint.

Several fields are **deliberately empty** and every render site omits them while
they are: `uen`, `email`, `phone`, `phoneDisplay`, `whatsappNumber`. Setting one
publishes it everywhere at once — `hasUen()` in `src/lib/data.ts` is the pattern.
Address fields still carry `[PLACEHOLDER]` values, and the validator warns about
each, so they cannot quietly reach production.

---

## Publication batches

Pages do not all go live at once. `batch` is a flag in the data, so **you control what enters the sitemap** without touching a template.

| Batch | Contents |
|---|---|
| 0 | Home, vendor standards, pricing, about, contact, privacy, terms, areas index |
| 1 | 7 service pages + 8 property-type pages. **No location pages.** |
| 2 | 3 services × 12 highest-population towns = 36 location pages |
| 3 | Remaining 45 location pages, driven by Search Console data |

Batch 2 towns: Bedok, Jurong West, Tampines, Woodlands, Sengkang, Yishun, Hougang, Choa Chu Kang, Punggol, Ang Mo Kio, Bukit Batok, Bukit Merah.

Location pages additionally carry `published: false` as a master switch. A combo enters the build and the sitemap only when `published` is `true`.

---

## Extending the data

### Add a town

1. Append an entry to `locations.json` with a real 60–100 word `housingProfile`. If you cannot write something true and specific about the town, do not add the town.
2. Add the new slug to the `adjacentSlugs` of its neighbours, **and** list those neighbours in its own `adjacentSlugs`. The validator warns on asymmetric adjacency.
3. Run `npm run gen:combos` to create its combos (they default to `published: false`).
4. Set `published: true` on the combos you want live.
5. `npm run validate`.

No template edits. The town index, location pages, sitemap and internal links all pick it up.

### Add a service

1. Append an entry to `services.json`. `h1Template` must contain the literal `{town}` token.
2. Provide `typicalDurationByProperty` for **every** property type slug — the validator errors on a missing one.
3. Set `locationEnabled` to `true` only if the service genuinely warrants per-town pages. Move-in, move-out, spring and mattress/sofa cleaning are deliberately `false`; per-town pages for them would not pass the swap test.
4. Run `npm run gen:combos` if `locationEnabled` is `true`.
5. `npm run validate`.

### Add a property type

Append to `propertyTypes.json`, then add a matching `typicalDurationByProperty` entry to **all seven** services. The validator will tell you exactly which ones are missing.

---

## Validation

`npm run validate` runs [`scripts/validate-data.mjs`](scripts/validate-data.mjs) and a `combos.json` freshness check. It runs before every build, because a broken cross-reference here becomes a 404 or an orphan page in production.

**Errors** (fail the build): unknown slug references, duplicate slugs, missing per-property durations, price ranges inverted or inconsistent with their stated confidence, combos out of sync with services × locations, invalid enum values.

**Warnings** (do not fail the build): asymmetric adjacency, `housingProfile` outside 60–100 words or never naming its own town, unresolved `company.json` placeholders, services with fewer than three FAQs.

### Known warnings

Thirteen asymmetric adjacency pairs are warned about. These come from the supplied adjacency graph and have been left **exactly as specified** rather than silently "fixed" — see the Gate 1 notes. They affect reciprocal internal linking between neighbouring towns, so they are worth a decision before location pages go live.

---

## Content rules

- Singapore English: HDB, condo, aircon, wet market. Never "apartment", "realtor", "zip code".
- SGD written as `S$`. State the GST position explicitly.
- No superlatives that cannot be evidenced. No "Singapore's No.1".
- Never imply cleaners can be booked below the Progressive Wage Model floor.
- Never invent pricing, statistics, review counts or vendor numbers.
- Never claim we perform the service ourselves.
- No `LocalBusiness` schema on location pages — there are no premises in those towns.
- No `AggregateRating` until reviews have genuinely been collected.
- Do not link to sibling sites. Do not create moving or relocation service pages.
