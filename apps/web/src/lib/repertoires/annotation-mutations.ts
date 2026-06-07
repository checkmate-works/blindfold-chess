import { and, eq } from 'drizzle-orm';

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

/** Remove the owner's note for a position. */
export async function deleteAnnotation(params: {
  repertoireId: string;
  viewerId: string;
  positionKey: string;
}): Promise<DeleteAnnotationResult> {
  const ownerError = await assertRepertoireOwner(params.repertoireId, params.viewerId);
  if (ownerError) return { ok: false, error: ownerError };

  await db
    .delete(repertoireAnnotations)
    .where(
      and(
        eq(repertoireAnnotations.repertoireId, params.repertoireId),
        eq(repertoireAnnotations.positionKey, params.positionKey)
      )
    );

  return { ok: true };
}
