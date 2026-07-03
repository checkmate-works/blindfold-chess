/**
 * Shared-game mutation authorization. Kept apart from the read/write modules
 * because it is a distinct concern: ownership resolution over the dual
 * registered-author / manage-token model, including the constant-time token
 * hash comparison.
 */
import { and, eq, isNull } from 'drizzle-orm';
import 'server-only';

import { manageTokenMatches } from '@/lib/games/manage-token';

import { db } from './index';
import { gameTokens, games } from './schema';

export type GameMutationAuth = 'ok' | 'not_found' | 'forbidden';

/**
 * Authorize an owner mutation (edit / delete) on a shared game. Ownership is
 * dual: a registered author owns via `author_id` (session `userId`), while an
 * account-less author proves ownership with the raw manage `token` (compared
 * against the stored hash in constant time). Returns 'not_found' for a missing
 * or already-deleted game, 'forbidden' when neither path matches.
 */
export async function authorizeGameMutation(params: {
  gameId: string;
  userId: string | null;
  token: string | null;
}): Promise<GameMutationAuth> {
  const { gameId, userId, token } = params;

  const [row] = await db
    .select({ authorId: games.authorId, tokenHash: gameTokens.tokenHash })
    .from(games)
    .leftJoin(gameTokens, eq(gameTokens.gameId, games.id))
    .where(and(eq(games.id, gameId), isNull(games.deletedAt)))
    .limit(1);

  if (!row) return 'not_found';
  if (userId && row.authorId === userId) return 'ok';
  if (token && row.tokenHash && manageTokenMatches(token, row.tokenHash)) return 'ok';
  return 'forbidden';
}
