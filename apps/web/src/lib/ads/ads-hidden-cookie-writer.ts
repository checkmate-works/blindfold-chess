import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

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
 * @design Originally factored out of an internal `refreshAdsHiddenCookie`
 * Server Action so that `getSessionUser` could reuse the cookie-write logic
 * without paying for a duplicate Supabase `auth.getUser()` round-trip. The
 * Server Action wrapper has since been removed (Server Components cannot
 * mutate cookies during render under Next.js 16), and the cookie refresh on
 * `/mypage/subscription` now happens in the request proxy
 * (`apps/web/src/proxy.ts`) via {@link refreshAdsHiddenCookieOnResponse}.
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

/**
 * Variant of {@link writeAdsHiddenCookieForUser} that mutates the given
 * `NextResponse` instead of using `next/headers` `cookies()`. Use this from
 * contexts where `cookies().set()` is not allowed — chiefly the request proxy
 * (`apps/web/src/proxy.ts`) and Route Handlers that return their own response.
 *
 * @design Server Components cannot mutate cookies during render under
 * Next.js 16, so the `/mypage/subscription` page (which is a Server Component)
 * cannot refresh the cookie inline. Refreshing it on the response from the
 * proxy is the supported alternative: the cookie is set on the outgoing
 * response before the page renders, so descendant pages observe the updated
 * value on the very same request.
 */
export async function refreshAdsHiddenCookieOnResponse(
  response: NextResponse,
  userId: string | null
): Promise<void> {
  const value = await computeAdsHiddenValueForUser(userId);

  if (value === '1') {
    response.cookies.set(ADS_HIDDEN_COOKIE_NAME, '1', adsHiddenCookieOptions());
  } else {
    response.cookies.delete(ADS_HIDDEN_COOKIE_NAME);
  }
}
