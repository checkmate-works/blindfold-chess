import { SITE_URL, SUPPORTED_LOCALES } from '@/config';

export const BASE_URL = SITE_URL;

/**
 * Generate the `alternates.languages` entry for a sitemap row — one
 * fully-qualified URL per locale in `SUPPORTED_LOCALES` (or per locale in
 * `availableLocales` when provided), plus an `x-default` entry pointing at
 * the English version.
 *
 * This is the sitemap counterpart of `generateCanonicalMetadata`'s
 * `alternates.languages` map (defined in `app/[locale]/_lib/metadata.ts`).
 * Both must emit the same set of locales so that Google sees consistent
 * bidirectional hreflang signals across the sitemap and the page-level
 * `<link rel="alternate" hreflang>` tags. Because both iterate the same
 * `SUPPORTED_LOCALES` array by default, adding a locale keeps them in sync
 * automatically — there is no manual duplication to update.
 *
 * The `availableLocales` override mirrors the same-named argument on
 * `generateCanonicalMetadata`: for partially-translated resources (e.g. an
 * article that exists only in en/ja), pass the subset of locales that have
 * content so the sitemap only lists alternates that actually resolve.
 * Omitting the argument defaults to the full `SUPPORTED_LOCALES` list, which
 * is correct for pages that exist in every locale.
 */
export function generateAlternates(path: string, availableLocales?: readonly string[]) {
  const languages: Record<string, string> = {};
  const locales = availableLocales ?? SUPPORTED_LOCALES;
  for (const locale of locales) {
    languages[locale] = `${BASE_URL}/${locale}${path}`;
  }
  // x-default points to the English version
  languages['x-default'] = `${BASE_URL}/en${path}`;
  return { languages };
}
