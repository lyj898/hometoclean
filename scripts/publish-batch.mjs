// Controls which batches are live.
//
//   node scripts/publish-batch.mjs status        show what is live
//   node scripts/publish-batch.mjs 2             publish batch 2
//   node scripts/publish-batch.mjs 2 --dry-run   preview
//   node scripts/publish-batch.mjs 3 --unpublish roll batch 3 back
//
// Publishing a batch does two things: adds it to site.json publishedBatches,
// and flips `published: true` on that batch's combos in combos.json.
//
// Batches 2 and 3 are location pages. Do not publish batch 2 until batch 1 is
// confirmed indexed; do not publish batch 3 without Search Console data
// justifying the towns.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const file = (n) => join(dataDir, n);
const read = (n) => JSON.parse(readFileSync(file(n), 'utf8'));
const write = (n, v) => writeFileSync(file(n), JSON.stringify(v, null, 2) + '\n');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const unpublish = args.includes('--unpublish');
const target = args.find((a) => !a.startsWith('--'));

const site = read('site.json');
const combos = read('combos.json');
const services = read('services.json');
const locations = read('locations.json');

if (!target || target === 'status') {
  console.log(`published batches: [${site.publishedBatches.join(', ')}]\n`);
  for (const b of [0, 1, 2, 3]) {
    const live = site.publishedBatches.includes(b);
    const inBatch = combos.filter((c) => c.batch === b);
    const pub = inBatch.filter((c) => c.published).length;
    const detail = inBatch.length ? ` — ${pub}/${inBatch.length} combos published` : '';
    console.log(`  batch ${b}  ${live ? 'LIVE' : 'not live'}${detail}`);
    console.log(`            ${site.batchNotes[String(b)] ?? ''}`);
  }
  const svc = services.filter((s) => site.publishedBatches.includes(s.batch)).length;
  const townsLive = new Set(
    combos.filter((c) => c.published && site.publishedBatches.includes(c.batch)).map((c) => c.townSlug),
  );
  console.log(
    `\nin sitemap: ${svc}/${services.length} services, ` +
      `${combos.filter((c) => c.published && site.publishedBatches.includes(c.batch)).length} location pages ` +
      `across ${townsLive.size}/${locations.length} towns`,
  );
  process.exit(0);
}

const batch = Number(target);
if (!Number.isInteger(batch) || batch < 0 || batch > 3) {
  console.error(`Batch must be 0, 1, 2 or 3. Got "${target}".`);
  process.exit(1);
}

const affected = combos.filter((c) => c.batch === batch);
const toFlip = affected.filter((c) => c.published === unpublish);

console.log(
  `${unpublish ? 'Unpublishing' : 'Publishing'} batch ${batch}: ` +
    `${toFlip.length} combo(s) to flip, ${affected.length} in batch.`,
);

if (dryRun) {
  for (const c of toFlip.slice(0, 10)) console.log(`  ${c.serviceSlug}/${c.townSlug}/`);
  if (toFlip.length > 10) console.log(`  ...and ${toFlip.length - 10} more`);
  console.log('\n(dry run, nothing written)');
  process.exit(0);
}

for (const c of combos) {
  if (c.batch === batch) c.published = !unpublish;
}
write('combos.json', combos);

const set = new Set(site.publishedBatches);
if (unpublish) set.delete(batch);
else set.add(batch);
site.publishedBatches = [...set].sort((a, b) => a - b);
write('site.json', site);

console.log(`published batches now: [${site.publishedBatches.join(', ')}]`);
console.log('Run `npm run build` to regenerate.');
