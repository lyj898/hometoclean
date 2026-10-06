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
      // Empty-string properties assert a blank value rather than absence.
      const blanks = Object.entries(nodes.find((n) => n['@type'] === 'Organization') ?? {})
        .filter(([, v]) => v === '')
        .map(([k]) => k);
      if (blanks.length) {
        err(`${p.route}: Organization node has empty-string ${blanks.join(', ')} — omit the key instead`);
      }
      const orgs = types.filter((t) => t === 'Organization').length;
      if (orgs > 1) err(`${p.route}: ${orgs} Organization nodes; there must be exactly one`);
      // The family names no company (6 Oct 2026): the Organization is the brand,
      // a child of OurKampung, with nothing borrowed from SKAP or Junk to Clear.
      const org = nodes.find((n) => n['@type'] === 'Organization') ?? {};
      for (const key of ['legalName', 'foundingDate', 'identifier', 'address', 'sameAs']) {
        if (key in org) err(`${p.route}: Organization has ${key}; the family names no company`);
      }
      if (org.parentOrganization?.name !== 'OurKampung') {
        err(`${p.route}: Organization's parentOrganization must be OurKampung`);
      }
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

// --- word counts ------------------------------------------------------------
// Minimum body copy per page type. A page that is too thin to be useful should
// not be published, and "too thin" needs to be measured, not eyeballed.
const MIN_WORDS = { service: 800, location: 500, property: 700 };

const bodyWords = (html) => {
  const main = (html.match(/<main[^>]*>([\s\S]*?)<\/main>/) ?? [])[1] ?? '';
  return main
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
};

const pageKind = (route) => {
  const seg = route.split('/').filter(Boolean);
  // /cleaning/{service}/       -> 2 segments -> service page
  // /cleaning/{service}/{town}/-> 3 segments -> location page
  if (seg[0] === 'cleaning') return seg.length === 2 ? 'service' : 'location';
  if (seg[0] === 'property') return 'property';
  return null;
};

for (const p of pages.values()) {
  const kind = pageKind(p.route);
  if (!kind) continue;
  const n = bodyWords(p.html);
  const min = MIN_WORDS[kind];
  if (n < min) err(`${p.route}: ${kind} page has ${n} words of body copy (min ${min})`);
}

