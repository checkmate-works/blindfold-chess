import { cache } from 'react';

import { and, asc, eq, isNull } from 'drizzle-orm';

import {
  chunks,
  db,
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
};

export type ChunkOption = {
  id: string;
  slug: string;
  label: string;
};

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
      })
      .from(positionChunks)
      .innerJoin(chunks, eq(chunks.id, positionChunks.chunkId))
      .where(and(eq(positionChunks.positionId, positionId), isNull(chunks.deletedAt)))
      .orderBy(asc(chunks.title));

    return {
      themes: themeRows.map((r) => ({
        id: r.id,
        slug: r.slug,
        label: r.term ?? r.termEn,
        category: r.category,
      })),
      chunks: chunkRows.map((r) => ({
        id: r.id,
        slug: r.slug,
        label: r.title,
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
    })
    .from(chunks)
    .where(isNull(chunks.deletedAt))
    .orderBy(asc(chunks.title));

  return {
    themes: themeRows.map((r) => ({
      id: r.id,
      slug: r.slug,
      label: r.term ?? r.termEn,
      category: r.category,
    })),
    chunks: chunkRows.map((r) => ({
      id: r.id,
      slug: r.slug,
      label: r.title,
    })),
  };
});
