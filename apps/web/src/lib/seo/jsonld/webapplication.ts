import { LANGUAGE_TAGS } from '@/i18n/language-tags';

import { SITE_URL } from './base';

/**
 * WebApplication schema for the home page.
 *
 * @see https://schema.org/WebApplication
 *
 * @remarks
 * The marketing `description` is passed in by the caller rather than being
 * hardcoded here. It lives in the i18n message catalog
 * (`metadata.webApplicationDescription`) so translators own it alongside
 * every other user-visible string, and the schema emitter stays locale-agnostic.
 *
 * `inLanguage` is emitted as the full set of supported locales (via
 * `LANGUAGE_TAGS`) to advertise that the application itself is available in
 * all of them — this is a property of the app, not of the current page, so
 * there is no per-locale branch here.
 */
export function generateWebApplicationSchema(brandName: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: brandName,
    url: SITE_URL,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description,
    inLanguage: Object.values(LANGUAGE_TAGS),
  };
}
