import { and, eq, or } from 'drizzle-orm';
import 'server-only';

import { db, userBlocks } from '../db';
import { MODERATION_BLOCKED_ERROR } from './blocked-error';

export { MODERATION_BLOCKED_ERROR };

/**
 * Has `blockerId` blocked `blockedId`? Directional — used by the profile
 * render path to decide whether the viewer sees "Block" or "Unblock".
 *
 * Not wrapped in `React.cache` (unlike `isUserBanned`): the block checks run
 * at most once per render and, in {@link isBlockedBetween}'s case, from the
 * detached fire-and-forget notification path where no request-scoped cache
 * store exists.
 */
export async function hasBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: userBlocks.id })
    .from(userBlocks)
    .where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)))
    .limit(1);
  return !!row;
}

/**
 * Is there a block in EITHER direction between the two users? This is the
 * predicate for suppressing actor→recipient notifications: once one side
 * blocks the other, neither should notify the other.
 */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const [row] = await db
    .select({ id: userBlocks.id })
    .from(userBlocks)
    .where(
      or(
        and(eq(userBlocks.blockerId, a), eq(userBlocks.blockedId, b)),
        and(eq(userBlocks.blockerId, b), eq(userBlocks.blockedId, a))
      )
    )
    .limit(1);
  return !!row;
}

/**
 * Guard for a user→user write: reject it once either party has blocked the
 * other.
 *
 * `otherId` is nullable because the counterparty is routinely unknown — an
 * account-less game, an anonymised author, a row whose owner column is null.
 * There is nobody to be blocked by in those cases, so the write proceeds. A
 * self-directed write (liking your own post, commenting on your own game) is
 * likewise never blocked, and short-circuits before the query runs.
 *
 * @returns The rejection to hand straight back to the caller's client, or
 * `null` when the interaction is allowed:
 *
 * ```ts
 * const blocked = await assertNotBlocked(user.id, owner.userId);
 * if (blocked) return blocked;
 * ```
 */
export async function assertNotBlocked(
  viewerId: string,
  otherId: string | null | undefined
): Promise<{ error: typeof MODERATION_BLOCKED_ERROR } | null> {
  if (!otherId || otherId === viewerId) return null;
  return (await isBlockedBetween(viewerId, otherId)) ? { error: MODERATION_BLOCKED_ERROR } : null;
}
