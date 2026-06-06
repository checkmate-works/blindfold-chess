import { and, asc, desc, eq, isNull } from 'drizzle-orm';

import type { Repertoire, RepertoireLine } from '@/lib/db';
import { db, profiles, repertoireLines, repertoires } from '@/lib/db';

/** Author subset joined onto a repertoire for catalog cards. */
export type RepertoireAuthorProfile = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type RepertoireWithProfile = {
  repertoire: Repertoire;
  profile: RepertoireAuthorProfile | null;
};

/** A user's own live (non-deleted) repertoires, newest first, with author. */
export async function listRepertoiresForUser(userId: string): Promise<RepertoireWithProfile[]> {
  const rows = await db
    .select({
      repertoire: repertoires,
      profile: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(repertoires)
    .leftJoin(profiles, eq(repertoires.userId, profiles.id))
    .where(and(eq(repertoires.userId, userId), isNull(repertoires.deletedAt)))
    .orderBy(desc(repertoires.createdAt));

  return rows.map((row) => ({
    repertoire: row.repertoire,
    profile: row.profile?.username ? row.profile : null,
  }));
}

export type RepertoireWithLines = { repertoire: Repertoire; lines: RepertoireLine[] };

/**
 * A single live repertoire with its live lines (ordered), scoped to the owner.
 * Returns null if absent, deleted, or not owned.
 */
export async function getRepertoireForUser(
  id: string,
  userId: string
): Promise<RepertoireWithLines | null> {
  const [repertoire] = await db
    .select()
    .from(repertoires)
    .where(
      and(eq(repertoires.id, id), eq(repertoires.userId, userId), isNull(repertoires.deletedAt))
    )
    .limit(1);
  if (!repertoire) return null;

  const lines = await db
    .select()
    .from(repertoireLines)
    .where(and(eq(repertoireLines.repertoireId, repertoire.id), isNull(repertoireLines.deletedAt)))
    .orderBy(asc(repertoireLines.seq));

  return { repertoire, lines };
}
