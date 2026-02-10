import { cookies, headers } from 'next/headers';

import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, SUPPORTED_LOCALES } from '@/config';
import 'server-only';

import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * Detects the user's preferred locale from the request.
 * Priority: Cookie > Accept-Language header > Default (en)
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
