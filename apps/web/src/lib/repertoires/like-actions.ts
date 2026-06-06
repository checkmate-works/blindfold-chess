import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';
import { eq } from 'drizzle-orm';

import { db, repertoires } from '@/lib/db';
import { performEntityToggleLike } from '@/lib/db/like-actions';
import type { ToggleLikeResult } from '@/lib/db/like-actions';

export type { ToggleLikeResult };

/**
 * Core "toggle like" for a repertoire (型). Thin wrapper around the generic
 * `performEntityToggleLike` (auth, rate limit, INSERT/DELETE, owner
 * notification, revalidation) with the repertoire-specific owner lookup.
 * `targetType = 'repertoire'` is the polymorphic key shared with the `likes`
 * table and notifications.
 */
export async function toggleRepertoireLike(
  repertoireId: string,
  locale: string
): Promise<ToggleLikeResult> {
  assertSupportedLocale(locale);

  return performEntityToggleLike<Record<never, never>>({
    id: repertoireId,
    locale,
    fieldName: 'repertoireId',
    targetType: 'repertoire',
    fetchOwner: async (id) => {
      const [row] = await db
        .select({ userId: repertoires.userId })
        .from(repertoires)
        .where(eq(repertoires.id, id))
        .limit(1);
      if (!row) return null;
      return { userId: row.userId, extra: {} };
    },
    notificationMeta: (id) => ({ repertoireId: id }),
    revalidatePaths: (loc, id) => [`/${loc}/lines`, `/${loc}/lines/${id}`],
  });
}
