import { SITE_URL, SUPPORTED_LOCALES } from '@/config';

export const BASE_URL = SITE_URL;

/**
 * Generate alternates object for hreflang cross-references.
 * Each locale variant gets a link to all other locale variants,
 * enabling Google to understand the language relationship.
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
