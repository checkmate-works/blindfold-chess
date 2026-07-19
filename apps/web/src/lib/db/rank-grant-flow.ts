import { refreshAdsHiddenCookieOnDanPromotion } from '@/lib/ads/ads-hidden-cookie-writer';
import type { GrantedRank } from '@/lib/db/data/ranks';

import { evaluateRanksAfterCreate } from './rank-evaluation';

/**
 * Post-grant tail shared by every rank-relevant trigger (challenge save,
 * position create, game publish, game claim): evaluate ranks, then make a
 * dan promotion's ad-free perk visible immediately.
 *
 * Deliberately NOT in rank-evaluation.ts: refreshAdsHiddenCookieOnDanPromotion
 * pulls in next/headers / next/cache, and folding that into rank-evaluation's
 * module graph breaks rank-evaluation.test.ts's stub setup.
 */
export async function evaluateRanksAndRefreshEntitlements(
  userId: string,
  context: string
): Promise<GrantedRank[]> {
  const grantedRanks = await evaluateRanksAfterCreate(userId, context);
  await refreshAdsHiddenCookieOnDanPromotion(grantedRanks);
  return grantedRanks;
}
