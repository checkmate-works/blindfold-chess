import { cache } from 'react';

import { count, desc, eq } from 'drizzle-orm';

import {
  AUTHOR_PROFILE_COLUMNS,
  db,
  liveProfileJoinOn,
  positionContentRevisions,
  profiles,
} from '@/lib/db';
import { UUID_RE } from '@/lib/validations/uuid';

/**
 * A single `position_content_revisions` row joined with the editor's live
 * profile (`null` when the editor's account was hard-deleted, or the row
 * predates any editor tracking).
 */
export type PositionContentRevisionWithProfile = {
  revision: typeof positionContentRevisions.$inferSelect;
  profile: { username: string; displayName: string | null; avatarUrl: string | null } | null;
};

/**
 * List a position's edit history, newest first — the sole read this table
 * serves (see the table's `@design` note in `schema/positions.ts`). Public:
 * positions are a public UGC catalog, so their edit history is public too.
 */
export const listContentRevisionsForPosition = cache(
  async (positionId: string): Promise<PositionContentRevisionWithProfile[]> => {
    if (!UUID_RE.test(positionId)) return [];

    const rows = await db
      .select({
        revision: positionContentRevisions,
        profile: AUTHOR_PROFILE_COLUMNS,
      })
      .from(positionContentRevisions)
      .leftJoin(profiles, liveProfileJoinOn(positionContentRevisions.editorId))
      .where(eq(positionContentRevisions.positionId, positionId))
      .orderBy(desc(positionContentRevisions.createdAt));

    return rows;
  }
);

/**
 * Count-only variant for the detail page's "Edited" link, which only needs
 * to know whether any revision exists (and doesn't want the profile join or
 * full row payload just to render a boolean-gated link).
 */
export const countContentRevisionsForPosition = cache(
  async (positionId: string): Promise<number> => {
    if (!UUID_RE.test(positionId)) return 0;

    const [row] = await db
      .select({ count: count() })
      .from(positionContentRevisions)
      .where(eq(positionContentRevisions.positionId, positionId));

    return row?.count ?? 0;
  }
);
