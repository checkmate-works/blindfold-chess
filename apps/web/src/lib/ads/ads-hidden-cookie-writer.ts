import { cookies } from 'next/headers';

import type { User } from '@supabase/supabase-js';

import { ADS_HIDDEN_COOKIE_NAME, adsHiddenCookieOptions } from './ads-hidden-cookie';
import { computeAdsHiddenValueForUser } from './ads-hidden-cookie-compute';

/**
 * Write-through the `bfc_ads_hidden` cookie based on the given user's ad-free
 * entitlement. Sets the cookie to `'1'` if the user should not see ads
 * (active subscription or `ad_free` grant), or deletes it otherwise.
 *
 * Anonymous callers (user === null) always end up with the cookie deleted —
 * this is correct for sign-out flows and for pages visited by unauthenticated
 * users (they should see ads, so any stale `'1'` must be cleared).
 *
 * This helper is intentionally NOT marked `"use server"` so that it can be
 * freely imported from other server modules (e.g., `getSessionUser`) and from
 * Server Actions alike.
 *
 * @design Factored out of `refreshAdsHiddenCookie` so that `getSessionUser`
 * can reuse the cookie-write logic without paying for a duplicate Supabase
 * `auth.getUser()` round-trip. See
 * `apps/web/src/app/[locale]/_actions/refreshAdsHiddenCookie.ts` for context.
 *
 * @design Intentionally does NOT `import 'server-only'` — doing so would
 * bleed through the `getSessionUser` Server Action import and break
 * client-component unit tests (which transitively import `AuthContext`,
 * which imports `getSessionUser`). Runtime protection is still provided by
 * `next/headers`' `cookies()` (throws outside of a request scope) and by
 * `./ads-hidden-cookie-compute` (which IS `server-only`, so any real client
 * import chain would still error out).
 */
export async function writeAdsHiddenCookieForUser(user: User | null): Promise<void> {
  const value = await computeAdsHiddenValueForUser(user?.id ?? null);
  const store = await cookies();

  if (value === '1') {
    store.set(ADS_HIDDEN_COOKIE_NAME, '1', adsHiddenCookieOptions());
  } else {
    store.delete(ADS_HIDDEN_COOKIE_NAME);
  }
}
