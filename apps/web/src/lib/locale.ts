import { cookies, headers } from 'next/headers';

import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, SUPPORTED_LOCALES } from '@/config';
import 'server-only';

import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * Detects the user's preferred locale from the request.
 * Priority: Cookie > Accept-Language header > Default (en)
 *
 * NOTE ON MIDDLEWARE & ROUTING:
 * We intentionally do NOT use a global Next.js `middleware.ts` to implement
 * automatic locale redirects (like forcing `/learn` -> `/en/learn`).
 *
 * Why? Because our Landing Page (`app/(landing)/page.tsx`) explicitly
 * serves at the root `/` URL across all languages without a `/[locale]` prefix.
 * If we implemented standard `next-intl` middleware, users hitting `/` would
 * be forced to `/en` or `/ja`, which violates the product requirement of
 * keeping the landing page at `blindfold-chess.online/`.
 *
 * As a result, any old links (like `/practice` or `/learn`) that Googlebot
 * crawled before the i18n migration will surface as 404s in Search Console
 * because there is no middleware redirecting them to their `/[locale]` counterparts.
 * This is an accepted tradeoff. Link updates inside the app ensure normal
 * users never hit these 404s.
 *
 * @returns The detected locale (one of `SUPPORTED_LOCALES`)
 */
export async function getLocaleFromRequest(): Promise<Locale> {
  // 1. Check cookie first (user preference)
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE_NAME);

  if (localeCookie?.value && isValidLocale(localeCookie.value)) {
    return localeCookie.value as Locale;
  }

  // 2. Check Accept-Language header
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');

  if (acceptLanguage) {
    const preferredLocale = parseAcceptLanguage(acceptLanguage);
    if (preferredLocale) {
      return preferredLocale;
    }
  }

  // 3. Default to English
  return DEFAULT_LOCALE;
}

/**
 * Validates if a string is a supported locale
 */
function isValidLocale(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale);
}

/**
 * Parses an `Accept-Language` header and returns the first entry that matches
 * a supported locale.
 *
 * Matching strategy (per preference order in the header):
 *  1. Case-insensitive exact match against `SUPPORTED_LOCALES`. RFC 4647
 *     explicitly allows the subtags in `Accept-Language` to vary in case
 *     (browsers commonly send `pt-br` lower-cased), while our canonical
 *     identifiers use BCP 47 mixed case (`pt-BR`). Without normalization, a
 *     Brazilian browser sending `pt-BR,pt;q=0.9,en;q=0.8` would fall through
 *     to English despite our shipping a `pt-BR` translation.
 *  2. Language-prefix fallback: if no exact match, we compare only the
 *     primary subtag (e.g. `pt` from `pt`, `en` from `en-US`) against the
 *     primary subtag of each supported locale. This maps a bare `pt` (generic
 *     Portuguese preference) onto our only supported regional variant
 *     (`pt-BR`), and it makes `en-GB`/`en-AU` resolve to `en` rather than
 *     failing over to cookie/default.
 *
 * Both steps derive from `SUPPORTED_LOCALES` — there is no secondary locale
 * list or BCP 47 variant table to keep in sync. Adding a new locale to
 * `SUPPORTED_LOCALES` automatically fans out here.
 *
 * If two supported locales ever share a primary subtag (e.g. `pt-BR` and
 * `pt-PT`), the prefix fallback resolves to whichever is declared first in
 * `SUPPORTED_LOCALES`. At that point we should replace the prefix step with
 * explicit regional preference ordering.
 */
function parseAcceptLanguage(acceptLanguage: string): Locale | null {
  // Parse "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7" format, lower-casing each
  // entry so we can compare without worrying about browser casing.
  const languages = acceptLanguage.split(',').map((lang) => {
    const [code] = lang.trim().split(';');
    return code.toLowerCase();
  });

  for (const lang of languages) {
    // 1. Case-insensitive exact match (e.g., 'pt-br' -> 'pt-BR', 'ja' -> 'ja')
    const exact = SUPPORTED_LOCALES.find((l) => l.toLowerCase() === lang);
    if (exact) {
      return exact;
    }

    // 2. Primary-subtag fallback (e.g., 'pt' -> 'pt-BR', 'en-US' -> 'en')
    const prefix = lang.split('-')[0];
    if (!prefix) continue;
    const byPrefix = SUPPORTED_LOCALES.find((l) => l.toLowerCase().split('-')[0] === prefix);
    if (byPrefix) {
      return byPrefix;
    }
  }

  return null;
}
