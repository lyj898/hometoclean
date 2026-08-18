// Validates src/data/*.json for referential integrity and content rules.
// Run: node scripts/validate-data.mjs
//
// This runs before every build. If it fails, the build fails, because a broken
// cross-reference here becomes a 404 or an orphan page on the live site.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const read = (f) => JSON.parse(readFileSync(join(dataDir, f), 'utf8'));

const services = read('services.json');
const locations = read('locations.json');
const propertyTypes = read('propertyTypes.json');
const combos = read('combos.json');
const company = read('company.json');

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const serviceSlugs = new Set(services.map((s) => s.slug));
const townSlugs = new Set(locations.map((l) => l.slug));
const propSlugs = new Set(propertyTypes.map((p) => p.slug));

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// --- slugs ------------------------------------------------------------------
for (const [label, rows] of [
  ['service', services],
  ['location', locations],
  ['propertyType', propertyTypes],
]) {
  const seen = new Set();
  for (const r of rows) {
    if (!SLUG.test(r.slug)) err(`${label} "${r.slug}": slug must be lowercase and hyphenated`);
    if (seen.has(r.slug)) err(`${label} "${r.slug}": duplicate slug`);
    seen.add(r.slug);
  }
}

// --- locations --------------------------------------------------------------
if (locations.length !== 27) err(`locations.json: expected 27 towns, found ${locations.length}`);

for (const t of locations) {
  for (const a of t.adjacentSlugs) {
    if (!townSlugs.has(a)) err(`location "${t.slug}": adjacentSlugs references unknown town "${a}"`);
    if (a === t.slug) err(`location "${t.slug}": adjacent to itself`);
  }
  // Adjacency must be symmetric: if A borders B, B borders A. Asymmetry means
  // reciprocal town links render on one side only, so this is an error.
  for (const a of t.adjacentSlugs) {
    const other = locations.find((l) => l.slug === a);
    if (other && !other.adjacentSlugs.includes(t.slug)) {
      err(`adjacency not symmetric: "${t.slug}" -> "${a}" but not back`);
    }
  }
  if (new Set(t.adjacentSlugs).size !== t.adjacentSlugs.length) {
    err(`location "${t.slug}": duplicate entries in adjacentSlugs`);
  }
  if (!t.adjacentSlugs.length) err(`location "${t.slug}": no adjacent towns`);
  for (const p of t.dominantPropertyTypes) {
    if (!propSlugs.has(p)) err(`location "${t.slug}": unknown property type "${p}"`);
  }
  const words = t.housingProfile.trim().split(/\s+/).length;
  if (!t.housingProfile.trim()) {
    err(`location "${t.slug}": housingProfile is empty`);
  } else if (words < 60 || words > 100) {
    warn(`location "${t.slug}": housingProfile is ${words} words (target 60-100)`);
  }
  // The swap test: a profile that never names anything specific to the town is
  // by definition interchangeable with any other town's.
  if (!t.housingProfile.includes(t.name.split(' ')[0]) && words > 0) {
    warn(`location "${t.slug}": housingProfile never names the town`);
  }
}

// --- services ---------------------------------------------------------------
for (const s of services) {
  if (!s.h1Template.includes('{town}')) err(`service "${s.slug}": h1Template must contain {town}`);
  for (const r of s.relatedServiceSlugs) {
    if (!serviceSlugs.has(r)) err(`service "${s.slug}": unknown relatedServiceSlug "${r}"`);
    if (r === s.slug) err(`service "${s.slug}": related to itself`);
  }
  for (const alt of s.chooseInsteadIf) {
    if (!serviceSlugs.has(alt.serviceSlug)) {
      err(`service "${s.slug}": chooseInsteadIf references unknown service "${alt.serviceSlug}"`);
    }
  }
  for (const p of Object.keys(s.typicalDurationByProperty)) {
    if (!propSlugs.has(p)) err(`service "${s.slug}": typicalDurationByProperty key "${p}" is not a property type`);
  }
  for (const p of propSlugs) {
    if (!(p in s.typicalDurationByProperty)) {
      err(`service "${s.slug}": missing typicalDurationByProperty for "${p}"`);
    }
  }
  const { min, max, confidence, unit, notes } = s.priceRangeSGD;
  if (confidence === 'researched') {
    if (min === null || max === null) {
      err(`service "${s.slug}": confidence "researched" but min/max is null`);
    } else if (min > max) {
      err(`service "${s.slug}": price min ${min} exceeds max ${max}`);
    }
  }
  if (min === null || max === null) {
    if (confidence !== 'unknown') err(`service "${s.slug}": null price must have confidence "unknown"`);
    warn(`service "${s.slug}": price is null and must render as "quoted on request"`);
  }
  if (!unit.trim()) err(`service "${s.slug}": priceRangeSGD.unit is empty`);
  if (!notes.trim()) err(`service "${s.slug}": priceRangeSGD.notes is empty`);
  if (s.pricingModel === 'hourly' && s.priceRangeSGD.minimumHours === null) {
    warn(`service "${s.slug}": hourly pricing with no stated minimumHours`);
  }
  if (!s.inclusions.length) err(`service "${s.slug}": no inclusions`);
  if (!s.exclusions.length) err(`service "${s.slug}": no exclusions`);
  if (s.faqs.length < 3) warn(`service "${s.slug}": only ${s.faqs.length} FAQs`);
  if (!Array.isArray(s.process) || s.process.length < 3) {
    err(`service "${s.slug}": needs at least 3 process steps`);
  }
  for (const step of s.process ?? []) {
    if (!step.title?.trim() || !step.body?.trim()) {
      err(`service "${s.slug}": process step missing title or body`);
    }
  }
}

