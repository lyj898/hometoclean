/**
 * Title and meta description construction, with the length limits enforced at
 * build time rather than checked by hand afterwards.
 *
 * Limits are an acceptance criterion: title <= 60 chars, description <= 155.
 * An over-length title is a build failure, not a warning, because it is
 * invisible in review and gets truncated in the SERP.
 */

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 155;
const DESCRIPTION_MIN = 70;

export interface Meta {
  title: string;
  description: string;
}

/** Fails the build on an over-length title so it cannot ship silently. */
export function title(text: string): string {
  const t = text.trim();
  if (!t) throw new Error('Title is empty');
  if (t.length > TITLE_MAX) {
    throw new Error(`Title is ${t.length} chars (max ${TITLE_MAX}): "${t}"`);
  }
  return t;
}

export function description(text: string): string {
  const d = text.trim().replace(/\s+/g, ' ');
  if (!d) throw new Error('Meta description is empty');
  if (d.length > DESCRIPTION_MAX) {
    throw new Error(`Meta description is ${d.length} chars (max ${DESCRIPTION_MAX}): "${d}"`);
  }
  if (d.length < DESCRIPTION_MIN) {
    throw new Error(`Meta description is only ${d.length} chars (min ${DESCRIPTION_MIN}): "${d}"`);
  }
  return d;
}

export const meta = (t: string, d: string): Meta => ({ title: title(t), description: description(d) });

/**
 * Truncates at a word boundary to fit a limit. Use when assembling a
 * description from data whose length is not controlled by the template, so a
 * long housingProfile cannot break the build.
 */
export function fit(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:\s]+$/, '')}…`;
}
