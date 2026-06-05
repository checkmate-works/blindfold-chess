import { and, eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { db, userLines } from '@/lib/db';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

import type { LineImportInput } from './validation';
import { validateLineImport } from './validation';

export type CreateLineResult = ActionResult<{ id: string }>;
export type DeleteLineResult = ActionResult;

/**
 * Create a repertoire line for the authenticated user.
 *
 * `userId` is taken from the session, never from the caller. The PGN is
 * validated (and its starting position derived) via {@link validateLineImport}
 * before insert, so an illegal/malformed tree is rejected with a typed error.
 */
export async function createLineEntry(input: LineImportInput): Promise<CreateLineResult> {
  const guard = await authenticateAndGuard(RATE_LIMITS.createLine);
  if ('error' in guard) return { error: guard.error };
  const { user } = guard;

  const validated = validateLineImport(input);
  if (!validated.ok) return { error: validated.error };

  const [row] = await db
    .insert(userLines)
    .values({
      userId: user.id,
      name: validated.data.name,
      side: validated.data.side,
      startingFen: validated.data.startingFen,
      pgn: validated.data.pgn,
    })
    .returning({ id: userLines.id });

  return { success: true, id: row.id };
}

/**
 * Hard-delete a line. Scoped to the owner via the WHERE clause, so another
 * user's id can never match; `notFound` covers both "absent" and "not yours".
 */
export async function deleteLineEntry(id: string): Promise<DeleteLineResult> {
  const guard = await authenticateAndGuard(RATE_LIMITS.deleteLine);
  if ('error' in guard) return { error: guard.error };
  const { user } = guard;

  const deleted = await db
    .delete(userLines)
    .where(and(eq(userLines.id, id), eq(userLines.userId, user.id)))
    .returning({ id: userLines.id });

  if (deleted.length === 0) return { error: 'notFound' };
  return { success: true };
}
