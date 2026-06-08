import { and, eq, inArray, isNull } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { chessOpenings, db, repertoireLines, repertoireOpenings, repertoires } from '@/lib/db';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

import { assertRepertoireOwner } from './queries';
import type { RepertoireImportInput, RepertoireLineEditError } from './validation';
import { validateRepertoireImport, validateRepertoireLineEdit } from './validation';

export type CreateRepertoireResult = ActionResult<{ id: string }>;
export type DeleteRepertoireResult = ActionResult;

export type UpdateLineResult =
  | { ok: true }
  | { ok: false; error: 'unauthorized' | 'notFound' | RepertoireLineEditError };

/**
 * Owner-only: replace a single line's name + moves. The line is addressed by
 * its 1-based number (seq + 1); its root position is fixed (editing changes the
 * moves only). Position-keyed annotations / comments are not touched — they
 * follow the surviving positions automatically.
 */
export async function updateRepertoireLine(params: {
  repertoireId: string;
  lineNo: number;
  viewerId: string;
  name: string | null;
  pgn: string;
}): Promise<UpdateLineResult> {
  const ownerError = await assertRepertoireOwner(params.repertoireId, params.viewerId);
  if (ownerError) return { ok: false, error: ownerError };

  const [line] = await db
    .select({ id: repertoireLines.id, startingFen: repertoireLines.startingFen })
    .from(repertoireLines)
    .where(
      and(
        eq(repertoireLines.repertoireId, params.repertoireId),
        eq(repertoireLines.seq, params.lineNo - 1),
        isNull(repertoireLines.deletedAt)
      )
    )
    .limit(1);
  if (!line) return { ok: false, error: 'notFound' };

  const validated = validateRepertoireLineEdit({
    name: params.name,
    pgn: params.pgn,
    startingFen: line.startingFen,
  });
  if (!validated.ok) return { ok: false, error: validated.error };

  await db
    .update(repertoireLines)
    .set({ name: validated.data.name, pgn: validated.data.pgn })
    .where(eq(repertoireLines.id, line.id));

  return { ok: true };
}

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

  // Opening links only apply to opening-phase repertoires. Re-validate the ids
  // against the master so an invalid id can't trip the FK (and to dedupe).
  const requestedOpeningIds =
    phase === 'opening' && input.openingIds?.length ? [...new Set(input.openingIds)] : [];

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

    if (requestedOpeningIds.length > 0) {
      const valid = await tx
        .select({ id: chessOpenings.id })
        .from(chessOpenings)
        .where(inArray(chessOpenings.id, requestedOpeningIds));
      if (valid.length > 0) {
        await tx
          .insert(repertoireOpenings)
          .values(valid.map((o) => ({ repertoireId: repertoire.id, openingId: o.id })));
      }
    }

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
