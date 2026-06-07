import { and, eq } from 'drizzle-orm';

import { db, repertoireAnnotations, repertoires } from '@/lib/db';

import { REPERTOIRE_ANNOTATION_MAX } from './validation';

export type AnnotationMutationError = 'unauthorized' | 'notFound' | 'empty' | 'tooLong';

export type UpsertAnnotationResult =
  | { ok: true; text: string; updatedAt: Date }
  | { ok: false; error: AnnotationMutationError };

export type DeleteAnnotationResult =
  | { ok: true }
  | { ok: false; error: 'unauthorized' | 'notFound' };

/**
 * Only the repertoire's owner may write annotations. The app DB connection
 * bypasses RLS, so ownership is enforced here in the app layer (RLS remains the
 * defence-in-depth backstop for any direct Supabase client access). Returns
 * null userId-mismatch / missing as the appropriate error rather than throwing.
 */
async function assertOwner(
  repertoireId: string,
  viewerId: string
): Promise<'unauthorized' | 'notFound' | null> {
  const [row] = await db
    .select({ userId: repertoires.userId })
    .from(repertoires)
    .where(eq(repertoires.id, repertoireId))
    .limit(1);
  if (!row) return 'notFound';
  if (row.userId !== viewerId) return 'unauthorized';
  return null;
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

  const ownerError = await assertOwner(params.repertoireId, params.viewerId);
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
  const ownerError = await assertOwner(params.repertoireId, params.viewerId);
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
