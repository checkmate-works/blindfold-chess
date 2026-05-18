'use server';

import { puzzleSolutions } from '@/lib/db';
import type { CreatePositionEntryResult } from '@/lib/positions/user-position-mutations';
import { createPositionEntry } from '@/lib/positions/user-position-mutations';
import { normalizePuzzleMoves, validatePuzzleMutationData } from '@/lib/positions/validation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

export type CreatePuzzleResult = CreatePositionEntryResult;

export async function createPuzzle(data: {
  fen: string;
  title: string;
  description?: string | null;
  solutionMoves: Array<{ san: string; note?: string | null }>;
  /**
   * Optional theme tags (glossary terms with `is_theme = true`) to
   * attach to the new position. Validated against the database before
   * the insert transaction begins so a bad ID rejects the whole create
   * up-front rather than failing partway in.
   */
  themeIds?: string[];
  /** Optional chunk tags (non-soft-deleted) to attach. */
  chunkIds?: string[];
  /**
   * When forking from an existing puzzle, the id of the source row.
   * Validated against the database (must exist, share `type='puzzle'`,
   * not be soft-deleted, not be owned by the current user, and not have
   * `forks_disabled_at` set) before the insert begins.
   */
  forkedFromId?: string | null;
}): Promise<CreatePuzzleResult> {
  const normalizedMoves = normalizePuzzleMoves(data.solutionMoves);

  return createPositionEntry({
    kind: 'puzzle',
    rateLimit: RATE_LIMITS.createPuzzle,
    data: {
      fen: data.fen,
      title: data.title,
      description: data.description,
      themeIds: data.themeIds,
      chunkIds: data.chunkIds,
      forkedFromId: data.forkedFromId,
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
      await tx.insert(puzzleSolutions).values({
        positionId,
        solutionMoves: normalizedMoves,
      });
    },
  });
}
