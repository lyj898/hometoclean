// Regenerates src/data/combos.json from services.json + locations.json.
//
// A combo is one {service, town} location page. Only services with
// locationEnabled: true produce combos.
//
// Existing entries are PRESERVED: if you hand-edit `batch` or `published` in
// combos.json, re-running this script keeps your edit. It only adds combos that
// are missing and removes combos whose service or town no longer exists.
//
//   node scripts/gen-combos.mjs
//   node scripts/gen-combos.mjs --check   (exit 1 if out of date; used in CI)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'src', 'data');
const read = (f) => JSON.parse(readFileSync(join(dataDir, f), 'utf8'));

const services = read('services.json');
const locations = read('locations.json');

let existing = [];
try {
  existing = read('combos.json');
} catch {
  /* first run */
}
const prior = new Map(existing.map((c) => [`${c.serviceSlug}/${c.townSlug}`, c]));

const next = [];
for (const service of services.filter((s) => s.locationEnabled)) {
  for (const town of locations) {
    const key = `${service.slug}/${town.slug}`;
    const kept = prior.get(key);
    next.push(
      kept ?? {
        serviceSlug: service.slug,
        townSlug: town.slug,
        // Location pages start at batch 2. A combo inherits the town's batch so
        // the 12 highest-population towns go live first.
        batch: town.batch,
        published: false,
      },
    );
  }
}

const serialised = JSON.stringify(next, null, 2) + '\n';
const current = (() => {
  try {
    return readFileSync(join(dataDir, 'combos.json'), 'utf8');
  } catch {
    return '';
  }
})();

if (process.argv.includes('--check')) {
  if (serialised !== current) {
    console.error('combos.json is out of date. Run: node scripts/gen-combos.mjs');
    process.exit(1);
  }
  console.log(`combos.json up to date (${next.length} combos).`);
} else {
  writeFileSync(join(dataDir, 'combos.json'), serialised);
  const added = next.length - existing.length;
  console.log(
    `Wrote ${next.length} combos (${added >= 0 ? '+' : ''}${added}). ` +
      `Batch 2: ${next.filter((c) => c.batch === 2).length}, ` +
      `Batch 3: ${next.filter((c) => c.batch === 3).length}.`,
  );
}
