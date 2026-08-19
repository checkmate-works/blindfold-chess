import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/config';

/**
 * Build an `alternates.languages` map: one entry per locale, plus the
 * `x-default` that search engines fall back to.
 *
 * Three surfaces emit this map — page metadata, the sitemap, and the landing
 * hreflang cluster — over three different URL shapes, so only the mapping is
 * shared and each caller keeps its own `urlForLocale`. What was not shared,
 * and should have been, is which locale `x-default` names: two of the three
 * wrote `'en'` as a literal while `config.ts` promises that everything derives
 * from its lists and there is "no second list to update".
 *
 * `locales` narrows the set for partially-translated resources (an article
 * that exists only in en/ja), so the map never advertises an alternate that
 * does not resolve. `x-default` is emitted regardless: it is the fallback,
 * not an alternate.
 */
export function buildLanguageAlternates(
  urlForLocale: (locale: string) => string,
  locales: readonly string[] = SUPPORTED_LOCALES
): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale] = urlForLocale(locale);
  }
  languages['x-default'] = urlForLocale(DEFAULT_LOCALE);
  return languages;
}
