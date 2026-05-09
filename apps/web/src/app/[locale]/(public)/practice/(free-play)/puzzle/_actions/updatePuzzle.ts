'use server';

import { revalidatePath } from 'next/cache';

import { and, eq, inArray, isNull } from 'drizzle-orm';

import { authenticateAndGuard } from '@/lib/auth';
import {
  chunks,
  db,
  glossaryTerms,
  positionChunks,
  positionThemes,
  positions,
  puzzleSolutions,
} from '@/lib/db';
import { normalizePuzzleMoves, validatePuzzleMutationData } from '@/lib/positions/validation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { logActivityEvent } from '@/lib/users/activity-log';

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
  const guardResult = await authenticateAndGuard(RATE_LIMITS.updatePuzzle);

  if ('error' in guardResult) {
    return { error: guardResult.error };
  }

  const { user } = guardResult;

  const normalizedMoves = normalizePuzzleMoves(data.solutionMoves);

  const validationError = validatePuzzleMutationData({
    fen: data.fen,
    title: data.title,
    description: data.description,
    solutionMoves: normalizedMoves,
    userId: user.id,
  });

  if (validationError) {
    return { error: validationError };
  }

  const [position] = await db
    .select({
      id: positions.id,
      userId: positions.userId,
      type: positions.type,
      deletedAt: positions.deletedAt,
    })
    .from(positions)
    .where(eq(positions.id, data.id))
    .limit(1);

  if (!position || position.type !== 'puzzle') {
    return { error: 'notFound' };
  }

  if (position.userId !== user.id) {
    return { error: 'unauthorized' };
  }

  if (position.deletedAt) {
    return { error: 'alreadyDeleted' };
  }

  // App-layer validation of tag IDs. The application connects with
  // service-role-equivalent privileges so the RLS predicates on
  // position_themes / position_chunks (which would also enforce
  // is_theme = true and chunks.deleted_at IS NULL) do not fire on
  // these writes — we re-assert the same predicates here.
  const dedupedThemeIds = data.themeIds ? Array.from(new Set(data.themeIds)) : undefined;
  const dedupedChunkIds = data.chunkIds ? Array.from(new Set(data.chunkIds)) : undefined;

  if (dedupedThemeIds && dedupedThemeIds.length > 0) {
    const validThemes = await db
      .select({ id: glossaryTerms.id })
      .from(glossaryTerms)
      .where(and(inArray(glossaryTerms.id, dedupedThemeIds), eq(glossaryTerms.isTheme, true)));
    if (validThemes.length !== dedupedThemeIds.length) {
      return { error: 'invalidTheme' };
    }
  }

  if (dedupedChunkIds && dedupedChunkIds.length > 0) {
    const validChunks = await db
      .select({ id: chunks.id })
      .from(chunks)
      .where(and(inArray(chunks.id, dedupedChunkIds), isNull(chunks.deletedAt)));
    if (validChunks.length !== dedupedChunkIds.length) {
      return { error: 'invalidChunk' };
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(positions)
      .set({
        fen: data.fen.trim(),
        title: data.title.trim(),
        description: data.description?.trim() || null,
      })
      .where(
        and(eq(positions.id, data.id), eq(positions.userId, user.id), isNull(positions.deletedAt))
      );

    await tx.delete(puzzleSolutions).where(eq(puzzleSolutions.positionId, data.id));
    await tx.insert(puzzleSolutions).values({
      positionId: data.id,
      solutionMoves: normalizedMoves,
    });

    if (dedupedThemeIds !== undefined) {
      await tx.delete(positionThemes).where(eq(positionThemes.positionId, data.id));
      if (dedupedThemeIds.length > 0) {
        await tx.insert(positionThemes).values(
          dedupedThemeIds.map((termId) => ({
            positionId: data.id,
            termId,
            attachedByUserId: user.id,
          }))
        );
      }
    }

    if (dedupedChunkIds !== undefined) {
      await tx.delete(positionChunks).where(eq(positionChunks.positionId, data.id));
      if (dedupedChunkIds.length > 0) {
        await tx.insert(positionChunks).values(
          dedupedChunkIds.map((chunkId) => ({
            positionId: data.id,
            chunkId,
            attachedByUserId: user.id,
          }))
        );
      }
    }
  });

  logActivityEvent({
    userId: user.id,
    action: 'update_puzzle',
    targetType: 'position',
    targetId: data.id,
    metadata: { type: 'puzzle' },
  });

  revalidatePath('/practice/puzzle');
  revalidatePath(`/practice/puzzle/${data.id}`);

  return { success: true };
}
