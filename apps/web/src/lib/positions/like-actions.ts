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
 * position-specific owner lookup and notification metadata.
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
  });
}
