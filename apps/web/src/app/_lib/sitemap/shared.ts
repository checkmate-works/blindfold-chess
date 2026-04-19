import { SITE_URL, SUPPORTED_LOCALES } from '@/config';

export const BASE_URL = SITE_URL;

/**
 * Generate the `alternates.languages` entry for a sitemap row — one
 * fully-qualified URL per locale in `SUPPORTED_LOCALES`, plus an `x-default`
 * entry pointing at the English version.
 *
 * This is the sitemap counterpart of `generateCanonicalMetadata`'s
 * `alternates.languages` map (defined in `app/[locale]/_lib/metadata.ts`).
 * Both must emit the same set of locales so that Google sees consistent
 * bidirectional hreflang signals across the sitemap and the page-level
 * `<link rel="alternate" hreflang>` tags. Because both iterate the same
 * `SUPPORTED_LOCALES` array, adding a locale keeps them in sync
 * automatically — there is no manual duplication to update.
 */
export function generateAlternates(path: string) {
  const languages: Record<string, string> = {};
  for (const locale of SUPPORTED_LOCALES) {
    languages[locale] = `${BASE_URL}/${locale}${path}`;
  }
  // x-default points to the English version
  languages['x-default'] = `${BASE_URL}/en${path}`;
  return { languages };
}
