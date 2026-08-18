/**
 * Phone and WhatsApp link construction.
 *
 * Two jobs:
 *
 * 1. Degrade safely while contact details are still `[PLACEHOLDER]`. A tel:
 *    link to "[PHONE_E164]" is a dead link that looks live, which is worse than
 *    no link. Callers get `null` and fall back to the contact page.
 *
 * 2. Carry page context into every WhatsApp message. Each page's link
 *    pre-fills what the enquiry is about, so every conversation is
 *    self-attributing without any tracking parameter.
 */

import { company } from './data';

const isPlaceholder = (v: string): boolean => /^\[.*\]$/.test(v);

export const hasPhone = (): boolean => !isPlaceholder(company.phone);
export const hasWhatsApp = (): boolean => !isPlaceholder(company.whatsappNumber);

/** `tel:` href, or null while the number is a placeholder. */
export const phoneHref = (): string | null => (hasPhone() ? `tel:${company.phone}` : null);

/** What to show when a number is not yet configured. */
export const phoneLabel = (): string =>
  isPlaceholder(company.phoneDisplay) ? 'Contact us' : company.phoneDisplay;

export interface WhatsAppContext {
  /** Service being enquired about, e.g. "deep cleaning". */
  service?: string;
  /** Town, e.g. "Yishun". */
  town?: string;
  /** Property type, e.g. "4-room HDB". */
  propertyType?: string;
}

/**
 * Builds the pre-filled message. Reads as something a person would actually
 * type, because it appears in their WhatsApp compose box before they send it.
 *
 *   "Hi, I'd like a quote for deep cleaning a 4-room HDB in Yishun."
 */
export function whatsappMessage(ctx: WhatsAppContext = {}): string {
  const parts = ['Hi, I would like a quote for'];

  parts.push(ctx.service ? ctx.service.toLowerCase() : 'home cleaning');
  if (ctx.propertyType) parts.push(`a ${ctx.propertyType}`);
  if (ctx.town) parts.push(`in ${ctx.town}`);

  return `${parts.join(' ')}.`;
}

/** wa.me href with the context pre-filled, or null while unconfigured. */
export function whatsappHref(ctx: WhatsAppContext = {}): string | null {
  if (!hasWhatsApp()) return null;
  return `https://wa.me/${company.whatsappNumber}?text=${encodeURIComponent(whatsappMessage(ctx))}`;
}
