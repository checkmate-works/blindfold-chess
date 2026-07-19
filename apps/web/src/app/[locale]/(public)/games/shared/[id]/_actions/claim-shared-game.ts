'use server';

import { and, eq, isNull } from 'drizzle-orm';

import { authenticateGuardAndRequireProfile } from '@/lib/auth';
import { db, games } from '@/lib/db';
import type { GrantedRank } from '@/lib/db/data/ranks';
import { authorizeGameMutation } from '@/lib/db/games-auth';
import { claimSharedGame } from '@/lib/db/games-write';
import { evaluateRanksAndRefreshEntitlements } from '@/lib/db/rank-grant-flow';
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
 * requirements. Ranks are evaluated independently (skip-grants allowed),
 * so a fresh account claiming a qualifying win is promoted on the spot —
 * a black-belt-grade game jumps them straight to 1dan.
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
    if (auth !== 'ok') {
      if (auth === 'forbidden') {
        const [row] = await db
          .select({ authorId: games.authorId })
          .from(games)
          .where(and(eq(games.id, gameId), isNull(games.deletedAt)))
          .limit(1);
        if (row?.authorId != null) return { success: false, error: 'already_claimed' };
      }
      return { success: false, error: auth };
    }

    const claimed = await claimSharedGame(gameId, guardResult.user.id);
    if (!claimed) return { success: false, error: 'already_claimed' };

    // Same post-commit tail as publishing with an author: evaluate ranks
    // (best-effort, never fails the claim) and make a dan promotion's
    // ad-free perk visible immediately.
    const grantedRanks = await evaluateRanksAndRefreshEntitlements(
      guardResult.user.id,
      'game claim'
    );

    return {
      success: true,
      ...(grantedRanks.length > 0 ? { grantedRanks } : {}),
    };
  } catch (error) {
    return handleServerActionError(error, '[claimSharedGameAction]');
  }
}
