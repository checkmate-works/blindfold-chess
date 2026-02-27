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
 * @returns The detected locale ('en' or 'ja')
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
 * Parses Accept-Language header and returns the first supported locale
 */
function parseAcceptLanguage(acceptLanguage: string): Locale | null {
  // Parse "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7" format
  const languages = acceptLanguage.split(',').map((lang) => {
    const [code] = lang.trim().split(';');
    return code.toLowerCase();
  });

  for (const lang of languages) {
    // Check for exact match first (e.g., "ja")
    if (isValidLocale(lang)) {
      return lang as Locale;
    }

    // Check for language prefix (e.g., "ja-JP" -> "ja")
    const prefix = lang.split('-')[0];
    if (prefix && isValidLocale(prefix)) {
      return prefix as Locale;
    }
  }

  return null;
}
