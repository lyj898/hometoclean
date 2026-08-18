/**
 * JSON-LD builders. One graph per page, emitted by BaseLayout.
 *
 * Deliberate omissions, which are not oversights:
 *
 *   - No `LocalBusiness` on location pages. We have no premises in these towns.
 *     Claiming otherwise is a misrepresentation and a spam signal.
 *   - No `AggregateRating` anywhere, until reviews have genuinely been
 *     collected. Inventing one is fabrication.
 *   - `FAQPage` is available but off by default. FAQ sections exist for users.
 *     Google deprecated FAQ rich results in May 2026, so this is not a ranking
 *     lever and should not be treated as one.
 */

import { company } from './data';
import { ORIGIN, canonical, type Path } from './urls';
import type { Faq, Location, Service } from '../types';

/** Stable @id for the single Organization node. Everything else references it. */
export const ORG_ID = `${ORIGIN}/#org`;

type JsonLdNode = Record<string, unknown>;

const isPlaceholder = (v: string): boolean => /^\[.*\]$/.test(v);
/**
 * Omit unresolved `[PLACEHOLDER]` values AND empty strings rather than
 * publishing them. Emitting `"telephone": ""` is worse than omitting the key:
 * it asserts the organisation has a blank phone number.
 */
const real = (v: string): string | undefined =>
  !v || !v.trim() || isPlaceholder(v) ? undefined : v;

/** Drops undefined values so the emitted JSON-LD carries no empty keys. */
const compact = (node: JsonLdNode): JsonLdNode =>
  Object.fromEntries(Object.entries(node).filter(([, v]) => v !== undefined && v !== null));

/**
 * The Organization node. Exactly one per site, carried in the base layout on
 * every page so the @id is always resolvable.
 */
export function organizationNode(): JsonLdNode {
  const { address } = company;
  const street = real(address.street);
  const postalCode = real(address.postalCode);

  const postalAddress =
    street || postalCode
      ? compact({
          '@type': 'PostalAddress',
          streetAddress: [street, real(address.unit)].filter(Boolean).join(' ') || undefined,
          postalCode,
          addressLocality: address.locality,
          addressCountry: address.country,
        })
      : undefined;

  return compact({
    '@type': 'Organization',
    '@id': ORG_ID,
    name: company.entityName,
    alternateName: company.tradingName,
    url: `${ORIGIN}/`,
    foundingDate: String(company.yearEstablished),
    description: company.businessModelStatement,
    // UEN is the Singapore company registration number.
    identifier: real(company.uen)
      ? { '@type': 'PropertyValue', name: 'UEN', value: company.uen }
      : undefined,
    address: postalAddress,
    telephone: real(company.phone),
    // The inbox address is deliberately NOT published here. Contact is
    // form-only, and an email in structured data on every page is a
    // spam-harvesting target. Point at the form instead.
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: `${ORIGIN}/contact/`,
      areaServed: 'SG',
      availableLanguage: 'English',
    },
    areaServed: { '@type': 'Country', name: 'Singapore' },
  });
}

/**
 * Service node for service and location pages.
 *
 * `provider` references the Organization by @id rather than repeating it, so
 * there is one authoritative entity description on the site.
 */
export function serviceNode(service: Service, pagePath: Path, town?: Location): JsonLdNode {
  return compact({
    '@type': 'Service',
    '@id': `${canonical(pagePath)}#service`,
    name: town ? `${service.name} in ${town.name}` : service.name,
    serviceType: service.name,
    description: service.shortDescription,
    url: canonical(pagePath),
    provider: { '@id': ORG_ID },
    areaServed: town
      ? { '@type': 'Place', name: `${town.name}, Singapore` }
      : { '@type': 'Country', name: 'Singapore' },
  });
}

export interface Crumb {
  name: string;
  path: Path;
}

/** BreadcrumbList for nested pages. Omitted on the homepage. */
export function breadcrumbNode(crumbs: Crumb[], pagePath: Path): JsonLdNode {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${canonical(pagePath)}#breadcrumb`,
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: canonical(c.path),
    })),
  };
}

/** Optional. Off by default — see the module comment. */
export function faqNode(faqs: Faq[], pagePath: Path): JsonLdNode {
  return {
    '@type': 'FAQPage',
    '@id': `${canonical(pagePath)}#faq`,
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function webPageNode(pagePath: Path, title: string, description: string): JsonLdNode {
  return {
    '@type': 'WebPage',
    '@id': `${canonical(pagePath)}#webpage`,
    url: canonical(pagePath),
    name: title,
    description,
    isPartOf: { '@id': `${ORIGIN}/#website` },
    about: { '@id': ORG_ID },
  };
}

export function webSiteNode(): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': `${ORIGIN}/#website`,
    url: `${ORIGIN}/`,
    name: company.tradingName,
    publisher: { '@id': ORG_ID },
    inLanguage: 'en-SG',
  };
}

/** Wraps nodes into the single @graph emitted per page. */
export const graph = (nodes: JsonLdNode[]): string =>
  JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes });
