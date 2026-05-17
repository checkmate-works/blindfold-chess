'use server';

import { eq } from 'drizzle-orm';

import { puzzleSolutions } from '@/lib/db';
import { updatePositionEntry } from '@/lib/positions/user-position-mutations';
import { normalizePuzzleMoves, validatePuzzleMutationData } from '@/lib/positions/validation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

export type UpdatePuzzleResult = { success: true } | { error: string };

/**
 * Update a puzzle. All authoring fields (title, description, FEN, solution
 * moves) are mutable, matching the convention used by issue trackers, forums,
 * and Q&A platforms (GitHub, Discourse, Stack Overflow): the author retains
 * full editorial control, an "(edited)" marker is surfaced on the detail
 * page, and any drift between an edited puzzle and existing comments is
 * left to readers to interpret in light of that marker.
 *
 * The `puzzle_solutions` row is replaced wholesale (delete + insert in the
 * same transaction) rather than diff-applied — there is at most one row per
 * puzzle in normal use, and replacing keeps the action symmetric with
 * `createPuzzle`.
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
      await tx.delete(puzzleSolutions).where(eq(puzzleSolutions.positionId, positionId));
      await tx.insert(puzzleSolutions).values({
        positionId,
        solutionMoves: normalizedMoves,
      });
    },
  });
}
