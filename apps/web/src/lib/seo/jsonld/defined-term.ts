import { LANGUAGE_TAGS } from '@/i18n/language-tags';

import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * DefinedTerm schema for a single glossary term page.
 * @see https://schema.org/DefinedTerm
 *
 * Mirrors {@link generateDefinedTermSetSchema}: `inLanguage` is mapped from
 * the app `Locale` to a BCP 47 tag via `LANGUAGE_TAGS`, and the term is
 * linked back to its containing set so the two pages describe one vocabulary.
 */
export function generateDefinedTermSchema(params: {
  name: string;
  description: string;
  url: string;
  inLanguage: Locale;
  termSetName: string;
  termSetUrl: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: params.name,
    description: params.description,
    url: params.url,
    inLanguage: LANGUAGE_TAGS[params.inLanguage],
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: params.termSetName,
      url: params.termSetUrl,
    },
  };
}
