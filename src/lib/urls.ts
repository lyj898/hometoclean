/**
 * Every URL on the site is built here. Nothing constructs a path by hand.
 *
 * Rules, which are a one-way door and must not drift:
 *   - trailing slash on everything except root
 *   - lowercase, hyphenated, no stopwords, no dates
 *   - canonicals are absolute https://hometoclean.com/... with no exceptions
 *
 * `trailingSlash: 'always'` in astro.config.mjs, the paths below, and the
 * _redirects rules must agree. Slash / no-slash duplication splits ranking
 * signal, and it is not recoverable cheaply once indexed.
 */

import { company } from './data';

/** Absolute origin, no trailing slash. e.g. "https://hometoclean.com" */
export const ORIGIN = company.siteUrl;

/** A site-root-relative path. Always starts with "/", always ends with "/". */
export type Path = `/${string}/` | '/';

const path = (...segments: string[]): Path =>
  segments.length === 0 ? '/' : (`/${segments.join('/')}/` as Path);

export const urls = {
  home: (): Path => '/',

  service: (serviceSlug: string): Path => path('cleaning', serviceSlug),

  location: (serviceSlug: string, townSlug: string): Path =>
    path('cleaning', serviceSlug, townSlug),

  propertyType: (typeSlug: string): Path => path('property', typeSlug),

  areas: (): Path => path('areas'),
  vendorStandards: (): Path => path('vendor-standards'),
  pricing: (): Path => path('pricing'),
  about: (): Path => path('about'),
  contact: (): Path => path('contact'),
  privacy: (): Path => path('privacy'),
  terms: (): Path => path('terms'),
} as const;

/**
 * Absolute canonical URL for a site path. Every page emits exactly one of
 * these, self-referencing. No page is exempt.
 */
export const canonical = (p: Path): string => `${ORIGIN}${p}`;

/** Guards against a path being built by hand and drifting from the rules. */
export function assertValidPath(p: string): asserts p is Path {
  if (p === '/') return;
  if (!p.startsWith('/')) throw new Error(`Path must start with "/": ${p}`);
  if (!p.endsWith('/')) throw new Error(`Path must end with "/" (trailingSlash: always): ${p}`);
  if (p !== p.toLowerCase()) throw new Error(`Path must be lowercase: ${p}`);
  if (/[^a-z0-9/-]/.test(p)) throw new Error(`Path may only contain a-z, 0-9, "-" and "/": ${p}`);
  if (p.includes('//')) throw new Error(`Path contains an empty segment: ${p}`);
}
