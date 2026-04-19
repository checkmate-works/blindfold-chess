'use server';

import { cookies } from 'next/headers';

import { ADS_HIDDEN_COOKIE_NAME, adsHiddenCookieOptions } from '@/lib/ads/ads-hidden-cookie';
import { computeAdsHiddenValueForUser } from '@/lib/ads/ads-hidden-cookie-compute';
import { getOptionalUser } from '@/lib/auth';

/**
 * Refresh the `bfc_ads_hidden` cookie based on the current session user's
 * ad-free entitlement. Sets the cookie to `'1'` if the user should not see
 * ads (active subscription or `ad_free` grant), or deletes it otherwise.
 *
 * Safe to call on any request — anonymous visitors end up with the cookie
 * deleted, which is correct (they should see ads).
 *
 * Call this from:
 *   - Auth sign-in / OAuth callback (to initialize)
 *   - Stripe checkout success page (to update after purchase)
 *   - `/mypage/subscription` (to correct stale state on each visit)
 *   - Sign-out (to remove)
 *
 * Webhooks CANNOT update this cookie — they run in a different HTTP session
 * than the user's browser. The cookie is refreshed on the user's next
 * authenticated page load instead.
 */
export async function refreshAdsHiddenCookie(): Promise<void> {
  const user = await getOptionalUser();
  const value = await computeAdsHiddenValueForUser(user?.id ?? null);
  const store = await cookies();

  if (value === '1') {
    store.set(ADS_HIDDEN_COOKIE_NAME, '1', adsHiddenCookieOptions());
  } else {
    store.delete(ADS_HIDDEN_COOKIE_NAME);
  }
}
