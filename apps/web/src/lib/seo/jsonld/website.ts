import { AUTHOR_NAME, LANGUAGE_MAP, SITE_URL } from './base';

/**
 * WebSite schema for the root layout
 * @see https://schema.org/WebSite
 */
export function generateWebSiteSchema(locale: string, brandName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: brandName,
    url: SITE_URL,
    inLanguage: LANGUAGE_MAP[locale] ?? 'en-US',
    publisher: {
      '@type': 'Organization',
      name: AUTHOR_NAME,
      url: SITE_URL,
    },
  };
}
