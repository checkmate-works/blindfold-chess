import { LANGUAGE_TAGS } from '@/i18n/language-tags';

import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * DefinedTermSet schema
 * @see https://schema.org/DefinedTermSet
 *
 * `inLanguage` takes an app-level `Locale` and is mapped through
 * `LANGUAGE_TAGS` to a BCP 47 tag (e.g. `en` -> `en-US`, `pt-BR` -> `pt-BR`)
 * before being emitted. This matches the pattern used by the other JSON-LD
 * emitters in this directory (see `learning-resource.ts`,
 * `blog-posting.ts`, `article.ts`, `website.ts`) and keeps callers from
 * re-implementing the locale -> BCP 47 mapping at each call site.
 */
export function generateDefinedTermSetSchema(params: {
  name: string;
  description: string;
  url: string;
  inLanguage: Locale;
  terms: Array<{ name: string; description: string; url: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: params.name,
    description: params.description,
    url: params.url,
    inLanguage: LANGUAGE_TAGS[params.inLanguage],
    hasDefinedTerm: params.terms.map((term) => ({
      '@type': 'DefinedTerm',
      name: term.name,
      description: term.description,
      url: term.url,
      inDefinedTermSet: params.url,
    })),
  };
}
