import { SUPPORTED_LOCALES } from '@/config';

import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * A creative's copy — its title and description — written once per locale
 * and stored one row per locale in `ad_creative_translations`.
 *
 * `en` is required and is the fallback for every locale left blank, so a
 * card always has something to render no matter which language the visitor
 * is reading in. The fallback is per field: a locale may carry its own title
 * and lean on the English description, which is why a stored row may have
 * either field NULL, and why the maps here are `Partial`.
 *
 * Copy used to be a single string per field. That worked because a creative
 * was country-targeted (`target_country`) and was therefore written in that
 * one country's language. The targeting only ever existed to point a
 * creative at the right Amazon storefront (amazon.com vs amazon.fr), so it
 * went away with Amazon — and the locale, already a route parameter, is a
 * better lever for the language than a geo lookup ever was: a Japanese
 * speaker browsing from Germany gets Japanese copy, which country targeting
 * could not express.
 */

/** One field's copy as stored: at most one string per locale. */
export type StoredCopy = Partial<Record<Locale, string>>;

/** One field's copy as the admin validator accepts it: `en` must be there. */
export type LocalizedCopy = StoredCopy & { en: string };

/** Both fields of one creative's copy. */
export type CreativeCopy = { title: StoredCopy; description: StoredCopy };

/** A row of `ad_creative_translations`, as read or as about to be written. */
export type CreativeCopyRow = {
  creativeId: string;
  locale: string;
  title: string | null;
  description: string | null;
};

/**
 * One field's copy for `locale`: the locale's own string when the admin wrote
 * one, `en` otherwise. Returns `''` when there is no `en` either, which the
 * validator forbids; the render sites treat empty copy as a blank line
 * rather than throwing.
 */
function copyForLocale(copy: StoredCopy, locale: Locale): string {
  const localized = copy[locale];
  if (localized) return localized;
  return copy.en ?? '';
}

/** The creative's copy as the viewer should read it. */
export function resolveNativeCopy(
  copy: CreativeCopy,
  locale: Locale
): { title: string; description: string } {
  return {
    title: copyForLocale(copy.title, locale),
    description: copyForLocale(copy.description, locale),
  };
}

function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Fold translation rows into each creative's copy maps. A row for a locale
 * the site no longer serves is skipped rather than fatal: nothing could read
 * it, and its creative still has every locale that is served.
 */
export function copyFromTranslationRows(
  rows: readonly CreativeCopyRow[]
): Map<string, CreativeCopy> {
  const byCreative = new Map<string, CreativeCopy>();
  for (const row of rows) {
    if (!isLocale(row.locale)) continue;
    const copy = byCreative.get(row.creativeId) ?? { title: {}, description: {} };
    if (row.title !== null) copy.title[row.locale] = row.title;
    if (row.description !== null) copy.description[row.locale] = row.description;
    byCreative.set(row.creativeId, copy);
  }
  return byCreative;
}

/**
 * The rows that store one creative's copy: one per locale that says
 * something. A locale with neither field gets no row — the table forbids a
 * row that overrides nothing — and keeps falling back to `en`.
 */
export function copyToTranslationRows(creativeId: string, copy: CreativeCopy): CreativeCopyRow[] {
  const rows: CreativeCopyRow[] = [];
  for (const locale of SUPPORTED_LOCALES) {
    const title = copy.title[locale] ?? null;
    const description = copy.description[locale] ?? null;
    if (title === null && description === null) continue;
    rows.push({ creativeId, locale, title, description });
  }
  return rows;
}

/**
 * The stored copy spread over every supported locale, for the admin form. A
 * locale the admin never wrote comes back empty rather than pre-filled with
 * the English fallback, which would silently freeze today's English into
 * every language on the next save.
 */
export function toLocalizedCopyDraft(value: StoredCopy | undefined): Record<Locale, string> {
  const draft = Object.fromEntries(SUPPORTED_LOCALES.map((l) => [l, ''])) as Record<Locale, string>;
  if (!value) return draft;
  for (const locale of SUPPORTED_LOCALES) {
    const localized = value[locale];
    if (typeof localized === 'string') draft[locale] = localized;
  }
  return draft;
}

/**
 * A form draft as the shape that gets stored: blank locales are dropped
 * rather than saved as empty strings, so they keep falling back to `en`
 * instead of rendering a blank card.
 */
export function fromLocalizedCopyDraft(draft: Record<Locale, string>): LocalizedCopy {
  const stored: StoredCopy = {};
  for (const locale of SUPPORTED_LOCALES) {
    const value = draft[locale].trim();
    if (value.length > 0) stored[locale] = value;
  }
  return { ...stored, en: draft.en.trim() };
}
