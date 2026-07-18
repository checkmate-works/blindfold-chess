'use server';

import { refreshAdsHiddenCookieOnDanPromotion } from '@/lib/ads/ads-hidden-cookie-writer';
import { authenticateGuardAndRequireProfile } from '@/lib/auth';
import type { GrantedRank } from '@/lib/db/data/ranks';
import { authorizeGameMutation } from '@/lib/db/games-auth';
import { claimSharedGame } from '@/lib/db/games-write';
import { evaluateRanksAfterCreate } from '@/lib/db/rank-evaluation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { handleServerActionError } from '@/lib/server-action-error';
import { UUID_RE } from '@/lib/validations/uuid';

export type ClaimSharedGameResponse =
  | { success: true; grantedRanks?: GrantedRank[] }
  | { success: false; error: string };

/**
 * Claim an anonymously published game for the signed-in user: proves
 * possession of the manage token, sets `games.author_id`, and burns the
 * token (the `game_tokens` design's documented claim procedure).
 *
 * Authorization is DELIBERATELY token-only (`userId: null` below): a claim
 * is the act of converting token-possession into authorship, so the
 * session-author path that `authorizeGameMutation` also supports must not
 * apply — an already-authored game has nothing to claim.
 *
 * Claiming re-evaluates belt ranks: the game only now has an author, so
 * this is its first chance to count toward `game_publish_win*`
 * requirements — for a fresh account that usually grants nothing yet
 * (progression is linear from 5kyu), and the game simply counts later when
 * their progression reaches it.
 *
 * No feed item is emitted: the publish already happened, possibly long
 * ago, and a retroactive "new game" feed entry would misrepresent it.
 */
export async function claimSharedGameAction(
  gameId: string,
  token: string
): Promise<ClaimSharedGameResponse> {
  try {
    if (typeof gameId !== 'string' || !UUID_RE.test(gameId)) {
      return { success: false, error: 'invalid_input' };
    }
    if (typeof token !== 'string' || token.length === 0) {
      return { success: false, error: 'invalid_input' };
    }

    const guardResult = await authenticateGuardAndRequireProfile(RATE_LIMITS.claimSharedGame);
    if ('error' in guardResult) {
      return { success: false, error: guardResult.error };
    }

    const auth = await authorizeGameMutation({ gameId, userId: null, token });
    if (auth !== 'ok') return { success: false, error: auth };

    const claimed = await claimSharedGame(gameId, guardResult.user.id);
    if (!claimed) return { success: false, error: 'already_claimed' };

    // Same post-commit tail as publishing with an author: evaluate ranks
    // (best-effort, never fails the claim) and make a dan promotion's
    // ad-free perk visible immediately.
    const grantedRanks = await evaluateRanksAfterCreate(guardResult.user.id, 'game claim');
    await refreshAdsHiddenCookieOnDanPromotion(grantedRanks);

    return {
      success: true,
      ...(grantedRanks.length > 0 ? { grantedRanks } : {}),
    };
  } catch (error) {
    return handleServerActionError(error, '[claimSharedGameAction]');
  }
}
