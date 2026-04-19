'use server';

import { writeAdsHiddenCookieForUser } from '@/lib/ads/ads-hidden-cookie-writer';
import { getOptionalUser } from '@/lib/auth';

/**
 * Refresh the `bfc_ads_hidden` cookie based on the current session user's
 * ad-free entitlement. Sets the cookie to `'1'` if the user should not see
 * ads (active subscription or `ad_free` grant), or deletes it otherwise.
 *
 * Safe to call on any request — anonymous visitors end up with the cookie
 * deleted, which is correct (they should see ads).
 *
 * Actual current callers (as of this writing):
 *   - `/mypage/subscription` page (belt-and-suspenders refresh on every
 *     visit, which also covers the Stripe-checkout `success_url` landing
 *     since that URL points at `/mypage/subscription?status=success`).
 *
 * Ordinary authenticated page loads are already covered by `getSessionUser()`
 * (invoked by `AuthProvider` on every mount), which write-throughs the cookie
 * via `writeAdsHiddenCookieForUser()`.
 *
 * Usage guidance — you MAY also call this from:
 *   - Any Server Component that wants to self-correct stale cookie state
 *     synchronously before rendering, rather than relying on the
 *     `AuthProvider` client mount.
 *   - Any Server Action that changes the user's entitlement and wants the
 *     cookie to reflect that change immediately on the next render.
 *
 * @design Paths that do NOT go through `next/headers` `cookies()` must NOT
 * use this action. In particular:
 *   - `/auth/callback` (Route Handler) shares the lower-level primitive
 *     `computeAdsHiddenValueForUser(userId)` directly and attaches the
 *     cookie to its own `NextResponse` via a local helper. Route Handlers
 *     that return a redirect cannot rely on `next/headers` `cookies()`
 *     mutations propagating through the redirect response, so they must
 *     set cookies on the `NextResponse` object instead.
 *   - `/auth/logout` (Route Handler) likewise deletes the cookie directly
 *     on its `NextResponse` rather than calling this action.
 *
 * Webhooks CANNOT update this cookie — they run in a different HTTP session
 * than the user's browser. The cookie is refreshed on the user's next
 * authenticated page load instead (via `getSessionUser()` or an explicit
 * call to this action).
 */
export async function refreshAdsHiddenCookie(): Promise<void> {
  const user = await getOptionalUser();
  await writeAdsHiddenCookieForUser(user);
}
