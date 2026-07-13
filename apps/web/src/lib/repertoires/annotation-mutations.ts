import { and, eq } from 'drizzle-orm';

import { EMPTY_BOARD_ANNOTATIONS, isEmptyBoardAnnotations } from '@/lib/board-annotations/types';
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

export type SaveShapesResult = { ok: true } | { ok: false; error: 'unauthorized' | 'notFound' };

/**
 * The single row a (repertoire, position) pair can have — the table's unique
 * key, and hence the WHERE clause of every write below.
 */
function annotationRow(repertoireId: string, positionKey: string) {
  return and(
    eq(repertoireAnnotations.repertoireId, repertoireId),
    eq(repertoireAnnotations.positionKey, positionKey)
  );
}

/**
 * An annotation row holds two independent halves — the note and the board
 * markup — and each write path owns only one of them. Emptying a half is
 * therefore never a row delete on its own: the row goes away only once the
 * OTHER half is empty too, which is what this returns.
 */
async function clearAnnotationHalf(
  repertoireId: string,
  positionKey: string,
  half: 'text' | 'shapes'
): Promise<void> {
  const where = annotationRow(repertoireId, positionKey);

  const [row] = await db
    .update(repertoireAnnotations)
    .set(
      half === 'text'
        ? { text: '', updatedAt: new Date() }
        : { shapes: EMPTY_BOARD_ANNOTATIONS, updatedAt: new Date() }
    )
    .where(where)
    .returning({ text: repertoireAnnotations.text, shapes: repertoireAnnotations.shapes });

  // No row (nothing was ever annotated here) is a no-op, not an error: both
  // callers are "make this half empty", and it already is.
  if (!row) return;
  if (row.text === '' && isEmptyBoardAnnotations(row.shapes)) {
    await db.delete(repertoireAnnotations).where(where);
  }
}

/**
 * Write one half of a position's annotation, creating the row when this is the
 * first thing said about the position. The untouched half keeps its value (on
 * insert, its column default: an empty note / no markup).
 */
async function upsertAnnotationHalf(
  repertoireId: string,
  positionKey: string,
  value: { text: string } | { shapes: BoardAnnotations }
) {
  return db
    .insert(repertoireAnnotations)
    .values({ repertoireId, positionKey, ...value })
    .onConflictDoUpdate({
      target: [repertoireAnnotations.repertoireId, repertoireAnnotations.positionKey],
      set: { ...value, updatedAt: new Date() },
    })
    .returning({ text: repertoireAnnotations.text, updatedAt: repertoireAnnotations.updatedAt });
}

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

  const [row] = await upsertAnnotationHalf(params.repertoireId, params.positionKey, { text });

  return { ok: true, text: row.text, updatedAt: row.updatedAt };
}

/**
 * Replace the board markup (arrows + circles) drawn over a position. Shapes are
 * a value object, so every save sends the whole set — the drawing surface calls
 * this on each stroke, debounced.
 *
 * Erasing the last mark does NOT drop the owner's note; see
 * {@link clearAnnotationHalf}.
 */
export async function saveAnnotationShapes(params: {
  repertoireId: string;
  viewerId: string;
  positionKey: string;
  shapes: BoardAnnotations;
}): Promise<SaveShapesResult> {
  const ownerError = await assertRepertoireOwner(params.repertoireId, params.viewerId);
  if (ownerError) return { ok: false, error: ownerError };

  if (isEmptyBoardAnnotations(params.shapes)) {
    await clearAnnotationHalf(params.repertoireId, params.positionKey, 'shapes');
  } else {
    await upsertAnnotationHalf(params.repertoireId, params.positionKey, { shapes: params.shapes });
  }

  return { ok: true };
}

/**
 * Remove the owner's note for a position. Any shapes drawn over the same
 * position are independent content, so they survive; see
 * {@link clearAnnotationHalf}.
 */
export async function deleteAnnotation(params: {
  repertoireId: string;
  viewerId: string;
  positionKey: string;
}): Promise<DeleteAnnotationResult> {
  const ownerError = await assertRepertoireOwner(params.repertoireId, params.viewerId);
  if (ownerError) return { ok: false, error: ownerError };

  await clearAnnotationHalf(params.repertoireId, params.positionKey, 'text');

  return { ok: true };
}
