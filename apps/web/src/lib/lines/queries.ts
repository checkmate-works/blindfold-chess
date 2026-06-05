import { and, desc, eq } from 'drizzle-orm';

import type { UserLine } from '@/lib/db';
import { db, userLines } from '@/lib/db';

/** A user's own lines, newest first. */
export async function listLinesForUser(userId: string): Promise<UserLine[]> {
  return db
    .select()
    .from(userLines)
    .where(eq(userLines.userId, userId))
    .orderBy(desc(userLines.createdAt));
}

/** A single line, scoped to its owner (returns null if absent or not owned). */
export async function getLineForUser(id: string, userId: string): Promise<UserLine | null> {
  const [row] = await db
    .select()
    .from(userLines)
    .where(and(eq(userLines.id, id), eq(userLines.userId, userId)))
    .limit(1);
  return row ?? null;
}
