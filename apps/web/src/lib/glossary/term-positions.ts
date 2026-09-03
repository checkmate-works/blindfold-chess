import { unstable_cache } from 'next/cache';

import { and, desc, eq, isNull } from 'drizzle-orm';

import { GLOSSARY_CACHE_TAG, glossaryPositionsTag } from '@/lib/cache-tags';
import { db, glossaryTerms, positionThemes, positions } from '@/lib/db';
import { getPositionDetailPath } from '@/lib/positions/routes';
import { parsePositionType } from '@/lib/positions/types';
import type { PositionType } from '@/lib/positions/types';

/**
 * A practice problem (position) linked to a glossary term via the
 * `position_themes` junction, reduced to what a term page needs to render a
 * link card.
 */
export type TermProblem = {
  id: string;
  type: PositionType;
  title: string;
  fen: string;
  /** Locale-relative practice path, e.g. `/practice/position-memory/{id}`. */
  detailPath: string;
};

/**
 * List the practice problems tagged with a glossary term (by slug), newest
 * first. Only terms with `is_theme = true` can carry `position_themes` rows
 * (enforced by RLS), so non-theme terms naturally return `[]`.
 *
 * Soft-deleted positions are excluded, and problems whose type has no detail
 * page (`sequence` → {@link getPositionDetailPath} returns `null`) are dropped,
 * so every returned item is a real, linkable problem.
 *
 * Wrapped per slug rather than once, because the entry carries a per-term
 * tag ({@link glossaryPositionsTag}) and `unstable_cache` takes its tags as a
 * fixed option, not from the arguments.
 */
export const getPositionsForTerm = (slug: string): Promise<TermProblem[]> =>
  unstable_cache(
    async (): Promise<TermProblem[]> => {
      const rows = await db
        .select({
          id: positions.id,
          type: positions.type,
          title: positions.title,
          fen: positions.fen,
        })
        .from(positionThemes)
        .innerJoin(positions, eq(positions.id, positionThemes.positionId))
        .innerJoin(glossaryTerms, eq(glossaryTerms.id, positionThemes.termId))
        .where(and(eq(glossaryTerms.slug, slug), isNull(positions.deletedAt)))
        .orderBy(desc(positions.createdAt));

      const problems: TermProblem[] = [];
      for (const row of rows) {
        const type = parsePositionType(row.type);
        if (!type) continue;
        const detailPath = getPositionDetailPath(type, row.id);
        if (!detailPath) continue;
        problems.push({ id: row.id, type, title: row.title, fen: row.fen, detailPath });
      }
      return problems;
    },
    ['glossary-term-positions', slug],
    { tags: [GLOSSARY_CACHE_TAG, glossaryPositionsTag(slug)], revalidate: 604800 }
  )();
