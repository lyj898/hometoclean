/**
 * Per-property-type pricing and the prose tokens that quote it.
 *
 * The rule throughout: show a figure only where it comes from researched data
 * or from arithmetic on researched data. Everything else renders as "quoted
 * per job". An invented number on a pricing page is worse than no number.
 */

import { services } from './data';
import type { PropertyType, Range, Service } from '../types';

export interface PriceEstimate extends Range {
  /** How the figure was arrived at. Shown under it, so it is never mistaken for a quote. */
  basis: string;
}

const sgd = (n: number): string => n.toLocaleString('en-SG');

/** "S$380–550", with thousands separators. */
export const sgdRange = (r: Range): string => `S$${sgd(r.min)}–${sgd(r.max)}`;

/** "5 to 7 hours", or "3 hours" when the ends meet. */
export const hoursRange = (r: Range): string =>
  r.min === r.max ? `${r.min} hours` : `${r.min} to ${r.max} hours`;

const FLAT_RATE_BASIS: Record<string, string> = {
  flat_rate_by_property_size: 'flat rate for the job',
  flat_rate_by_size_and_debris: 'flat rate; rises with the amount of debris',
  flat_rate_by_property_size_seasonal: 'flat rate, before any Chinese New Year surcharge',
};

/**
 * What one service typically costs for one property type, or null where no
 * researched figure exists.
 */
export function priceFor(service: Service, pt: PropertyType): PriceEstimate | null {
  const { min, max, minimumHours } = service.priceRangeSGD;

  if (service.pricingModel === 'hourly') {
    // A landed session is often two cleaners at once, so hours x one hourly
    // rate would understate it, possibly by half. Leave it to the quote.
    if (min === null || max === null || pt.category === 'landed') return null;
    const floor = minimumHours ?? 0;
    const lo = Math.max(pt.regularCleanHours.min, floor);
    const hi = Math.max(pt.regularCleanHours.max, floor);
    const hours = lo === hi ? `${lo} hours` : `${lo}–${hi} hours`;
    return { min: lo * min, max: hi * max, basis: `per session: ${hours} at S$${min}–${max} an hour` };
  }

  if (service.pricingModel === 'per_item') {
    if (min === null || max === null) return null;
    return { min, max, basis: 'per item, whatever the size of the home' };
  }

  const fixed = service.priceByProperty?.[pt.slug];
  if (!fixed) return null;
  return { ...fixed, basis: FLAT_RATE_BASIS[service.pricingModel] ?? 'flat rate for the job' };
}

/** What to say where priceFor returns null. */
export const unpricedLabel = (pt: PropertyType): string =>
  pt.category === 'landed' ? 'Quoted after a site visit' : 'Quoted per job';

/** Tokens property copy may use. validate-data.mjs rejects any other. */
export const PROPERTY_TOKENS = [
  'floorArea',
  'routineHours',
  'deepHours',
  'deepPrice',
  'sessionPrice',
] as const;

/**
 * Resolves {tokens} in property copy against that type's data. Throws on a
 * token that cannot be resolved for this type, which fails the build rather
 * than shipping a sentence with a hole in it.
 */
export function fillPropertyTokens(text: string, pt: PropertyType): string {
  const hourly = services.find((s) => s.pricingModel === 'hourly');
  const session = hourly ? priceFor(hourly, pt) : null;

  const values: Record<string, string | null> = {
    floorArea: `${pt.floorAreaSqm.min} to ${pt.floorAreaSqm.max} square metres`,
    routineHours: hoursRange(pt.regularCleanHours),
    deepHours: hoursRange(pt.deepCleanHours),
    deepPrice: pt.deepCleanFlatRateSGD ? sgdRange(pt.deepCleanFlatRateSGD) : null,
    sessionPrice: session ? sgdRange(session) : null,
  };

  return text.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    if (value === undefined) throw new Error(`Unknown token {${key}} in copy for ${pt.slug}`);
    if (value === null) throw new Error(`Token {${key}} has no value for ${pt.slug}`);
    return value;
  });
}
