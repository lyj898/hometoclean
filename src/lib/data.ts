/**
 * The single place raw JSON becomes typed data.
 *
 * JSON cannot express the literal unions the types declare (Batch,
 * PricingModel, PriceConfidence, PropertyCategory), so the assertions here are
 * the one narrowing point in the codebase. They are safe because
 * scripts/validate-data.mjs enforces exactly those constraints at build time
 * and fails the build otherwise — see `npm run validate`.
 *
 * Templates import from here, never from the JSON directly.
 */

import servicesRaw from '../data/services.json';
import locationsRaw from '../data/locations.json';
import propertyTypesRaw from '../data/propertyTypes.json';
import combosRaw from '../data/combos.json';
import companyRaw from '../data/company.json';
import siteRaw from '../data/site.json';

import type { Batch, Combo, Company, Location, PropertyType, Service } from '../types';

export const services = servicesRaw as unknown as Service[];
export const locations = locationsRaw as unknown as Location[];
export const propertyTypes = propertyTypesRaw as unknown as PropertyType[];
export const combos = combosRaw as unknown as Combo[];
export const company = companyRaw as unknown as Company;

const publishedBatches = new Set<Batch>(siteRaw.publishedBatches as Batch[]);

/**
 * Whether the registered UEN is available to display. Empty or an unresolved
 * `[PLACEHOLDER]` means every render site omits it rather than printing a
 * broken-looking literal. Set company.uen to publish it everywhere at once.
 */
export const hasUen = (): boolean =>
  Boolean(company.uen) && company.uen.trim().length > 0 && !/^\[.*\]$/.test(company.uen);

/** Whether a batch is live. Controls page generation and sitemap inclusion. */
export const isBatchPublished = (batch: Batch): boolean => publishedBatches.has(batch);

// --- lookups ----------------------------------------------------------------
// These throw rather than return undefined. A missing slug at build time is a
// data bug that should stop the build, not silently produce a broken page.

const index = <T extends { slug: string }>(rows: T[]) => new Map(rows.map((r) => [r.slug, r]));

const serviceIndex = index(services);
const locationIndex = index(locations);
const propertyTypeIndex = index(propertyTypes);

export function getService(slug: string): Service {
  const found = serviceIndex.get(slug);
  if (!found) throw new Error(`Unknown service slug: "${slug}"`);
  return found;
}

export function getLocation(slug: string): Location {
  const found = locationIndex.get(slug);
  if (!found) throw new Error(`Unknown location slug: "${slug}"`);
  return found;
}

export function getPropertyType(slug: string): PropertyType {
  const found = propertyTypeIndex.get(slug);
  if (!found) throw new Error(`Unknown property type slug: "${slug}"`);
  return found;
}

// --- published sets ---------------------------------------------------------
// Every route derives from these. No template hardcodes a page list.

export const publishedServices = (): Service[] => services.filter((s) => isBatchPublished(s.batch));

export const publishedPropertyTypes = (): PropertyType[] =>
  propertyTypes.filter((p) => isBatchPublished(p.batch));

/** A location page needs its combo flagged published AND its batch live. */
export const publishedCombos = (): Combo[] =>
  combos.filter((c) => c.published && isBatchPublished(c.batch));

/** Towns that have at least one published location page. */
export const publishedLocations = (): Location[] => {
  const live = new Set(publishedCombos().map((c) => c.townSlug));
  return locations.filter((l) => live.has(l.slug));
};

/** Published location pages for one service, in data order. */
export const publishedTownsForService = (serviceSlug: string): Location[] => {
  const live = new Set(
    publishedCombos()
      .filter((c) => c.serviceSlug === serviceSlug)
      .map((c) => c.townSlug),
  );
  return locations.filter((l) => live.has(l.slug));
};

/** Published location pages for one town, in data order. */
export const publishedServicesForTown = (townSlug: string): Service[] => {
  const live = new Set(
    publishedCombos()
      .filter((c) => c.townSlug === townSlug)
      .map((c) => c.serviceSlug),
  );
  return services.filter((s) => live.has(s.slug));
};

/** Adjacent towns that actually have a published page for this service. */
export const linkableAdjacentTowns = (townSlug: string, serviceSlug: string): Location[] => {
  const town = getLocation(townSlug);
  const live = new Set(
    publishedCombos()
      .filter((c) => c.serviceSlug === serviceSlug)
      .map((c) => c.townSlug),
  );
  return town.adjacentSlugs.filter((s) => live.has(s)).map(getLocation);
};

/** Related services, resolved and filtered to those actually published. */
export const relatedServices = (service: Service): Service[] =>
  service.relatedServiceSlugs.map(getService).filter((s) => isBatchPublished(s.batch));

/** The property types this town is actually built from. */
export const dominantPropertyTypes = (town: Location): PropertyType[] =>
  town.dominantPropertyTypes.map(getPropertyType);
