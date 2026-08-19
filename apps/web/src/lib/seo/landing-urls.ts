import { DEFAULT_LOCALE, SITE_URL } from '@/config';

import type { Locale } from '@/app/[locale]/_lib/types';

import { buildLanguageAlternates } from './language-alternates';

/**
 * Build the canonical / hreflang / sitemap URL for a root landing page
 * locale variant.
 *
 * The landing page lives at `/` (no `/[locale]` prefix — that path is
 * reserved for the locale-specific home, which is a different page).
 * English is served at bare `/` so the primary entrypoint keeps the
 * cleanest URL and inherits existing backlinks. Other locales use
 * `/?lang=<code>` so Googlebot — which does not send Accept-Language —
 * can reach them as independent, indexable URLs. The four URLs together
 * form the landing hreflang cluster.
 *
 * This helper is the single source of truth for that URL shape. Both
 * `(landing)/page.tsx` (metadata) and the sitemap builder import it to
 * keep the page-level `<link rel="alternate" hreflang>` tags in lockstep
 * with the sitemap's `xhtml:link` entries — a mismatch would trigger
 * Google "alternate page with wrong hreflang" warnings.
 */
export function buildLandingUrl(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? `${SITE_URL}/` : `${SITE_URL}/?lang=${locale}`;
}

/**
 * Build the `alternates.languages` map for the landing hreflang cluster.
 * Emits one entry per supported locale plus `x-default` (pointing at the
 * English URL).
 */
export function buildLandingLanguageAlternates(): Record<string, string> {
  return buildLanguageAlternates((locale) => buildLandingUrl(locale as Locale));
}
