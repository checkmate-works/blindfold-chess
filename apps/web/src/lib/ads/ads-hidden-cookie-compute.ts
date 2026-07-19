import 'server-only';

import { hasAdFreeEntitlement } from './ad-free-entitlement';

/**
 * Computes the value for the `bfc_ads_hidden` cookie based on a user's
 * current ad-free entitlement.
 *
 * Returns `'1'` if ads should be HIDDEN for this user, `null` otherwise,
 * meaning the cookie should be deleted (or never set). What counts as an
 * entitlement is owned by {@link hasAdFreeEntitlement} — the single
 * decision point shared with the native-ad gate (`shouldShowAdsForUser`).
 *
 * Note: intentionally does NOT check the global `ads_enabled` flag — if
 * ads are globally off, setting the cookie is a no-op (there's nothing to
 * hide), but the user's entitlement state is unchanged, so keeping the
 * cookie reflective of "this user is entitled to hide ads" is fine.
 *
 * This file is `server-only` because the entitlement check talks to the
 * DB. See `./ads-hidden-cookie.ts` for the client-safe constants (cookie
 * name / max-age / options).
 */
export async function computeAdsHiddenValueForUser(userId: string | null): Promise<'1' | null> {
  return (await hasAdFreeEntitlement(userId)) ? '1' : null;
}
