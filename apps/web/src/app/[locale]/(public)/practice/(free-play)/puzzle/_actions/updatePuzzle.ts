'use server';

import { eq } from 'drizzle-orm';

import { puzzleSolutions } from '@/lib/db';
import { diffSolutionMoves } from '@/lib/db/diff-fields';
import { updatePositionEntry } from '@/lib/positions/user-position-mutations';
import { normalizePuzzleMoves, validatePuzzleMutationData } from '@/lib/positions/validation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

export type UpdatePuzzleResult = { success: true } | { error: string };

/**
 * Update a puzzle. All authoring fields (title, description, FEN, solution
 * moves) are mutable, matching the convention used by issue trackers, forums,
 * and Q&A platforms (GitHub, Discourse, Stack Overflow): the author retains
 * full editorial control and any drift between an edited puzzle and existing
 * comments is left to readers to interpret in light of the edit history at
 * `/history` (see `updatePositionEntry`'s `position_content_revisions` write).
 *
 * The `puzzle_solutions` row is replaced wholesale (delete + insert in the
 * same transaction) rather than diff-applied — there is at most one row per
 * puzzle in normal use, and replacing keeps the action symmetric with
 * `createPuzzle`. The rows are still read back before the delete so the old
 * vs. new solution moves can be diffed for the revision history; the schema
 * allows more than one row per position (alternative solutions), so the
 * diff compares the full old vs. new row sets rather than assuming a single
 * row.
 */
export async function updatePuzzle(data: {
  id: string;
  fen: string;
  title: string;
  description?: string | null;
  solutionMoves: Array<{ san: string; note?: string | null }>;
  /**
   * When provided (even as []) replaces the position's theme tags. Theme
   * IDs must reference `glossary_terms` rows with `is_theme = true`.
   * Omit to leave existing tags untouched.
   */
  themeIds?: string[];
  /**
   * When provided (even as []) replaces the position's chunk tags.
   * Chunk IDs must reference non-soft-deleted `chunks` rows. Omit to
   * leave existing tags untouched.
   */
  chunkIds?: string[];
}): Promise<UpdatePuzzleResult> {
  const normalizedMoves = normalizePuzzleMoves(data.solutionMoves);

  return updatePositionEntry({
    kind: 'puzzle',
    rateLimit: RATE_LIMITS.updatePuzzle,
    data: {
      id: data.id,
      fen: data.fen,
      title: data.title,
      description: data.description,
      themeIds: data.themeIds,
      chunkIds: data.chunkIds,
    },
    validate: (userId) =>
      validatePuzzleMutationData({
        fen: data.fen,
        title: data.title,
        description: data.description,
        solutionMoves: normalizedMoves,
        userId,
      }),
    applyExtraWrites: async (tx, positionId) => {
      const existingRows = await tx
        .select({ solutionMoves: puzzleSolutions.solutionMoves })
        .from(puzzleSolutions)
        .where(eq(puzzleSolutions.positionId, positionId));

      await tx.delete(puzzleSolutions).where(eq(puzzleSolutions.positionId, positionId));
      await tx.insert(puzzleSolutions).values({
        positionId,
        solutionMoves: normalizedMoves,
      });

      const solutionMovesChange = diffSolutionMoves(
        existingRows.map((row) => row.solutionMoves),
        [normalizedMoves]
      );
      return solutionMovesChange ? { solutionMoves: solutionMovesChange } : undefined;
    },
  });
}
