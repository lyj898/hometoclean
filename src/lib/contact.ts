/**
 * Contact configuration.
 *
 * This site is form-only by design: the enquiry form is the single contact
 * channel. There is no WhatsApp link and no telephone link anywhere on the
 * site, so there is no per-page message context to build.
 *
 * The FormSubmit endpoint lives in company.json rather than an env var because
 * it is not a secret and it must be present in the static build.
 */

import { company } from './data';

const isPlaceholder = (v: string): boolean => /^\[.*\]$/.test(v);

/** Where the enquiry form POSTs. FormSubmit's AJAX endpoint. */
export const FORM_ENDPOINT: string = company.formSubmit.endpoint;

/** Subject line on the email FormSubmit sends. */
export const FORM_SUBJECT: string = company.formSubmit.subject;

export const hasFormEndpoint = (): boolean =>
  FORM_ENDPOINT.length > 0 && !isPlaceholder(FORM_ENDPOINT);

/** Public-facing email, or null while unresolved. */
export const publicEmail = (): string | null =>
  company.email && !isPlaceholder(company.email) ? company.email : null;
