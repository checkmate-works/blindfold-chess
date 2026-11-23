import { and, eq, inArray, ne, sql } from 'drizzle-orm';

import { announcements, db, likes } from '@/lib/db';
import type { Announcement } from '@/lib/db';

import type { LikeMeta } from './like-queries';

/** Polymorphic `likes.target_type` for an announcement. */
export const ANNOUNCEMENT_LIKE_TARGET = 'announcement';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Serialize announcement mutations, including different locale variants.
 * The table lock also conflicts with ordinary admin INSERT/UPDATE/DELETE,
 * so a variant cannot disappear or change slug between validation and insert.
 * Reads remain concurrent. This deliberately serializes writes across notices;
 * a stable parent table would allow finer locking if write volume warrants it.
 * Never acquire a row lock before this lock (lock upgrades can deadlock).
 */
async function lockAnnouncements(tx: Transaction): Promise<void> {
  await tx.execute(sql`LOCK TABLE ${announcements} IN SHARE ROW EXCLUSIVE MODE`);
}

async function getVariantIds(
  slug: string,
  connection: typeof db | Transaction = db
): Promise<string[]> {
  const rows = await connection
    .select({ id: announcements.id })
    .from(announcements)
    .where(eq(announcements.slug, slug));
  return rows.map((r) => r.id);
}

// Count a registered reader once even for legacy duplicate locale likes.
// Purged accounts have NULL user_id; preserve each anonymised reaction.
const uniqueReaders = sql<number>`count(distinct coalesce(${likes.userId}, ${likes.id}))`;

function likesOn(variantIds: string[]) {
  return and(eq(likes.targetType, ANNOUNCEMENT_LIKE_TARGET), inArray(likes.targetId, variantIds));
}

async function countLikesOn(
  variantIds: string[],
  connection: typeof db | Transaction = db
): Promise<number> {
  if (variantIds.length === 0) return 0;
  const [row] = await connection
    .select({ n: uniqueReaders })
    .from(likes)
    .where(likesOn(variantIds));
  return Number(row?.n ?? 0);
}

/** Count + liked-by-me for the announcement identified by `slug`, across all locales. */
export async function getAnnouncementLikeMeta(
  slug: string,
  currentUserId?: string
): Promise<LikeMeta> {
  const [row] = await db
    .select({
      n: uniqueReaders,
      mine: currentUserId
        ? sql<boolean>`coalesce(bool_or(${likes.userId} = ${currentUserId}), false)`
        : sql<boolean>`false`,
    })
    .from(likes)
    .innerJoin(announcements, eq(likes.targetId, announcements.id))
    .where(and(eq(likes.targetType, ANNOUNCEMENT_LIKE_TARGET), eq(announcements.slug, slug)));
  return { likeCount: Number(row?.n ?? 0), likedByMe: row?.mine ?? false };
}

/** Toggle once per serialized request, across every locale of a slug. */
export async function toggleAnnouncementLike(params: {
  userId: string;
  slug: string;
  displayedVariantId: string;
}): Promise<{ liked: boolean; likeCount: number } | { error: 'notFound' }> {
  const { userId, slug, displayedVariantId } = params;
  return db.transaction(async (tx) => {
    await lockAnnouncements(tx);
    const [displayed] = await tx
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.id, displayedVariantId),
          eq(announcements.slug, slug),
          eq(announcements.status, 'published')
        )
      );
    if (!displayed) return { error: 'notFound' };
    const variantIds = await getVariantIds(slug, tx);
    const removed = await tx
      .delete(likes)
      .where(and(eq(likes.userId, userId), likesOn(variantIds)))
      .returning({ id: likes.id });
    const liked = removed.length === 0;
    if (liked) {
      await tx
        .insert(likes)
        .values({ userId, targetType: ANNOUNCEMENT_LIKE_TARGET, targetId: displayedVariantId });
    }
    return { liked, likeCount: await countLikesOn(variantIds, tx) };
  });
}

/**
 * A slug identifies the measured notice. Moving a translation into or out of
 * a group with reactions would silently transfer or dilute its measurement.
 * Allow editing content, but reject regrouping either measured group.
 */
export async function updateAnnouncementPreservingLikes(
  id: string,
  values: Partial<Announcement>
): Promise<{ error: string } | null> {
  return db.transaction(async (tx) => {
    await lockAnnouncements(tx);
    const [current] = await tx.select().from(announcements).where(eq(announcements.id, id));
    if (!current) return { error: 'not found' };
    if (values.slug && values.slug !== current.slug) {
      const ids = [
        ...(await getVariantIds(current.slug, tx)),
        ...(await getVariantIds(values.slug, tx)),
      ];
      if ((await countLikesOn(ids, tx)) > 0) {
        return { error: 'Cannot change slug when either announcement has likes.' };
      }
    }
    await tx.update(announcements).set(values).where(eq(announcements.id, id));
    return null;
  });
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
    .select({ slug: announcements.slug, n: uniqueReaders })
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
async function moveLikesOffVariantBeingDeleted(tx: Transaction, variantId: string): Promise<void> {
  const [row] = await tx
    .select({ slug: announcements.slug })
    .from(announcements)
    .where(eq(announcements.id, variantId))
    .limit(1);
  if (!row) return;

  const [sibling] = await tx
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
    await tx
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

  await tx.delete(likes).where(onDeleted);
}

/** Move reactions and remove the variant atomically, under the toggle lock. */
export async function deleteAnnouncementWithLikes(id: string): Promise<void> {
  await db.transaction(async (tx) => {
    await lockAnnouncements(tx);
    await moveLikesOffVariantBeingDeleted(tx, id);
    await tx.delete(announcements).where(eq(announcements.id, id));
  });
}
