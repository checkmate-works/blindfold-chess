import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * Mapping from app locale code (BCP 47, hyphen-separated) to Open Graph
 * locale code (underscore-separated, `xx_YY`).
 *
 * Purpose: drives `og:locale` and `og:locale:alternate` meta tags on every
 * page. These are consumed by Facebook, LinkedIn, and other Open Graph
 * crawlers to pick the correct regional variant for link previews.
 *
 * Format note: Open Graph uses underscore (`en_US`, `pt_BR`), while
 * hreflang/BCP 47 uses hyphen (`en`, `pt-BR`). We keep the hyphen form in
 * `SUPPORTED_LOCALES` (the canonical identifier used for URLs and hreflang)
 * and translate to the underscore form here at the OG boundary only.
 *
 * Exhaustiveness: typed as `Record<Locale, string>` so that adding a new
 * entry to `SUPPORTED_LOCALES` without updating this map is a compile-time
 * error. No `?? 'en_US'` fallback — the type system guarantees every
 * supported locale has an explicit mapping, and silently defaulting a
 * missing locale to `en_US` would emit incorrect OG metadata without any
 * warning.
 */
export const OG_LOCALE_MAP: Record<Locale, string> = {
  en: 'en_US',
  es: 'es_ES',
  'pt-BR': 'pt_BR',
  ja: 'ja_JP',
};
