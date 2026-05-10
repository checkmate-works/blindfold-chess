import { and, eq, inArray, isNull } from 'drizzle-orm';

import { chunks, db, glossaryTerms } from '@/lib/db';

export type TagValidationError = 'invalidTheme' | 'invalidChunk';

export type DedupedTagIds = {
  themeIds: string[] | undefined;
  chunkIds: string[] | undefined;
};

export type TagValidationResult =
  | { ok: true; deduped: DedupedTagIds }
  | { ok: false; error: TagValidationError };

/**
 * Dedupe and re-assert user-supplied theme/chunk IDs against the
 * database. The application connects with service-role-equivalent
 * privileges so the RLS predicates on position_themes / position_chunks
 * (`glossary_terms.is_theme = true`, `chunks.deleted_at IS NULL`) do
 * not fire on writes — this helper re-asserts the same predicates at
 * the app layer for create + update flows. Returns deduped ID arrays
 * preserving `undefined` semantics (caller distinguishes "omitted" from
 * "explicit empty replacement").
 */
export async function validateAndDedupeTagIds(input: {
  themeIds?: string[];
  chunkIds?: string[];
}): Promise<TagValidationResult> {
  const themeIds = input.themeIds ? Array.from(new Set(input.themeIds)) : undefined;
  const chunkIds = input.chunkIds ? Array.from(new Set(input.chunkIds)) : undefined;

  if (themeIds && themeIds.length > 0) {
    const valid = await db
      .select({ id: glossaryTerms.id })
      .from(glossaryTerms)
      .where(and(inArray(glossaryTerms.id, themeIds), eq(glossaryTerms.isTheme, true)));
    if (valid.length !== themeIds.length) {
      return { ok: false, error: 'invalidTheme' };
    }
  }

  if (chunkIds && chunkIds.length > 0) {
    const valid = await db
      .select({ id: chunks.id })
      .from(chunks)
      .where(and(inArray(chunks.id, chunkIds), isNull(chunks.deletedAt)));
    if (valid.length !== chunkIds.length) {
      return { ok: false, error: 'invalidChunk' };
    }
  }

  return { ok: true, deduped: { themeIds, chunkIds } };
}
