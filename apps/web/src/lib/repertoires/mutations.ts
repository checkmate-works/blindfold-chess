import { and, eq, isNull } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { db, repertoireLines, repertoires } from '@/lib/db';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

import type { RepertoireImportInput } from './validation';
import { validateRepertoireImport } from './validation';

export type CreateRepertoireResult = ActionResult<{ id: string }>;
export type DeleteRepertoireResult = ActionResult;

/**
 * Create a repertoire (型) for the authenticated user, decomposing the imported
 * PGN into one `repertoire_lines` row per line. Repertoire + lines are inserted
 * in a single transaction; `userId` comes from the session.
 */
export async function createRepertoireEntry(
  input: RepertoireImportInput
): Promise<CreateRepertoireResult> {
  const guard = await authenticateAndGuard(RATE_LIMITS.createRepertoire);
  if ('error' in guard) return { error: guard.error };
  const { user } = guard;

  const validated = validateRepertoireImport(input);
  if (!validated.ok) return { error: validated.error };
  const { name, side, phase, description, startingFen, lines } = validated.data;

  const id = await db.transaction(async (tx) => {
    const [repertoire] = await tx
      .insert(repertoires)
      .values({ userId: user.id, name, side, phase, description, startingFen })
      .returning({ id: repertoires.id });

    await tx.insert(repertoireLines).values(
      lines.map((line, index) => ({
        repertoireId: repertoire.id,
        pgn: line.pgn,
        startingFen: line.startingFen,
        seq: index,
      }))
    );

    return repertoire.id;
  });

  return { success: true, id };
}

/**
 * Soft-delete a repertoire (stamp `deleted_at`); its lines cascade-hide behind
 * the parent in reads. Owner- and live-scoped via the WHERE clause, so a
 * re-delete or another user's id is a no-op → `notFound`.
 */
export async function deleteRepertoireEntry(id: string): Promise<DeleteRepertoireResult> {
  const guard = await authenticateAndGuard(RATE_LIMITS.deleteRepertoire);
  if ('error' in guard) return { error: guard.error };
  const { user } = guard;

  const deleted = await db
    .update(repertoires)
    .set({ deletedAt: new Date() })
    .where(
      and(eq(repertoires.id, id), eq(repertoires.userId, user.id), isNull(repertoires.deletedAt))
    )
    .returning({ id: repertoires.id });

  if (deleted.length === 0) return { error: 'notFound' };
  return { success: true };
}
