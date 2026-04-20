import 'server-only';

import { hasActiveSubscription } from '@/lib/billing/subscription';
import { hasActiveGrant } from '@/lib/users/user-grants';

/**
 * Computes the value for the `bfc_ads_hidden` cookie based on a user's
 * current ad-free entitlement.
 *
 * Returns `'1'` if ads should be HIDDEN for this user (has an active
 * subscription or an `ad_free` grant). Returns `null` otherwise, meaning
 * the cookie should be deleted (or never set).
 *
 * Note: intentionally does NOT check the global `ads_enabled` flag — if
 * ads are globally off, setting the cookie is a no-op (there's nothing to
 * hide), but the user's entitlement state is unchanged, so keeping the
 * cookie reflective of "this user is entitled to hide ads" is fine.
 *
 * This file is `server-only` because it pulls `hasActiveSubscription` and
 * `hasActiveGrant`, which talk to the DB. See `./ads-hidden-cookie.ts` for
 * the client-safe constants (cookie name / max-age / options).
 */
export async function computeAdsHiddenValueForUser(userId: string | null): Promise<'1' | null> {
  if (!userId) return null;

  const [hasSub, hasGrant] = await Promise.all([
    hasActiveSubscription(userId),
    hasActiveGrant(userId, 'ad_free'),
  ]);

  return hasSub || hasGrant ? '1' : null;
}
