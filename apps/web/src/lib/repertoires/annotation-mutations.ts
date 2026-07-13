import { and, eq } from 'drizzle-orm';

import type { BoardAnnotations } from '@/lib/board-annotations/types';
import { db, repertoireAnnotations } from '@/lib/db';

import { assertRepertoireOwner } from './queries';
import { REPERTOIRE_ANNOTATION_MAX } from './validation';

export type AnnotationMutationError = 'unauthorized' | 'notFound' | 'empty' | 'tooLong';

export type UpsertAnnotationResult =
  | { ok: true; text: string; updatedAt: Date }
  | { ok: false; error: AnnotationMutationError };

export type DeleteAnnotationResult =
  | { ok: true }
  | { ok: false; error: 'unauthorized' | 'notFound' };

/**
 * Create or replace the owner's "why this move" note for a position. Keyed by
 * (repertoire, positionKey) so re-saving the same move's note updates in place
 * and the note is shared across every line that reaches the position.
 */
export async function upsertAnnotation(params: {
  repertoireId: string;
  viewerId: string;
  positionKey: string;
  text: string;
}): Promise<UpsertAnnotationResult> {
  const text = params.text.trim();
  if (!text) return { ok: false, error: 'empty' };
  if (text.length > REPERTOIRE_ANNOTATION_MAX) return { ok: false, error: 'tooLong' };

  const ownerError = await assertRepertoireOwner(params.repertoireId, params.viewerId);
  if (ownerError) return { ok: false, error: ownerError };

  const [row] = await db
    .insert(repertoireAnnotations)
    .values({ repertoireId: params.repertoireId, positionKey: params.positionKey, text })
    .onConflictDoUpdate({
      target: [repertoireAnnotations.repertoireId, repertoireAnnotations.positionKey],
      set: { text, updatedAt: new Date() },
    })
    .returning({ text: repertoireAnnotations.text, updatedAt: repertoireAnnotations.updatedAt });

  return { ok: true, text: row.text, updatedAt: row.updatedAt };
}

export type SaveShapesResult = { ok: true } | { ok: false; error: 'unauthorized' | 'notFound' };

function isEmptyShapes(shapes: BoardAnnotations): boolean {
  return shapes.arrows.length === 0 && shapes.circles.length === 0;
}

/**
 * Replace the board markup (arrows + circles) drawn over a position. Shapes are
 * a value object, so every save sends the whole set — the drawing surface calls
 * this on each stroke, debounced.
 *
 * Clearing the last shape does NOT drop the owner's note: the row survives with
 * empty shapes whenever there is text, and is removed entirely only when both
 * halves are empty (see {@link deleteAnnotation} for the mirror case).
 */
export async function saveAnnotationShapes(params: {
  repertoireId: string;
  viewerId: string;
  positionKey: string;
  shapes: BoardAnnotations;
}): Promise<SaveShapesResult> {
  const ownerError = await assertRepertoireOwner(params.repertoireId, params.viewerId);
  if (ownerError) return { ok: false, error: ownerError };

  const rowMatches = and(
    eq(repertoireAnnotations.repertoireId, params.repertoireId),
    eq(repertoireAnnotations.positionKey, params.positionKey)
  );

  if (isEmptyShapes(params.shapes)) {
    const [row] = await db
      .update(repertoireAnnotations)
      .set({ shapes: params.shapes, updatedAt: new Date() })
      .where(rowMatches)
      .returning({ text: repertoireAnnotations.text });
    if (row && row.text === '') {
      await db.delete(repertoireAnnotations).where(rowMatches);
    }
    return { ok: true };
  }

  await db
    .insert(repertoireAnnotations)
    .values({
      repertoireId: params.repertoireId,
      positionKey: params.positionKey,
      shapes: params.shapes,
    })
    .onConflictDoUpdate({
      target: [repertoireAnnotations.repertoireId, repertoireAnnotations.positionKey],
      set: { shapes: params.shapes, updatedAt: new Date() },
    });

  return { ok: true };
}

/**
 * Remove the owner's note for a position. Any shapes drawn over the same
 * position are independent content, so they survive — the row is deleted only
 * when nothing is left on it.
 */
export async function deleteAnnotation(params: {
  repertoireId: string;
  viewerId: string;
  positionKey: string;
}): Promise<DeleteAnnotationResult> {
  const ownerError = await assertRepertoireOwner(params.repertoireId, params.viewerId);
  if (ownerError) return { ok: false, error: ownerError };

  const rowMatches = and(
    eq(repertoireAnnotations.repertoireId, params.repertoireId),
    eq(repertoireAnnotations.positionKey, params.positionKey)
  );

  const [row] = await db
    .update(repertoireAnnotations)
    .set({ text: '', updatedAt: new Date() })
    .where(rowMatches)
    .returning({ shapes: repertoireAnnotations.shapes });

  if (row && isEmptyShapes(row.shapes)) {
    await db.delete(repertoireAnnotations).where(rowMatches);
  }

  return { ok: true };
}
