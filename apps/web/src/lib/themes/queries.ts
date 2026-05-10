import { cache } from 'react';

import { and, asc, eq, inArray } from 'drizzle-orm';

import {
  db,
  glossaryTermPositions,
  glossaryTermTranslations,
  glossaryTerms,
  positionThemes,
} from '@/lib/db';

import type { Locale } from '@/app/[locale]/_lib/types';

export type LinkedThemeSummary = {
  id: string;
  slug: string;
  label: string;
  definition: string | null;
  category: string;
  /**
   * First example FEN (lowest `sort_order`) attached to the term in
   * `glossary_term_positions`. `null` for abstract concepts that have
   * no canonical board.
   */
  previewFen: string | null;
};

/**
 * Fetch glossary terms tagged on a position via `position_themes`,
 * with labels and definitions resolved to the requested locale (falls
 * back to `term_en` / `null` when no row exists for that locale). Used
 * on position detail pages alongside `getLinkedChunksForPosition` to
 * render the combined "useful patterns" section.
 *
 * Two queries (terms + first FEN per term) joined in JS rather than a
 * single SQL with a correlated subquery — keeps Drizzle code readable
 * and lets `React.cache()` dedupe per request.
 */
export const getLinkedThemesForPosition = cache(
  async (positionId: string, locale: Locale): Promise<LinkedThemeSummary[]> => {
    const themeRows = await db
      .select({
        id: glossaryTerms.id,
        slug: glossaryTerms.slug,
        termEn: glossaryTerms.termEn,
        category: glossaryTerms.category,
        term: glossaryTermTranslations.term,
        definition: glossaryTermTranslations.definition,
      })
      .from(positionThemes)
      .innerJoin(glossaryTerms, eq(glossaryTerms.id, positionThemes.termId))
      .leftJoin(
        glossaryTermTranslations,
        and(
          eq(glossaryTermTranslations.termId, glossaryTerms.id),
          eq(glossaryTermTranslations.locale, locale)
        )
      )
      .where(eq(positionThemes.positionId, positionId))
      .orderBy(asc(glossaryTerms.termEn));

    if (themeRows.length === 0) return [];

    const positionRows = await db
      .select({
        termId: glossaryTermPositions.termId,
        fen: glossaryTermPositions.fen,
      })
      .from(glossaryTermPositions)
      .where(
        inArray(
          glossaryTermPositions.termId,
          themeRows.map((r) => r.id)
        )
      )
      .orderBy(asc(glossaryTermPositions.termId), asc(glossaryTermPositions.sortOrder));

    const previewByTerm = new Map<string, string>();
    for (const row of positionRows) {
      if (!previewByTerm.has(row.termId)) previewByTerm.set(row.termId, row.fen);
    }

    return themeRows.map((r) => ({
      id: r.id,
      slug: r.slug,
      label: r.term ?? r.termEn,
      definition: r.definition ?? null,
      category: r.category,
      previewFen: previewByTerm.get(r.id) ?? null,
    }));
  }
);

// `buildGlossaryUrlForSlug` is intentionally NOT re-exported here.
// This module imports from `@/lib/db`, which evaluates the
// `postgres` driver at import time — re-exporting the URL helper
// would tempt client components to import it from this path and
// drag the driver into the browser bundle. The helper lives in
// `./url` (server- and client-safe). Import it from there.
