import { hasLocale } from 'next-intl';
import { headers } from 'next/headers';

import { routing } from './routing';

/**
 * Resolves the active `[locale]` segment from the `x-pathname` header (set by
 * `proxy.ts` on every request) rather than `getLocale()`.
 *
 * This app has no `next-intl` middleware and never calls `setRequestLocale()`,
 * so `getLocale()`'s request-scoped cache/header is empty in any context that
 * doesn't receive route `params` directly — `loading.tsx` files, `not-found.tsx`,
 * and inline `<Suspense fallback={...}>` skeleton components. There,
 * `getLocale()` (and bare `getTranslations()`, which calls it internally) can
 * intermittently fall back to `routing.defaultLocale` instead of the URL's
 * actual locale — reproduced as a skeleton briefly flashing English on a `ja`
 * page under throttled network. Reading the already-known pathname is a plain,
 * synchronous header lookup and isn't subject to that race.
 */
export async function getLocaleFromPathnameHeader() {
  const pathname = (await headers()).get('x-pathname') ?? '';
  const candidate = pathname.split('/')[1];
  return hasLocale(routing.locales, candidate) ? candidate : routing.defaultLocale;
}
