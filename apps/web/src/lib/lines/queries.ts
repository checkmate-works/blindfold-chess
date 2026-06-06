import { and, desc, eq, isNull } from 'drizzle-orm';

import type { UserLine } from '@/lib/db';
import { db, profiles, userLines } from '@/lib/db';

/** Author subset joined onto a line row for catalog cards. */
export type LineAuthorProfile = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type LineWithProfile = { line: UserLine; profile: LineAuthorProfile | null };

/**
 * A user's own live (non-deleted) lines, newest first, each with its author
 * profile joined (the author is the owner; the profile shape matches what
 * `CatalogListCard` expects). `profile` is null when the join finds no row.
 */
export async function listLinesForUser(userId: string): Promise<LineWithProfile[]> {
  const rows = await db
    .select({
      line: userLines,
      profile: {
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(userLines)
    .leftJoin(profiles, eq(userLines.userId, profiles.id))
    .where(and(eq(userLines.userId, userId), isNull(userLines.deletedAt)))
    .orderBy(desc(userLines.createdAt));

  return rows.map((row) => ({
    line: row.line,
    profile: row.profile?.username ? row.profile : null,
  }));
}

/**
 * A single live line, scoped to its owner (returns null if absent, deleted, or
 * not owned).
 */
export async function getLineForUser(id: string, userId: string): Promise<UserLine | null> {
  const [row] = await db
    .select()
    .from(userLines)
    .where(and(eq(userLines.id, id), eq(userLines.userId, userId), isNull(userLines.deletedAt)))
    .limit(1);
  return row ?? null;
}