// --- property types ---------------------------------------------------------
for (const p of propertyTypes) {
  for (const [k, r] of Object.entries({
    floorAreaSqm: p.floorAreaSqm,
    floorAreaSqft: p.floorAreaSqft,
    regularCleanHours: p.regularCleanHours,
    deepCleanHours: p.deepCleanHours,
    deepCleanFlatRateSGD: p.deepCleanFlatRateSGD,
  })) {
    if (r === null) continue;
    if (r.min > r.max) err(`propertyType "${p.slug}": ${k} min ${r.min} exceeds max ${r.max}`);
  }
}

// --- combos -----------------------------------------------------------------
const locationEnabled = services.filter((s) => s.locationEnabled).map((s) => s.slug);
const expected = locationEnabled.length * locations.length;
if (combos.length !== expected) {
  err(`combos.json: expected ${expected} combos (${locationEnabled.length} services x ${locations.length} towns), found ${combos.length}. Run: node scripts/gen-combos.mjs`);
}
const comboKeys = new Set();
for (const c of combos) {
  const key = `${c.serviceSlug}/${c.townSlug}`;
  if (comboKeys.has(key)) err(`combos.json: duplicate combo "${key}"`);
  comboKeys.add(key);
  if (!serviceSlugs.has(c.serviceSlug)) err(`combo "${key}": unknown service`);
  if (!townSlugs.has(c.townSlug)) err(`combo "${key}": unknown town`);
  const svc = services.find((s) => s.slug === c.serviceSlug);
  if (svc && !svc.locationEnabled) err(`combo "${key}": service is not locationEnabled`);
  if (typeof c.published !== 'boolean') err(`combo "${key}": published must be a boolean`);

  // A location page without town-specific copy is the exact failure mode this
  // site exists to avoid: 27 pages that are one page with a swapped noun. So
  // publishing without a localAngle is an error, not a warning.
  const angleWords = c.localAngle ? c.localAngle.trim().split(/\s+/).length : 0;
  if (c.published && angleWords < 50) {
    err(
      `combo "${key}": published but localAngle is ${angleWords} words (min 50). ` +
        `Write town-specific copy or set published: false.`,
    );
  }
  if (c.localAngle && angleWords > 110) {
    warn(`combo "${key}": localAngle is ${angleWords} words (target 60-100)`);
  }
  // The swap test, mechanically: the copy must name its own town.
  const townName = locations.find((l) => l.slug === c.townSlug)?.name ?? '';
  if (c.localAngle && townName && !c.localAngle.includes(townName.split(' ')[0])) {
    warn(`combo "${key}": localAngle never names ${townName}`);
  }
}

// --- company ----------------------------------------------------------------
if (company.siteUrl.endsWith('/')) err('company.json: siteUrl must not end with a slash');
if (company.businessModel !== 'matching') err('company.json: businessModel must be "matching"');
const placeholders = Object.entries(company)
  .flatMap(([k, v]) =>
    typeof v === 'string' && /^\[.*\]$/.test(v)
      ? [k]
      : v && typeof v === 'object' && !Array.isArray(v)
        ? Object.entries(v).filter(([, vv]) => typeof vv === 'string' && /^\[.*\]$/.test(vv)).map(([kk]) => `${k}.${kk}`)
        : [],
  );
if (placeholders.length) warn(`company.json: unresolved placeholders: ${placeholders.join(', ')}`);
if (company.gstRegistered === null) warn('company.json: gstRegistered is null; GST wording cannot be finalised');

// --- enum / literal-union conformance ---------------------------------------
// The TS types narrow these to unions. JSON cannot express that, so the
// constraint is enforced here and asserted once in the data loader.
const BATCHES = [0, 1, 2, 3];
const PRICING_MODELS = [
  'hourly',
  'flat_rate_by_property_size',
  'flat_rate_by_size_and_debris',
  'flat_rate_by_property_size_seasonal',
  'per_item',
];
const CONFIDENCE = ['researched', 'unknown'];
const CATEGORIES = ['hdb', 'condo', 'landed'];

for (const [label, rows] of [
  ['service', services],
  ['location', locations],
  ['propertyType', propertyTypes],
  ['combo', combos],
]) {
  for (const r of rows) {
    const id = r.slug ?? `${r.serviceSlug}/${r.townSlug}`;
    if (!BATCHES.includes(r.batch)) err(`${label} "${id}": batch ${r.batch} is not one of ${BATCHES.join(', ')}`);
  }
}
for (const s of services) {
  if (!PRICING_MODELS.includes(s.pricingModel)) err(`service "${s.slug}": unknown pricingModel "${s.pricingModel}"`);
  if (!CONFIDENCE.includes(s.priceRangeSGD.confidence)) err(`service "${s.slug}": unknown confidence "${s.priceRangeSGD.confidence}"`);
}
for (const p of propertyTypes) {
  if (!CATEGORIES.includes(p.category)) err(`propertyType "${p.slug}": unknown category "${p.category}"`);
}

// --- report -----------------------------------------------------------------
for (const w of warnings) console.warn(`  warn  ${w}`);
for (const e of errors) console.error(`  ERROR ${e}`);

const counts = {
  services: services.length,
  locations: locations.length,
  propertyTypes: propertyTypes.length,
  combos: combos.length,
  combosBatch2: combos.filter((c) => c.batch === 2).length,
  combosPublished: combos.filter((c) => c.published).length,
};
console.log(`\ndata: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(' ')}`);
console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
