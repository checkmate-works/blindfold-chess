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

export type ThemePosition = {
  fen: string;
  sortOrder: number;
  caption: string | null;
};

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
  /**
   * Locale-resolved definition body. Falls back to the English
   * translation row when no row exists for the requested locale, then
   * to `null` if even that is missing.
   */
  definition: string | null;
  /** Optional pronunciation hint (furigana for Japanese). */
  reading: string | null;
  /** All example positions for the term, ordered by sort_order. */
  positions: ThemePosition[];
};

export type ChunkOption = {
  id: string;
  slug: string;
  label: string;
  representativeFen: string;
  description: string | null;
};

/**
 * Build a `term_id → ThemePosition[]` map for a list of term IDs. Each
 * entry is sorted by `sort_order` so callers can take `[0]` as the
 * primary example or render the full carousel. Returns an empty map
 * when the input is empty (avoids an `IN ()` query).
 */
async function loadThemePositions(termIds: string[]): Promise<Map<string, ThemePosition[]>> {
  if (termIds.length === 0) return new Map();
  const rows = await db
    .select({
      termId: glossaryTermPositions.termId,
      fen: glossaryTermPositions.fen,
      sortOrder: glossaryTermPositions.sortOrder,
      caption: glossaryTermPositions.caption,
    })
    .from(glossaryTermPositions)
    .where(inArray(glossaryTermPositions.termId, termIds))
    .orderBy(asc(glossaryTermPositions.termId), asc(glossaryTermPositions.sortOrder));
  const map = new Map<string, ThemePosition[]>();
  for (const row of rows) {
    const list = map.get(row.termId);
    const entry: ThemePosition = {
      fen: row.fen,
      sortOrder: row.sortOrder ?? 0,
      caption: row.caption ?? null,
    };
    if (list) list.push(entry);
    else map.set(row.termId, [entry]);
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
        definition: glossaryTermTranslations.definition,
        reading: glossaryTermTranslations.reading,
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
        description: chunks.description,
      })
      .from(positionChunks)
      .innerJoin(chunks, eq(chunks.id, positionChunks.chunkId))
      .where(and(eq(positionChunks.positionId, positionId), isNull(chunks.deletedAt)))
      .orderBy(asc(chunks.title));

    const positionsByTerm = await loadThemePositions(themeRows.map((r) => r.id));

    return {
      themes: themeRows.map((r) => {
        const positions = positionsByTerm.get(r.id) ?? [];
        return {
          id: r.id,
          slug: r.slug,
          label: r.term ?? r.termEn,
          category: r.category,
          previewFen: positions[0]?.fen ?? null,
          definition: r.definition ?? null,
          reading: r.reading ?? null,
          positions,
        };
      }),
      chunks: chunkRows.map((r) => ({
        id: r.id,
        slug: r.slug,
        label: r.title,
        representativeFen: r.representativeFen,
        description: r.description ?? null,
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
      definition: glossaryTermTranslations.definition,
      reading: glossaryTermTranslations.reading,
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
      description: chunks.description,
    })
    .from(chunks)
    .where(isNull(chunks.deletedAt))
    .orderBy(asc(chunks.title));

  const positionsByTerm = await loadThemePositions(themeRows.map((r) => r.id));

  return {
    themes: themeRows.map((r) => {
      const positions = positionsByTerm.get(r.id) ?? [];
      return {
        id: r.id,
        slug: r.slug,
        label: r.term ?? r.termEn,
        category: r.category,
        previewFen: positions[0]?.fen ?? null,
        definition: r.definition ?? null,
        reading: r.reading ?? null,
        positions,
      };
    }),
    chunks: chunkRows.map((r) => ({
      id: r.id,
      slug: r.slug,
      label: r.title,
      representativeFen: r.representativeFen,
      description: r.description ?? null,
    })),
  };
});
