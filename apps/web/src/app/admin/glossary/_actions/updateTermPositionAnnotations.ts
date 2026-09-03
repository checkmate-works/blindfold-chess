'use server';

// eslint-disable-next-line no-restricted-imports -- TermPositionEditor has no router.refresh(); this revalidate is what re-renders the admin editor with the saved annotations
import { revalidatePath, revalidateTag } from 'next/cache';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { and, eq } from 'drizzle-orm';

import { parseBoardAnnotations } from '@/lib/board-annotations/parse';
import { glossaryPositionsTag } from '@/lib/cache-tags';
import { db, glossaryTermPositions } from '@/lib/db';
import { isValidUUID } from '@/lib/validations/uuid';

/**
 * Persist the annotation set for a single (term, fen) row.
 *
 * The row is identified by `glossary_term_positions.id` rather than
 * the (term, fen) pair: the seed cleanup deletes orphan positions by
 * (term, fen) but the admin edit operates on a stable row id from the
 * SSR fetch, which is more resistant to mid-edit changes to the FEN
 * coming from a seed re-run.
 *
 * The incoming `annotations` payload is re-parsed through
 * `parseBoardAnnotations` so a malformed client payload cannot corrupt
 * the JSONB — invalid entries are silently dropped and the residue is
 * a well-formed `BoardAnnotations`.
 */
export async function updateTermPositionAnnotations(
  rowId: string,
  termSlug: string,
  annotations: unknown
): Promise<{ success: true } | { error: string }> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth;

  if (!isValidUUID(rowId)) {
    return { error: 'Invalid row id' };
  }

  const parsed = parseBoardAnnotations(annotations);

  const result = await db
    .update(glossaryTermPositions)
    .set({ annotations: parsed })
    .where(and(eq(glossaryTermPositions.id, rowId)))
    .returning({ id: glossaryTermPositions.id });

  if (result.length === 0) {
    return { error: 'Position not found' };
  }

  revalidatePath(`/admin/glossary/${termSlug}`);

  // The public term page renders these annotations too, prerendered in every
  // locale. Its route-cache entries carry the per-term tag `getPositionsForTerm`
  // stamps on them, so expiring that one tag re-renders exactly those pages on
  // their next visit. Without it the edit waited out the page's ISR interval —
  // an hour once, now the layout's week.
  revalidateTag(glossaryPositionsTag(termSlug), { expire: 0 });

  return { success: true };
}
