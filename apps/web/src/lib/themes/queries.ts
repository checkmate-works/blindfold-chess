import { cache } from 'react';

import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

import { parseBoardAnnotations } from '@/lib/board-annotations/parse';
import {
  chunkThemes,
  chunks,
  db,
  glossaryTermPositions,
  glossaryTermTranslations,
  glossaryTerms,
  positionThemes,
} from '@/lib/db';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { ThemeOption, ThemePosition } from './types';

// Shared select column list. Both the per-position and the global
// "available themes" loader pull the same columns; centralizing here
// keeps them in lock-step.
const themeSelectColumns = {
  id: glossaryTerms.id,
  slug: glossaryTerms.slug,
  termEn: glossaryTerms.termEn,
  category: glossaryTerms.category,
  term: glossaryTermTranslations.term,
  definition: glossaryTermTranslations.definition,
  reading: glossaryTermTranslations.reading,
} as const;

type ThemeRow = {
  id: string;
  slug: string;
  termEn: string;
  category: string;
  term: string | null;
  definition: string | null;
  reading: string | null;
};

function mapThemeRow(row: ThemeRow, positions: ThemePosition[]): ThemeOption {
  return {
    id: row.id,
    slug: row.slug,
    label: row.term ?? row.termEn,
    category: row.category,
    previewFen: positions[0]?.fen ?? null,
    definition: row.definition ?? null,
    reading: row.reading ?? null,
    positions,
  };
}

/**
 * Build a `term_id → ThemePosition[]` map for a list of term IDs.
 * Each list is sorted by `sort_order` so callers can take `[0]` as
 * the primary example or render the full carousel. Returns an empty
 * map when the input is empty (avoids an `IN ()` SQL).
 */
async function loadThemePositions(termIds: string[]): Promise<Map<string, ThemePosition[]>> {
  if (termIds.length === 0) return new Map();
  const rows = await db
    .select({
      termId: glossaryTermPositions.termId,
      fen: glossaryTermPositions.fen,
      sortOrder: glossaryTermPositions.sortOrder,
      caption: glossaryTermPositions.caption,
      annotations: glossaryTermPositions.annotations,
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
      annotations: parseBoardAnnotations(row.annotations),
    };
    if (list) list.push(entry);
    else map.set(row.termId, [entry]);
  }
  return map;
}

async function hydrateThemes(themeRows: ThemeRow[]): Promise<ThemeOption[]> {
  const positionsByTerm = await loadThemePositions(themeRows.map((r) => r.id));
  return themeRows.map((r) => mapThemeRow(r, positionsByTerm.get(r.id) ?? []));
}

/**
 * Fetch glossary terms tagged on a position via `position_themes`,
 * with labels and definitions resolved to the requested locale (falls
 * back to `term_en` / `null` when no row exists for that locale). Used
 * both on position detail pages (alongside `getLinkedChunksForPosition`
 * for the combined "useful patterns" section) and as the per-position
 * leg of the puzzle editor's tag bundle.
 */
export const getLinkedThemesForPosition = cache(
  async (positionId: string, locale: Locale): Promise<ThemeOption[]> => {
    const themeRows = await db
      .select(themeSelectColumns)
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

    return hydrateThemes(themeRows);
  }
);

/**
 * Fetch glossary terms tagged on a chunk via `chunk_themes`. Mirrors
 * {@link getLinkedThemesForPosition} but anchored on a chunk row. Used
 * on chunk detail pages and inside the admin chunk editor.
 */
export const getLinkedThemesForChunk = cache(
  async (chunkId: string, locale: Locale): Promise<ThemeOption[]> => {
    const themeRows = await db
      .select(themeSelectColumns)
      .from(chunkThemes)
      .innerJoin(glossaryTerms, eq(glossaryTerms.id, chunkThemes.termId))
      .leftJoin(
        glossaryTermTranslations,
        and(
          eq(glossaryTermTranslations.termId, glossaryTerms.id),
          eq(glossaryTermTranslations.locale, locale)
        )
      )
      .where(eq(chunkThemes.chunkId, chunkId))
      .orderBy(asc(glossaryTerms.termEn));

    return hydrateThemes(themeRows);
  }
);

/**
 * Fetch chunks tagged with a glossary term via `chunk_themes`. Only
 * non-deleted chunks are returned; the link itself is preserved across
 * a chunk's soft-delete so an undelete restores the relationship, but
 * public reads filter the chunk out at this query layer.
 *
 * Used on the public `/glossary/[slug]` term page and inside the admin
 * term editor.
 */
export const getLinkedChunksForTerm = cache(
  async (
    termId: string
  ): Promise<
    Array<{
      id: string;
      slug: string;
      title: string;
      representativeFen: string;
      description: string | null;
    }>
  > => {
    return db
      .select({
        id: chunks.id,
        slug: chunks.slug,
        title: chunks.title,
        representativeFen: chunks.representativeFen,
        description: chunks.description,
      })
      .from(chunkThemes)
      .innerJoin(chunks, eq(chunks.id, chunkThemes.chunkId))
      .where(and(eq(chunkThemes.termId, termId), isNull(chunks.deletedAt)))
      .orderBy(asc(chunks.title));
  }
);

/**
 * Load every theme-eligible glossary term for the picker catalog.
 * Themes are bounded master data (a few dozen rows); no pagination
 * is needed today. If the catalog grows large, swap for a search
 * action without changing the return type.
 */
export const getAllAvailableThemes = cache(async (locale: Locale): Promise<ThemeOption[]> => {
  const themeRows = await db
    .select(themeSelectColumns)
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

  return hydrateThemes(themeRows);
});

// `buildGlossaryUrlForSlug` is intentionally NOT re-exported here.
// This module imports from `@/lib/db`, which evaluates the
// `postgres` driver at import time — re-exporting the URL helper
// would tempt client components to import it from this path and
// drag the driver into the browser bundle. The helper lives in
// `./url` (server- and client-safe). Import it from there.
