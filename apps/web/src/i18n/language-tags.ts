import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * Mapping from app locale code to BCP 47 language tag used as JSON-LD
 * `inLanguage` values (consumed by Google's structured-data parser for rich
 * results).
 *
 * Format: BCP 47 (RFC 5646) with the hyphen separator (`en-US`, `pt-BR`).
 * This is what schema.org / Google expect for `inLanguage`. Note the format
 * difference from `OG_LOCALE_MAP` in `og-locale.ts`, which uses underscore
 * (`pt_BR`) as required by the Open Graph spec.
 *
 * For bare primary-subtag locales we extend to a specific regional tag that
 * Google treats as more concrete (`en` -> `en-US`, `ja` -> `ja-JP`,
 * `es` -> `es-ES`). For `pt-BR` the locale identifier already is a valid
 * BCP 47 tag, so no reshaping is needed.
 *
 * Exhaustiveness: typed as `Record<Locale, string>` so that adding a new
 * entry to `SUPPORTED_LOCALES` without updating this map is a compile-time
 * error. There is intentionally no `?? 'en-US'` runtime fallback — silently
 * defaulting a missing locale would emit incorrect `inLanguage` metadata to
 * Google's crawler without any warning.
 */
export const LANGUAGE_TAGS: Record<Locale, string> = {
  en: 'en-US',
  es: 'es-ES',
  'pt-BR': 'pt-BR',
  ja: 'ja-JP',
};
