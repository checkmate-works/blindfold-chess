import { assertSupportedLocale } from '@/i18n/assertSupportedLocale';
import { eq } from 'drizzle-orm';

import { db, positions } from '@/lib/db';
import { performEntityToggleLike } from '@/lib/db/like-actions';
import type { ToggleLikeResult } from '@/lib/db/like-actions';
import { parsePositionType } from '@/lib/positions/types';
import type { PositionType } from '@/lib/positions/types';

export type { ToggleLikeResult };

/**
 * Core implementation of the "toggle like" operation for a position.
 *
 * Thin wrapper around `performEntityToggleLike` — the orchestration
 * skeleton lives in `@/lib/db/like-actions`, and this file supplies the
 * position-specific owner lookup, notification metadata, and revalidate
 * fan-out (which differs between puzzles and position-memory rows).
 *
 * Plain (non-`"use server"`) module so it can be imported by Server
 * Actions in multiple routes. The caller must be an async `"use server"`
 * wrapper.
 */
export async function togglePositionLike(
  positionId: string,
  locale: string
): Promise<ToggleLikeResult> {
  assertSupportedLocale(locale);

  return performEntityToggleLike<{ positionType: PositionType | null }>({
    id: positionId,
    locale,
    fieldName: 'positionId',
    targetType: 'position',
    fetchOwner: async (id) => {
      const [row] = await db
        .select({ userId: positions.userId, type: positions.type })
        .from(positions)
        .where(eq(positions.id, id))
        .limit(1);
      if (!row) return null;
      return {
        userId: row.userId,
        extra: { positionType: parsePositionType(row.type) },
      };
    },
    notificationMeta: (positionId, { positionType }) => ({
      positionId,
      // Include `positionType` so the recipient's notification link can be
      // routed to the correct detail page (memory vs puzzle vs sequence).
      // Without this, notifications on puzzle positions would default to
      // the position-memory detail URL and 404. Falls back to omitting
      // `positionType` for defensive safety when the raw DB value is
      // outside the known union.
      ...(positionType ? { positionType } : {}),
    }),
    revalidatePaths: (locale, positionId, extra) => {
      // Revalidate the detail page for whichever position type this row
      // is, so a freshly-loaded SSR render reflects the new like count.
      // The list pages are revalidated too, but the puzzle list is
      // paginated/generic enough that `/practice/puzzle` alone is
      // sufficient. When the row vanished between the toggle and the
      // lookup we fall back to position-memory, which is the most common
      // case (puzzles are only created internally for now).
      if (extra?.positionType === 'puzzle') {
        return [`/${locale}/practice/puzzle`, `/${locale}/practice/puzzle/${positionId}`];
      }
      return [
        `/${locale}/practice/position-memory`,
        `/${locale}/practice/position-memory/${positionId}`,
      ];
    },
  });
}
