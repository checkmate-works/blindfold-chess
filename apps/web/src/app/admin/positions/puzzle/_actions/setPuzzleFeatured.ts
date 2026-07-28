'use server';

// eslint-disable-next-line no-restricted-imports -- FeaturePuzzleToggle explicitly relies on this revalidate for its re-render (see its TSDoc); there is no router.refresh() in that flow
import { revalidatePath, revalidateTag } from 'next/cache';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { and, eq, isNull } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { DAILY_PUZZLE_CACHE_TAG } from '@/lib/cache-tags';
import { db, featuredPuzzles, moderationActions, positions } from '@/lib/db';
import { getClientIp } from '@/lib/security/client-ip';

/**
 * Add or remove a puzzle from the Daily Puzzle pool (`featured_puzzles`).
 *
 * Featuring requires a live puzzle (`type = 'puzzle'`, not soft-deleted) —
 * this is where the pool's type invariant is enforced, since the FK alone
 * cannot express it. Unfeaturing skips the soft-delete check so a stale pool
 * row can always be cleaned up after the puzzle was removed.
 *
 * Idempotent: repeating a request the pool already satisfies (double-click,
 * stale list) succeeds without writing a duplicate audit row.
 */
export async function setPuzzleFeatured(id: string, featured: boolean): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  if (!id) {
    return { error: 'Position ID is required' };
  }

  const conditions = [eq(positions.id, id), eq(positions.type, 'puzzle')];
  if (featured) {
    conditions.push(isNull(positions.deletedAt));
  }

  const [position] = await db
    .select({ id: positions.id, title: positions.title, userId: positions.userId })
    .from(positions)
    .where(and(...conditions))
    .limit(1);

  if (!position) {
    return { error: 'Puzzle not found' };
  }

  const ipAddress = await getClientIp();

  await db.transaction(async (tx) => {
    const changedRows = featured
      ? await tx
          .insert(featuredPuzzles)
          .values({ positionId: id })
          .onConflictDoNothing()
          .returning({ positionId: featuredPuzzles.positionId })
      : await tx
          .delete(featuredPuzzles)
          .where(eq(featuredPuzzles.positionId, id))
          .returning({ positionId: featuredPuzzles.positionId });

    if (changedRows.length > 0) {
      await tx.insert(moderationActions).values({
        actorId: auth.userId,
        action: featured ? 'feature_puzzle' : 'unfeature_puzzle',
        targetType: 'position',
        targetId: id,
        reason: null,
        metadata: {
          title: position.title,
          authorId: position.userId,
        },
        ipAddress,
      });
    }
  });

  revalidateTag(DAILY_PUZZLE_CACHE_TAG, { expire: 0 });
  revalidatePath('/admin/positions/puzzle');

  return { success: true };
}
