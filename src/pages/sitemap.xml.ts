/**
 * sitemap.xml, generated from the data files.
 *
 * Canonical URLs only, and only pages whose batch is live. A page that is built
 * for review but not yet published carries `noindex` and must not appear here —
 * submitting a noindex URL in a sitemap is a contradictory signal.
 *
 * Astro's official sitemap integration is deliberately not used: it emits every
 * built route, which would leak unpublished batches into the sitemap.
 */
import type { APIRoute } from 'astro';
import {
  publishedServices,
  publishedPropertyTypes,
  publishedCombos,
  isBatchPublished,
  getService,
} from '../lib/data';
import { canonical, urls, type Path } from '../lib/urls';

const escape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: APIRoute = () => {
  const paths: Path[] = [];

  // Batch 0: core pages.
  if (isBatchPublished(0)) {
    paths.push(
      urls.home(),
      urls.areas(),
      urls.vendorStandards(),
      urls.pricing(),
      urls.about(),
      urls.contact(),
      urls.privacy(),
      urls.terms(),
    );
  }

  // Batch 1: services and property types.
  for (const s of publishedServices()) paths.push(urls.service(s.slug));
  for (const p of publishedPropertyTypes()) paths.push(urls.propertyType(p.slug));

  // Batches 2-3: location pages, gated by the per-combo published flag.
  for (const c of publishedCombos()) {
    if (isBatchPublished(getService(c.serviceSlug).batch)) {
      paths.push(urls.location(c.serviceSlug, c.townSlug));
    }
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${escape(canonical(p))}</loc></url>`).join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
