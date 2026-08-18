/**
 * Typed access to the PUBLIC_ environment variables.
 *
 * Both are optional by design, and the site degrades honestly without them:
 * no GA4 ID means no analytics script is emitted at all, and no lead endpoint
 * means the form says so instead of pretending to submit.
 */

const clean = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** GA4 measurement ID, e.g. "G-XXXXXXXXXX". Empty when unconfigured. */
export const GA4_ID: string = clean(import.meta.env['PUBLIC_GA4_ID']);

/** Endpoint the lead form POSTs JSON to. Empty when unconfigured. */
export const LEAD_ENDPOINT: string = clean(import.meta.env['PUBLIC_LEAD_ENDPOINT']);

export const hasAnalytics = (): boolean => GA4_ID.length > 0;
export const hasLeadEndpoint = (): boolean => LEAD_ENDPOINT.length > 0;
