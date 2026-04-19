import { LANGUAGE_TAGS } from '@/i18n/language-tags';

import type { Locale } from '@/app/[locale]/_lib/types';

import { AUTHOR_NAME, SITE_URL } from './base';

/**
 * WebSite schema for the root layout
 * @see https://schema.org/WebSite
 */
export function generateWebSiteSchema(locale: Locale, brandName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: brandName,
    url: SITE_URL,
    inLanguage: LANGUAGE_TAGS[locale],
    publisher: {
      '@type': 'Organization',
      name: AUTHOR_NAME,
      url: SITE_URL,
    },
  };
}
