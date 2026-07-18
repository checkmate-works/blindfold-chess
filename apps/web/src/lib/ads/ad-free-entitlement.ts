import 'server-only';

import { hasActiveSubscription } from '@/lib/billing/subscription';
import { hasDanTierRank } from '@/lib/users/dan-rank';
import { hasActiveGrant } from '@/lib/users/user-grants';

/**
 * Whether a user is entitled to browse ad-free. Three sources, ORed:
 * an active Stripe subscription, an active `ad_free` grant, or a dan-tier
 * belt rank (the permanent dan perk — see {@link hasDanTierRank}).
 *
 * This is THE single decision point for ad-free status. Both ad-gating
 * layers delegate here:
 * - `computeAdsHiddenValueForUser` (the `bfc_ads_hidden` cookie that hides
 *   banner slots via CSS), and
 * - `shouldShowAdsForUser` (the server-side gate for native-ad surfaces).
 *
 * Before this module existed the two layers each duplicated the same
 * subscription-OR-grant check, and a new entitlement source added to one
 * but not the other would silently split behavior between banner and
 * native ads. Add new sources HERE, nowhere else.
 *
 * Anonymous visitors (`null` userId) are never entitled.
 */
export async function hasAdFreeEntitlement(userId: string | null): Promise<boolean> {
  if (!userId) return false;

  const [hasSub, hasGrant, hasDan] = await Promise.all([
    hasActiveSubscription(userId),
    hasActiveGrant(userId, 'ad_free'),
    hasDanTierRank(userId),
  ]);

  return hasSub || hasGrant || hasDan;
}
