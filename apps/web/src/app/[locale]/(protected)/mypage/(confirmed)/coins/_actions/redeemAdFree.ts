'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { writeAdsHiddenCookieForUser } from '@/lib/ads/ads-hidden-cookie-writer';
import { authenticateAndCheckBan } from '@/lib/auth';
import { redeemPointsForAdFree } from '@/lib/points';
import { RATE_LIMITS, checkRateLimit } from '@/lib/security/rate-limit';

export type RedeemAdFreeResult =
  | { ok: true; cost: number; durationDays: number; expiresAtIso: string }
  | {
      ok: false;
      error:
        | 'invalid_amount'
        | 'insufficient_balance'
        | 'signInRequired'
        | 'banned'
        | 'rateLimited';
    };

/**
 * Redeem the user's confirmed points for ad_free days. Thin server-action
 * wrapper around `redeemPointsForAdFree` — handles auth, ban, rate limit,
 * and cache invalidation; the actual ledger / grant work lives in the
 * `@/lib/points` primitive so it stays unit-testable.
 *
 * @design `revalidateTag('grant-status')`
 *
 * `hasActiveGrant` is cached under `grant-status`. After a redemption
 * succeeds, the user should see "ad-free active" immediately (not after a
 * 60 s revalidation), so we invalidate the tag inline.
 *
 * @design `writeAdsHiddenCookieForUser`
 *
 * Ad display is gated by the `bfc_ads_hidden` cookie (see
 * `ads-hidden-cookie.ts` design note) — the inline no-flash script reads
 * it on first paint to decide whether to render slots, and AdSenseDisplay
 * skips the `adsbygoogle.push({})` call when it is set. Cache invalidation
 * alone does not update the cookie, so without this step a successful
 * redemption would leave the user still seeing ads until their next
 * subscription-page visit or until the cookie expires (7 days). Since the
 * Server Action runs in the redeeming user's session, we have a writable
 * cookie store and can refresh the value inline.
 */
export async function redeemAdFree(cost: number): Promise<RedeemAdFreeResult> {
  const auth = await authenticateAndCheckBan();
  if ('error' in auth) {
    if (auth.error === 'banned') {
      return { ok: false, error: 'banned' };
    }
    return { ok: false, error: 'signInRequired' };
  }

  const rateLimitResult = await checkRateLimit(auth.user.id, RATE_LIMITS.redeemPoints);
  if ('error' in rateLimitResult) {
    return { ok: false, error: 'rateLimited' };
  }

  const result = await redeemPointsForAdFree(auth.user.id, cost);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidateTag('grant-status', { expire: 60 });
  await writeAdsHiddenCookieForUser(auth.user);
  revalidatePath('/mypage/coins');
  revalidatePath('/mypage/benefits');

  return {
    ok: true,
    cost: result.cost,
    durationDays: result.durationDays,
    expiresAtIso: result.expiresAt.toISOString(),
  };
}
