'use server';

// eslint-disable-next-line no-restricted-imports -- TermPositionEditor has no router.refresh(), so this is what re-renders the admin editor; the public term page is prerendered, which no tag alone can drop
import { revalidatePath, revalidateTag } from 'next/cache';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { SUPPORTED_LOCALES } from '@/config';
import { and, eq } from 'drizzle-orm';

import { parseBoardAnnotations } from '@/lib/board-annotations/parse';
import { GLOSSARY_CACHE_TAG } from '@/lib/cache-tags';
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

  // The public term page renders these annotations too, and it is prerendered
  // for every locale. Two invalidations are needed because they reach
  // different caches: the tag expires the `getPositionsForTerm` Data Cache
  // entry, and the path calls drop the Full Route Cache entries built from it.
  // Without this pair an admin edit stayed invisible on `/[locale]/glossary/
  // [slug]` until that page's ISR interval elapsed — survivable while the
  // interval was an hour, a week once it follows the layout default.
  revalidateTag(GLOSSARY_CACHE_TAG, { expire: 0 });
  for (const locale of SUPPORTED_LOCALES) {
    revalidatePath(`/${locale}/glossary/${termSlug}`);
  }

  return { success: true };
}
