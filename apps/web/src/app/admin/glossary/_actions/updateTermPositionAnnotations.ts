'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { and, eq } from 'drizzle-orm';

import { parseBoardAnnotations } from '@/lib/board-annotations/parse';
import { db, glossaryTermPositions } from '@/lib/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

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

  if (!isValidUuid(rowId)) {
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
  return { success: true };
}