// --- property pages must not be one page with the noun swapped ---------------
// On 25 Sep 2026 the 3-room and 5-room pages shared 54% of their sentences.
// Sentences are compared after replacing each page's own type name with a
// placeholder, so a sentence that differs only by "3-room" vs "5-room" counts
// as shared: that is exactly the swap test.
{
  const pts = JSON.parse(readFileSync(join(root, 'src', 'data', 'propertyTypes.json'), 'utf8'));
  const MAX_SHARED = 0.2;
  const sentencesOf = (route) => {
    const pt = pts.find((x) => route === `/property/${x.slug}/`);
    let t = ((pages.get(route).html.match(/<main[^>]*>([\s\S]*?)<\/main>/) ?? [])[1] ?? '')
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;|&#\d+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (pt) {
      const inline = pt.name.charAt(0).toLowerCase() + pt.name.slice(1);
      for (const form of [pt.name, inline, pt.name.toLowerCase()]) t = t.split(form).join('{TYPE}');
    }
    return new Set(
      t.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter((x) => x.split(/\s+/).length > 6),
    );
  };
  const routes = [...pages.keys()].filter((r) => /^\/property\/[^/]+\/$/.test(r)).sort();
  const sets = new Map(routes.map((r) => [r, sentencesOf(r)]));
  let worst = { ratio: 0, a: '', b: '' };
  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      const a = sets.get(routes[i]);
      const b = sets.get(routes[j]);
      const shared = [...a].filter((x) => b.has(x)).length;
      const ratio = shared / Math.min(a.size, b.size);
      if (ratio > worst.ratio) worst = { ratio, a: routes[i], b: routes[j] };
      if (ratio > MAX_SHARED) {
        err(`${routes[i]} and ${routes[j]} share ${Math.round(ratio * 100)}% of their sentences (max ${MAX_SHARED * 100}%)`);
      }
    }
  }
  if (routes.length > 1) {
    console.log(`property pages: most-similar pair ${worst.a} / ${worst.b} at ${Math.round(worst.ratio * 100)}% shared`);
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

// GitHub Pages specifics. Both are easy to lose and both break the live site
// silently rather than loudly.
if (!existsSync(join(dist, '.nojekyll'))) {
  err('.nojekyll missing from dist — GitHub Pages runs Jekyll, which strips _astro/ and every stylesheet 404s');
}
if (!existsSync(join(dist, 'CNAME'))) {
  err('CNAME missing from dist — GitHub Pages drops the custom domain on deploy without it');
} else {
  const domain = readFileSync(join(dist, 'CNAME'), 'utf8').trim();
  if (domain !== 'hometoclean.com') err(`CNAME is "${domain}", expected hometoclean.com`);
}

// Contact is form-only: no WhatsApp or telephone links anywhere on the site.
for (const p of pages.values()) {
  if (/href="https:\/\/wa\.me\//.test(p.html)) err(`${p.route}: contains a wa.me link (contact is form-only)`);
  if (/href="tel:/.test(p.html)) err(`${p.route}: contains a tel: link (contact is form-only)`);
}

// --- family links --------------------------------------------------------------
// Every page carries the footer's "Part of OurKampung" link, nofollow: a JTC
// family rule, because the link is for readers, not rankings. No link anywhere
// may carry noreferrer, which hides the visit's source from the receiving
// site's GA4.
{
  const { family } = JSON.parse(readFileSync(join(root, 'src', 'data', 'company.json'), 'utf8'));
  for (const p of pages.values()) {
    const anchors = p.html.match(/<a\b[^>]*>/g) ?? [];
    const footerLink = anchors.find((a) => a.includes(`href="${family.url}"`));
    if (!footerLink) err(`${p.route}: no footer link to ${family.url}`);
    else if (!/\brel="[^"]*\bnofollow\b/.test(footerLink)) {
      err(`${p.route}: the footer link to ${family.url} must be rel="nofollow"`);
    }
    if (anchors.some((a) => /\brel="[^"]*\bnoreferrer\b/.test(a))) {
      err(`${p.route}: a link carries rel="noreferrer", which hides the visit from the receiving site's GA4`);
    }
  }
  if (!pages.get('/about/')?.html.includes(`href="${family.sitesUrl}"`)) {
    err(`/about/: no link to ${family.sitesUrl}`);
  }
}

// --- independence (6 Oct 2026) ------------------------------------------------
// The OurKampung family names no company. Nothing belonging to SKAP or Junk to
// Clear (its name, a founding year, "trading as") may reach a page. Junk to
// Clear is a separate company the family refers disposal, clearance and
// renovation jobs to; this site has no page where that is the reader's next
// step, so it links it nowhere (jtc-family/briefs/independence.md, rule 6).
{
  const BORROWED = /SKAP|Waste Management|trading (?:as|name)|team behind Junk to Clear|(?:established|since) 2009/i;
  for (const p of pages.values()) {
    const hit = p.html.match(BORROWED);
    if (hit) err(`${p.route}: contains "${hit[0]}"; the family names no company`);
    if (/href="https?:\/\/(?:www\.)?junktoclear\.com\.sg/i.test(p.html)) {
      err(`${p.route}: links Junk to Clear, but no page on this site has disposal as the next step`);
    }
  }
}

// --- no email address in rendered content -------------------------------------
// The form posts to FormSubmit's hashed alias, never a raw inbox address, so no
// page has any reason to contain an email address. One that does is a target
// for spam harvesters. The form's placeholder is the only exception.
{
  const endpoint = JSON.parse(
    readFileSync(join(root, 'src', 'data', 'company.json'), 'utf8'),
  ).formSubmit.endpoint;
  if (endpoint.includes('@')) {
    err('company.json: the FormSubmit endpoint is a raw inbox address; use FormSubmit\'s hashed alias');
  }

  const PLACEHOLDERS = new Set(['you@email.com']);
  for (const p of pages.values()) {
    for (const [address] of p.html.matchAll(/[\w.%+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/gi)) {
      if (!PLACEHOLDERS.has(address)) err(`${p.route}: contains an email address (${address})`);
    }
    if (p.html.includes(endpoint) && p.route !== '/contact/') {
      err(`${p.route}: FormSubmit endpoint should only be on /contact/`);
    }
  }
}

// --- no unresolved placeholders in rendered output ---------------------------
// A literal "[POSTAL_CODE]" on a live page looks broken and is worse than
// omitting the field. Every company.json value is optional and guarded, so this
// should never fire.
for (const p of pages.values()) {
  const found = [...new Set(p.html.match(/\[[A-Z][A-Z_0-9]{2,}\]/g) ?? [])];
  if (found.length) {
    err(`${p.route}: unresolved placeholder(s) rendered: ${found.join(', ')}`);
  }
}

// --- report -----------------------------------------------------------------
for (const w of warnings) console.warn(`  warn  ${w}`);
for (const e of errors) console.error(`  ERROR ${e}`);

console.log(`\npages audited: ${pages.size}`);
console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
