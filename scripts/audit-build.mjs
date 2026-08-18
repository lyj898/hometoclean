// Audits dist/ against the acceptance criteria. Run after `npm run build`:
//
//   node scripts/audit-build.mjs
//
// Checks:
//   - every internal link resolves to a built page
//   - no orphan pages (every published page is linked from somewhere)
//   - unique title (<=60 chars) and meta description (<=155) on every page
//   - self-referencing absolute canonical on every page
//   - JSON-LD present and parseable, with no LocalBusiness or AggregateRating
//   - trailing slashes consistent with trailingSlash: 'always'
//   - sitemap contains only canonical URLs of indexable pages, and no noindex ones

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const ORIGIN = 'https://hometoclean.com';

if (!existsSync(dist)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// --- collect built pages ----------------------------------------------------
const htmlFiles = [];
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) htmlFiles.push(full);
  }
})(dist);

/** dist/cleaning/x/index.html -> /cleaning/x/ ; dist/404.html -> /404.html */
const toRoute = (file) => {
  const rel = file.slice(dist.length).replace(/\\/g, '/');
  return rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
};

const pages = new Map();
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const route = toRoute(file);
  const pick = (re) => (html.match(re) ?? [])[1];
  pages.set(route, {
    route,
    html,
    title: pick(/<title>([\s\S]*?)<\/title>/),
    description: pick(/<meta name="description" content="([^"]*)"/),
    canonical: pick(/<link rel="canonical" href="([^"]*)"/),
    robots: pick(/<meta name="robots" content="([^"]*)"/),
    jsonLd: pick(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/),
  });
}

const decode = (s) =>
  (s ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&#38;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

// --- per-page checks --------------------------------------------------------
const titles = new Map();
const descriptions = new Map();

for (const p of pages.values()) {
  const isErrorPage = p.route === '/404.html';

  if (!p.title) err(`${p.route}: no <title>`);
  else {
    const t = decode(p.title);
    if (t.length > 60) err(`${p.route}: title is ${t.length} chars (max 60): "${t}"`);
    if (titles.has(t)) err(`${p.route}: duplicate title, also on ${titles.get(t)}: "${t}"`);
    else titles.set(t, p.route);
  }

  if (!p.description) err(`${p.route}: no meta description`);
  else {
    const d = decode(p.description);
    if (d.length > 155) err(`${p.route}: meta description is ${d.length} chars (max 155)`);
    if (descriptions.has(d)) {
      err(`${p.route}: duplicate meta description, also on ${descriptions.get(d)}`);
    } else descriptions.set(d, p.route);
  }

  if (!p.canonical) err(`${p.route}: no canonical`);
  else {
    if (!p.canonical.startsWith(`${ORIGIN}/`)) {
      err(`${p.route}: canonical is not absolute on ${ORIGIN}: "${p.canonical}"`);
    }
    // Self-referencing: canonical must point at this very page.
    const expected = isErrorPage ? `${ORIGIN}/404/` : `${ORIGIN}${p.route}`;
    if (p.canonical !== expected) {
      err(`${p.route}: canonical "${p.canonical}" is not self-referencing (expected "${expected}")`);
    }
    if (p.canonical !== `${ORIGIN}/` && !p.canonical.endsWith('/')) {
      err(`${p.route}: canonical lacks a trailing slash: "${p.canonical}"`);
    }
  }

  if (!p.jsonLd) err(`${p.route}: no JSON-LD script tag`);
  else {
    try {
      const parsed = JSON.parse(p.jsonLd);
      const nodes = parsed['@graph'] ?? [];
      const types = nodes.map((n) => n['@type']);
      if (!types.includes('Organization')) err(`${p.route}: JSON-LD has no Organization node`);
      if (types.includes('LocalBusiness')) {
        err(`${p.route}: JSON-LD contains LocalBusiness — we have no premises in these towns`);
      }
      if (JSON.stringify(parsed).includes('AggregateRating')) {
        err(`${p.route}: JSON-LD contains AggregateRating — no reviews have been collected`);
      }
      const orgs = types.filter((t) => t === 'Organization').length;
      if (orgs > 1) err(`${p.route}: ${orgs} Organization nodes; there must be exactly one`);
      // Nested pages need a breadcrumb.
      const depth = p.route.split('/').filter(Boolean).length;
      if (depth >= 1 && !isErrorPage && !types.includes('BreadcrumbList')) {
        warn(`${p.route}: nested page with no BreadcrumbList`);
      }
    } catch (e) {
      err(`${p.route}: JSON-LD does not parse: ${e.message}`);
    }
  }
}

// --- internal links ---------------------------------------------------------
const linkedTo = new Set();
for (const p of pages.values()) {
  const hrefs = [...p.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  for (const href of hrefs) {
    if (/^(https?:|mailto:|tel:|#)/.test(href)) continue;
    const clean = href.split('#')[0].split('?')[0];
    if (!clean) continue;
    if (!clean.startsWith('/')) {
      err(`${p.route}: relative internal link "${href}" (must be root-relative)`);
      continue;
    }
    if (clean !== '/' && !clean.endsWith('/') && !/\.[a-z0-9]+$/i.test(clean)) {
      err(`${p.route}: internal link lacks a trailing slash: "${href}"`);
    }
    linkedTo.add(clean);
    const isFile = /\.[a-z0-9]+$/i.test(clean);
    const exists = pages.has(clean) || (isFile && existsSync(join(dist, clean)));
    if (!exists) err(`${p.route}: broken internal link "${href}" (no such page)`);
  }
}

// --- orphans ----------------------------------------------------------------
for (const p of pages.values()) {
  if (p.route === '/' || p.route === '/404.html') continue;
  if (!linkedTo.has(p.route)) {
    warn(`${p.route}: orphan — no internal page links to it`);
  }
}

// --- sitemap ----------------------------------------------------------------
const sitemapPath = join(dist, 'sitemap.xml');
if (!existsSync(sitemapPath)) err('sitemap.xml not built');
else {
  const xml = readFileSync(sitemapPath, 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (!locs.length) err('sitemap.xml contains no URLs');
  const seen = new Set();
  for (const loc of locs) {
    if (seen.has(loc)) err(`sitemap.xml: duplicate URL ${loc}`);
    seen.add(loc);
    if (!loc.startsWith(`${ORIGIN}/`)) err(`sitemap.xml: URL not on ${ORIGIN}: ${loc}`);
    const route = loc.slice(ORIGIN.length);
    const page = pages.get(route);
    if (!page) {
      err(`sitemap.xml: ${loc} has no corresponding built page`);
    } else if (page.robots?.includes('noindex')) {
      err(`sitemap.xml: ${loc} is noindex but listed in the sitemap`);
    }
  }
  // Every indexable page should be in the sitemap.
  for (const p of pages.values()) {
    if (p.route === '/404.html') continue;
    if (p.robots?.includes('noindex')) continue;
    if (!seen.has(`${ORIGIN}${p.route}`)) {
      warn(`${p.route} is indexable but missing from sitemap.xml`);
    }
  }
  console.log(`sitemap.xml: ${locs.length} URL(s)`);
}

if (!existsSync(join(dist, 'robots.txt'))) err('robots.txt not built');
if (!existsSync(join(dist, '_redirects'))) err('_redirects not copied to dist');
if (!existsSync(join(dist, '_headers'))) err('_headers not copied to dist');

// --- report -----------------------------------------------------------------
for (const w of warnings) console.warn(`  warn  ${w}`);
for (const e of errors) console.error(`  ERROR ${e}`);

console.log(`\npages audited: ${pages.size}`);
console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
