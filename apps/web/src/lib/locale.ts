import { cookies, headers } from 'next/headers';

import { LOCALE_COOKIE_NAME } from '@/config';
import { negotiateLocale } from '@/i18n/negotiate-locale';
import { isSupportedLocale } from '@/i18n/supported-locale';
import 'server-only';

import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * Detects the user's preferred locale from the request.
 * Priority: Cookie > Accept-Language header > Default (en)
 *
 * The header step is `negotiateLocale()` — the same parser the locale-less
 * entry points (`/g/<code>`, `/embed`, the proxy) use. It used to be a second
 * hand-rolled parser living here that read the header in order and discarded
 * the `q` values, so `Accept-Language: ja;q=0.1, en;q=0.9` rendered the
 * landing page in Japanese and `/g/<code>` in English for the same visitor.
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

  if (localeCookie?.value && isSupportedLocale(localeCookie.value)) {
    return localeCookie.value;
  }

  // 2. Accept-Language header, which already falls back to DEFAULT_LOCALE
  const headersList = await headers();
  return negotiateLocale(headersList.get('accept-language'));
}
