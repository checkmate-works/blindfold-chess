import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';
import { eq } from 'drizzle-orm';

import { db, userLines } from '@/lib/db';
import { performEntityToggleLike } from '@/lib/db/like-actions';
import type { ToggleLikeResult } from '@/lib/db/like-actions';

export type { ToggleLikeResult };

/**
 * Core "toggle like" for a line (型). Thin wrapper around
 * `performEntityToggleLike` — the generic skeleton supplies auth, rate limit,
 * the INSERT/DELETE, owner notification, and revalidation; this file plugs in
 * the line-specific owner lookup and revalidate fan-out.
 *
 * Plain (non-`"use server"`) module so it can be imported by the route's
 * Server Action wrapper; `targetType = 'line'` is the polymorphic key shared
 * with the `likes` table and notifications.
 */
export async function toggleLineLike(lineId: string, locale: string): Promise<ToggleLikeResult> {
  assertSupportedLocale(locale);

  return performEntityToggleLike<Record<never, never>>({
    id: lineId,
    locale,
    fieldName: 'lineId',
    targetType: 'line',
    fetchOwner: async (id) => {
      const [row] = await db
        .select({ userId: userLines.userId })
        .from(userLines)
        .where(eq(userLines.id, id))
        .limit(1);
      if (!row) return null;
      return { userId: row.userId, extra: {} };
    },
    notificationMeta: (id) => ({ lineId: id }),
    revalidatePaths: (loc, id) => [`/${loc}/lines`, `/${loc}/lines/${id}`],
  });
}
