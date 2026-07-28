import { and, count, eq } from 'drizzle-orm';

import { authenticateAndGuard } from '@/lib/auth';
import { isBlockedBetween } from '@/lib/moderation/block';
import { createNotification } from '@/lib/notifications/notification';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';
import { validateUUID } from '@/lib/validations/uuid';

import { db, likes } from './index';
import { toggleByInsert } from './toggle-by-insert';

export type ToggleLikeResult = { liked: boolean; likeCount: number } | { error: string };

/**
 * Polymorphic like toggle — generic helper shared by all like Server Actions.
 *
 * Performs the core INSERT/DELETE + count + activity log for a
 * `(targetType, targetId)` pair. Topic-specific concerns like notification
 * dispatch, revalidation, and rate limiting are the caller's responsibility.
 *
 * @returns `{ liked, likeCount }` after the toggle resolved.
 */
export async function toggleLikeForTarget(params: {
  userId: string;
  targetType: string;
  targetId: string;
}): Promise<{ liked: boolean; likeCount: number }> {
  const { userId, targetType, targetId } = params;

  const liked = await toggleByInsert(
    () => db.insert(likes).values({ userId, targetType, targetId }),
    () =>
      db
        .delete(likes)
        .where(
          and(
            eq(likes.userId, userId),
            eq(likes.targetType, targetType),
            eq(likes.targetId, targetId)
          )
        )
  );

  logActivityEvent({
    userId,
    action: liked ? 'like' : 'unlike',
    targetType,
    targetId,
  });

  const [result] = await db
    .select({ count: count() })
    .from(likes)
    .where(and(eq(likes.targetType, targetType), eq(likes.targetId, targetId)));

  return { liked, likeCount: result.count };
}

/**
 * Generic skeleton for entity-level "toggle like" Server Actions.
 *
 * Every "like a polymorphic entity" action (positions, chunks, ...) needs
 * the same orchestration around `toggleLikeForTarget`:
 *   1. UUID-validate the target id.
 *   2. Authenticate + ban + rate-limit guard.
 *   3. Toggle the like.
 *   4. Look up the entity to discover its owner (and any extra context).
 *   5. Notify the owner on a fresh like (skipping self-likes and unlikes).
 *   6. Return `{ liked, likeCount }`.
 *
 * This factory captures (1)-(3), (5), (6) and lets callers plug in the
 * per-entity bits — the owner-lookup query and the notification metadata
 * shape — via two small callbacks. The shape of `extra` is fully generic
 * so each caller carries through its own derived data (slug for chunks,
 * positionType for positions, etc.).
 *
 * @design No `revalidatePath` — deliberate, do not re-add.
 * A like only moves a counter that every reader re-queries anyway: each page
 * rendering a like count is uncached, either by an explicit
 * `export const dynamic = 'force-dynamic'` or because it reads auth cookies
 * (`getOptionalUser()` / `auth.getUser()`) to decide `likedByMe`. No like
 * count sits behind `unstable_cache` / `use cache` either — the only cache
 * tags in this app are leaderboard, exp-leaderboard and daily-puzzle
 * (see `@/lib/cache-tags`). So revalidation bought exactly nothing.
 *
 * It cost a great deal, though. `revalidatePath` inside a Server Action makes
 * Next.js re-render the *caller's current page* server-side and ship its whole
 * RSC tree back alongside the action result. Measured on the home feed
 * (2026-07-29, Next 16.2): 256,249 B per like with it vs 94 B without —
 * plus a full `getFeedData()` / `resolveNativeAds()` / `auth.getUser()`
 * round-trip on every tap, and a wipe of the client Router Cache. The
 * client already applies the new count optimistically (`useLikeToggle`),
 * so the extra render never even reached the screen.
 */
export async function performEntityToggleLike<TExtra>(params: {
  id: string;
  /** camelCase field name used to build the `invalid<Field>` error key. */
  fieldName: string;
  /** Polymorphic target type passed to `toggleLikeForTarget` and `createNotification`. */
  targetType: string;
  /**
   * Look up the target row's owner plus any extra context the caller will
   * need in `notificationMeta`. Returning `null` means the row has gone
   * away between the toggle and the lookup — in that case the notification
   * is skipped and the toggle still counts.
   */
  fetchOwner: (id: string) => Promise<{ userId: string | null; extra: TExtra } | null>;
  /** Build notification metadata. Only called on a fresh like to a non-self. */
  notificationMeta: (id: string, extra: TExtra) => Record<string, unknown>;
}): Promise<ToggleLikeResult> {
  const { id, fieldName, targetType, fetchOwner, notificationMeta } = params;

  const uuidError = validateUUID(id, fieldName);
  if (uuidError) return uuidError;

  const guardResult = await authenticateAndGuard(RATE_LIMITS.toggleLike);
  if ('error' in guardResult) return { error: guardResult.error };
  const { user } = guardResult;

  // Look up the owner BEFORE toggling so a block can reject the like outright:
  // once either party has blocked the other, neither may like the other's
  // content. (The target row isn't deleted by liking, so fetching the owner
  // before vs after the toggle is equivalent.)
  const owner = await fetchOwner(id);

  if (
    owner?.userId &&
    owner.userId !== user.id &&
    (await isBlockedBetween(user.id, owner.userId))
  ) {
    return { error: 'moderation.blocked' };
  }

  const { liked, likeCount } = await toggleLikeForTarget({
    userId: user.id,
    targetType,
    targetId: id,
  });

  // (createNotification no-ops when owner.userId is null — anonymised owner.)
  if (liked && owner && owner.userId !== user.id) {
    createNotification({
      userId: owner.userId,
      actorId: user.id,
      type: 'like',
      targetType,
      targetId: id,
      metadata: notificationMeta(id, owner.extra),
    });
  }

  return { liked, likeCount };
}
