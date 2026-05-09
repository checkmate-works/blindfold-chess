import { cache } from 'react';

import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

import {
  chunks,
  db,
  glossaryTermPositions,
  glossaryTermTranslations,
  glossaryTerms,
  positionChunks,
  positionThemes,
} from '@/lib/db';

import type { Locale } from '@/app/[locale]/_lib/types';

export type ThemeOption = {
  id: string;
  slug: string;
  label: string;
  category: string;
  /**
   * First example FEN attached to this glossary term (lowest
   * `sort_order` row in `glossary_term_positions`). `null` for terms
   * with no example positions seeded — most theme-eligible terms are
   * abstract concepts (pin, prophylaxis, …) that don't have a single
   * canonical board.
   */
  previewFen: string | null;
};

export type ChunkOption = {
  id: string;
  slug: string;
  label: string;
  representativeFen: string;
};

/**
 * Build a `term_id → first FEN` map for a list of term IDs. Picks the
 * lowest `sort_order` row per term — this matches how the public
 * glossary page surfaces a term's "primary" example. Returns an empty
 * map when the input is empty (avoids an `IN ()` query).
 */
async function loadFirstThemePositions(termIds: string[]): Promise<Map<string, string>> {
  if (termIds.length === 0) return new Map();
  const rows = await db
    .select({
      termId: glossaryTermPositions.termId,
      fen: glossaryTermPositions.fen,
    })
    .from(glossaryTermPositions)
    .where(inArray(glossaryTermPositions.termId, termIds))
    .orderBy(asc(glossaryTermPositions.termId), asc(glossaryTermPositions.sortOrder));
  const map = new Map<string, string>();
  for (const row of rows) {
    if (!map.has(row.termId)) map.set(row.termId, row.fen);
  }
  return map;
}

export type PuzzleTagBundle = {
  themes: ThemeOption[];
  chunks: ChunkOption[];
};

/**
 * Load themes + chunks currently attached to a puzzle position, with
 * theme labels resolved to the requested locale (falling back to the
 * canonical English term when no translation row exists for the locale).
 */
export const loadPuzzleTags = cache(
  async (positionId: string, locale: Locale): Promise<PuzzleTagBundle> => {
    const themeRows = await db
      .select({
        id: glossaryTerms.id,
        slug: glossaryTerms.slug,
        termEn: glossaryTerms.termEn,
        category: glossaryTerms.category,
        term: glossaryTermTranslations.term,
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

    const chunkRows = await db
      .select({
        id: chunks.id,
        slug: chunks.slug,
        title: chunks.title,
        representativeFen: chunks.representativeFen,
      })
      .from(positionChunks)
      .innerJoin(chunks, eq(chunks.id, positionChunks.chunkId))
      .where(and(eq(positionChunks.positionId, positionId), isNull(chunks.deletedAt)))
      .orderBy(asc(chunks.title));

    const previewByTerm = await loadFirstThemePositions(themeRows.map((r) => r.id));

    return {
      themes: themeRows.map((r) => ({
        id: r.id,
        slug: r.slug,
        label: r.term ?? r.termEn,
        category: r.category,
        previewFen: previewByTerm.get(r.id) ?? null,
      })),
      chunks: chunkRows.map((r) => ({
        id: r.id,
        slug: r.slug,
        label: r.title,
        representativeFen: r.representativeFen,
      })),
    };
  }
);

/**
 * Load the full set of theme-eligible glossary terms and non-deleted
 * chunks for the picker. Themes are bounded master data (currently a
 * few dozen rows); chunks are UGC and may need server-side search if
 * the catalog grows large — when that happens, swap this for a
 * debounced search action without changing the picker contract.
 */
export const loadAvailableTags = cache(async (locale: Locale): Promise<PuzzleTagBundle> => {
  const themeRows = await db
    .select({
      id: glossaryTerms.id,
      slug: glossaryTerms.slug,
      termEn: glossaryTerms.termEn,
      category: glossaryTerms.category,
      term: glossaryTermTranslations.term,
    })
    .from(glossaryTerms)
    .leftJoin(
      glossaryTermTranslations,
      and(
        eq(glossaryTermTranslations.termId, glossaryTerms.id),
        eq(glossaryTermTranslations.locale, locale)
      )
    )
    .where(eq(glossaryTerms.isTheme, true))
    .orderBy(asc(glossaryTerms.termEn));

  const chunkRows = await db
    .select({
      id: chunks.id,
      slug: chunks.slug,
      title: chunks.title,
      representativeFen: chunks.representativeFen,
    })
    .from(chunks)
    .where(isNull(chunks.deletedAt))
    .orderBy(asc(chunks.title));

  const previewByTerm = await loadFirstThemePositions(themeRows.map((r) => r.id));

  return {
    themes: themeRows.map((r) => ({
      id: r.id,
      slug: r.slug,
      label: r.term ?? r.termEn,
      category: r.category,
      previewFen: previewByTerm.get(r.id) ?? null,
    })),
    chunks: chunkRows.map((r) => ({
      id: r.id,
      slug: r.slug,
      label: r.title,
      representativeFen: r.representativeFen,
    })),
  };
});
