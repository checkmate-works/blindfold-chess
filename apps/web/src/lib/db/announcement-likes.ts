import { and, count, eq, inArray, ne, sql } from 'drizzle-orm';

import { announcements, db, likes } from './index';
import type { LikeMeta } from './like-queries';

/** Polymorphic `likes.target_type` for an announcement. */
export const ANNOUNCEMENT_LIKE_TARGET = 'announcement';

/**
 * Likes on an announcement belong to its slug, not to one locale row.
 *
 * An announcement is stored as one `announcements` row per locale sharing a
 * slug, and readers in different locales are reading the same notice. The
 * like count exists so the operators can compare how notices were received,
 * so it has to add up every locale's readers — and one reader who opens the
 * Japanese page after the English one must not be able to like it twice.
 *
 * Each like row still points at a concrete row id (the variant the reader
 * was shown) because `likes.target_id` is a uuid. Every read and the toggle
 * therefore resolve the slug to all of its row ids first; deleting a variant
 * moves its likes to a sibling (`moveLikesOffVariantBeingDeleted`).
 */
async function getVariantIds(slug: string): Promise<string[]> {
  const rows = await db
    .select({ id: announcements.id })
    .from(announcements)
    .where(eq(announcements.slug, slug));
  return rows.map((r) => r.id);
}

function likesOn(variantIds: string[]) {
  return and(eq(likes.targetType, ANNOUNCEMENT_LIKE_TARGET), inArray(likes.targetId, variantIds));
}

async function countLikesOn(variantIds: string[]): Promise<number> {
  if (variantIds.length === 0) return 0;
  const [row] = await db.select({ n: count() }).from(likes).where(likesOn(variantIds));
  return Number(row?.n ?? 0);
}

/** Count + liked-by-me for the announcement identified by `slug`, across all locales. */
export async function getAnnouncementLikeMeta(
  slug: string,
  currentUserId?: string
): Promise<LikeMeta> {
  const variantIds = await getVariantIds(slug);
  if (variantIds.length === 0) return { likeCount: 0, likedByMe: false };

  const [likeCount, mine] = await Promise.all([
    countLikesOn(variantIds),
    currentUserId
      ? db
          .select({ id: likes.id })
          .from(likes)
          .where(and(eq(likes.userId, currentUserId), likesOn(variantIds)))
          .limit(1)
      : Promise.resolve([]),
  ]);

  return { likeCount, likedByMe: mine.length > 0 };
}

/**
 * Toggle `userId`'s like on the announcement `slug`.
 *
 * Delete-first: removing the user's like from any variant is what "unlike"
 * means here, since the like may sit on a different locale's row than the one
 * being viewed (`displayedVariantId`). Only when nothing was removed is a new
 * like inserted, on the displayed row. A double-submit that races past the
 * delete lands on the same `(user, type, row)` and the unique constraint
 * absorbs it via `onConflictDoNothing`.
 */
export async function toggleAnnouncementLike(params: {
  userId: string;
  slug: string;
  displayedVariantId: string;
}): Promise<{ liked: boolean; likeCount: number }> {
  const { userId, slug, displayedVariantId } = params;
  const variantIds = await getVariantIds(slug);

  const removed = await db
    .delete(likes)
    .where(and(eq(likes.userId, userId), likesOn(variantIds)))
    .returning({ id: likes.id });

  const liked = removed.length === 0;
  if (liked) {
    await db
      .insert(likes)
      .values({ userId, targetType: ANNOUNCEMENT_LIKE_TARGET, targetId: displayedVariantId })
      .onConflictDoNothing();
  }

  return { liked, likeCount: await countLikesOn(variantIds) };
}

/**
 * Like totals per slug, for the admin listing. Slugs nobody liked are absent
 * from the map.
 */
export async function getAnnouncementLikeCountsBySlug(
  slugs: string[]
): Promise<Map<string, number>> {
  if (slugs.length === 0) return new Map();

  const rows = await db
    .select({ slug: announcements.slug, n: count(likes.id) })
    .from(likes)
    .innerJoin(announcements, eq(likes.targetId, announcements.id))
    .where(and(eq(likes.targetType, ANNOUNCEMENT_LIKE_TARGET), inArray(announcements.slug, slugs)))
    .groupBy(announcements.slug);

  return new Map(rows.map((r) => [r.slug, Number(r.n)]));
}

/**
 * Keep the likes of a variant about to be deleted counted against its
 * announcement. Call it before the row is deleted.
 *
 * `likes` has no foreign key to its polymorphic target, so a like on a
 * deleted row would silently drop out of the slug's total (and linger as an
 * orphan). When another variant of the slug survives, the likes move to it —
 * except a user who already has a like on that sibling, whose duplicate is
 * dropped so the per-slug "one like per user" invariant holds. When no
 * variant survives the announcement is gone and its likes go with it.
 */
export async function moveLikesOffVariantBeingDeleted(variantId: string): Promise<void> {
  const [row] = await db
    .select({ slug: announcements.slug })
    .from(announcements)
    .where(eq(announcements.id, variantId))
    .limit(1);
  if (!row) return;

  const [sibling] = await db
    .select({ id: announcements.id })
    .from(announcements)
    .where(and(eq(announcements.slug, row.slug), ne(announcements.id, variantId)))
    .orderBy(announcements.createdAt)
    .limit(1);

  const onDeleted = and(
    eq(likes.targetType, ANNOUNCEMENT_LIKE_TARGET),
    eq(likes.targetId, variantId)
  );

  if (sibling) {
    await db
      .update(likes)
      .set({ targetId: sibling.id })
      .where(
        and(
          onDeleted,
          sql`(${likes.userId} IS NULL OR ${likes.userId} NOT IN (
            SELECT ${likes.userId} FROM ${likes}
            WHERE ${likes.targetType} = ${ANNOUNCEMENT_LIKE_TARGET}
              AND ${likes.targetId} = ${sibling.id}
              AND ${likes.userId} IS NOT NULL
          ))`
        )
      );
  }

  await db.delete(likes).where(onDeleted);
}
