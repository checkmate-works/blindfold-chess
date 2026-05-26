import { revalidatePath } from 'next/cache';

import { and, count, eq } from 'drizzle-orm';

import { authenticateAndGuard } from '@/lib/auth';
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
 *   6. Revalidate the relevant paths.
 *   7. Return `{ liked, likeCount }`.
 *
 * This factory captures (1)-(3), (5), (6), (7) and lets callers plug in
 * the per-entity bits — the owner-lookup query, the notification metadata
 * shape, and the revalidation fan-out — via three small callbacks. The
 * shape of `extra` is fully generic so each caller carries through its
 * own derived data (slug for chunks, positionType for positions, etc.).
 */
export async function performEntityToggleLike<TExtra>(params: {
  id: string;
  locale: string;
  /** camelCase field name used to build the `invalid<Field>` error key. */
  fieldName: string;
  /** Polymorphic target type passed to `toggleLikeForTarget` and `createNotification`. */
  targetType: string;
  /**
   * Look up the target row's owner plus any extra context the caller will
   * need in `notificationMeta` and `revalidatePaths`. Returning `null`
   * means the row has gone away between the toggle and the lookup — in
   * that case notification is skipped and revalidation is still attempted
   * with `extra: null`.
   */
  fetchOwner: (id: string) => Promise<{ userId: string | null; extra: TExtra } | null>;
  /** Build notification metadata. Only called on a fresh like to a non-self. */
  notificationMeta: (id: string, extra: TExtra) => Record<string, unknown>;
  /** Paths to revalidate. `extra` is `null` when the row could not be found. */
  revalidatePaths: (locale: string, id: string, extra: TExtra | null) => string[];
}): Promise<ToggleLikeResult> {
  const { id, locale, fieldName, targetType, fetchOwner, notificationMeta, revalidatePaths } =
    params;

  const uuidError = validateUUID(id, fieldName);
  if (uuidError) return uuidError;

  const guardResult = await authenticateAndGuard(RATE_LIMITS.toggleLike);
  if ('error' in guardResult) return { error: guardResult.error };
  const { user } = guardResult;

  const { liked, likeCount } = await toggleLikeForTarget({
    userId: user.id,
    targetType,
    targetId: id,
  });

  const owner = await fetchOwner(id);

  if (liked && owner && owner.userId && owner.userId !== user.id) {
    createNotification({
      userId: owner.userId,
      actorId: user.id,
      type: 'like',
      targetType,
      targetId: id,
      metadata: notificationMeta(id, owner.extra),
    });
  }

  for (const path of revalidatePaths(locale, id, owner?.extra ?? null)) {
    revalidatePath(path);
  }

  return { liked, likeCount };
}
