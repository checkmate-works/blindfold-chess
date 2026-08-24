import 'server-only';

import { hasActiveSubscription } from '@/lib/billing/subscription';
import { hasDanTierRank } from '@/lib/users/dan-rank';

/**
 * Why spending coins on ad_free days would buy this user nothing right now.
 *
 * - `dan_rank`     — a dan-tier belt hides ads permanently.
 * - `subscription` — an active subscription hides ads while it runs.
 */
export type AdFreeRedemptionBlock = 'dan_rank' | 'subscription';

/**
 * The reason an ad_free redemption would be wasted for this user, or `null`
 * when the redemption is worth making.
 *
 * Deliberately NOT `hasAdFreeEntitlement`, even though it reads two of
 * that predicate's three sources. The third source — an active `ad_free`
 * grant — must NOT block: `redeemPointsForAdFree` stacks a new grant on top
 * of the latest active one (`startsAt = latest.expiresAt`), so redeeming
 * while ad-free-by-grant extends the run and loses nothing. Dan rank and a
 * subscription are different in kind: they suppress ads by themselves, and
 * the days bought alongside them tick down against wall-clock time, unspent.
 *
 * Blocking rather than warning is safe because coins never expire and no
 * ad_free grant is ever forfeited: a subscriber who cancels can redeem the
 * same coins the moment the subscription lapses, for the same number of days.
 *
 * The two reasons are not equivalent, which is why this returns which one
 * applies instead of a boolean — `user_ranks` is INSERT-only so dan is
 * permanent ("you will never need this"), whereas a subscription can lapse
 * ("you do not need this while subscribed"). The caller's copy differs
 * accordingly.
 */
export async function getAdFreeRedemptionBlock(
  userId: string
): Promise<AdFreeRedemptionBlock | null> {
  const [hasDan, hasSub] = await Promise.all([
    hasDanTierRank(userId),
    hasActiveSubscription(userId),
  ]);

  if (hasDan) return 'dan_rank';
  if (hasSub) return 'subscription';
  return null;
}
