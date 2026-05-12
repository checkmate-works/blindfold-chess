import { cache } from 'react';

import { and, asc, eq, ilike, isNull, notInArray } from 'drizzle-orm';

import { parseBoardAnnotations } from '@/lib/board-annotations/parse';
import type { BoardAnnotations } from '@/lib/board-annotations/types';
import { chunks, db, glossaryTermPositions, glossaryTerms } from '@/lib/db';

export type AdminGlossaryTerm = {
  id: string;
  slug: string;
  termEn: string;
  category: string;
  isTheme: boolean;
  positions: Array<{
    id: string;
    fen: string;
    sortOrder: number;
    caption: string | null;
    annotations: BoardAnnotations;
  }>;
};

/**
 * Fetch a single glossary term by slug, together with every example
 * position (and its parsed annotations) attached via
 * `glossary_term_positions`.
 *
 * Locale resolution is intentionally skipped: the admin editor only
 * shows the canonical `term_en` since translations are managed in
 * code/seed (not in the admin UI) and i18n-aware copy would only make
 * the admin screen more confusing about which version a save persists.
 */
export const getGlossaryTermForAdmin = cache(
  async (slug: string): Promise<AdminGlossaryTerm | null> => {
    const [term] = await db
      .select({
        id: glossaryTerms.id,
        slug: glossaryTerms.slug,
        termEn: glossaryTerms.termEn,
        category: glossaryTerms.category,
        isTheme: glossaryTerms.isTheme,
      })
      .from(glossaryTerms)
      .where(eq(glossaryTerms.slug, slug))
      .limit(1);

    if (!term) return null;

    const positionRows = await db
      .select({
        id: glossaryTermPositions.id,
        fen: glossaryTermPositions.fen,
        sortOrder: glossaryTermPositions.sortOrder,
        caption: glossaryTermPositions.caption,
        annotations: glossaryTermPositions.annotations,
      })
      .from(glossaryTermPositions)
      .where(eq(glossaryTermPositions.termId, term.id))
      .orderBy(asc(glossaryTermPositions.sortOrder), asc(glossaryTermPositions.fen));

    return {
      ...term,
      positions: positionRows.map((row) => ({
        id: row.id,
        fen: row.fen,
        sortOrder: row.sortOrder ?? 0,
        caption: row.caption,
        annotations: parseBoardAnnotations(row.annotations),
      })),
    };
  }
);

/**
 * List every glossary term for the admin index page. Includes terms
 * with no positions and terms with `is_theme=false` — admins need the
 * full set to decide what to curate.
 */
export const listGlossaryTermsForAdmin = cache(
  async (): Promise<
    Array<{ id: string; slug: string; termEn: string; category: string; isTheme: boolean }>
  > => {
    return db
      .select({
        id: glossaryTerms.id,
        slug: glossaryTerms.slug,
        termEn: glossaryTerms.termEn,
        category: glossaryTerms.category,
        isTheme: glossaryTerms.isTheme,
      })
      .from(glossaryTerms)
      .orderBy(asc(glossaryTerms.termEn));
  }
);

export type ChunkSearchResult = {
  id: string;
  slug: string;
  title: string;
  representativeFen: string;
};

/**
 * Title-prefix search across non-deleted chunks, excluding any chunk
 * already linked to the term. Used by the admin `ChunkLinker` to fill
 * the candidate list.
 */
export async function searchChunksForLinker(
  query: string,
  excludeIds: string[]
): Promise<ChunkSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const conditions = [isNull(chunks.deletedAt), ilike(chunks.title, `%${trimmed}%`)];
  if (excludeIds.length > 0) {
    conditions.push(notInArray(chunks.id, excludeIds));
  }

  return db
    .select({
      id: chunks.id,
      slug: chunks.slug,
      title: chunks.title,
      representativeFen: chunks.representativeFen,
    })
    .from(chunks)
    .where(and(...conditions))
    .limit(20);
}
