import { cache } from 'react';

import { and, asc, eq, isNull } from 'drizzle-orm';

import { chunks, db, positionChunks } from '@/lib/db';
import { getAllAvailableThemes, getLinkedThemesForPosition } from '@/lib/themes/queries';
import type { ThemeOption } from '@/lib/themes/types';

import type { Locale } from '@/app/[locale]/_lib/types';

// Re-export theme types so existing consumers in this feature
// directory keep their import paths stable.
export type { ThemeOption, ThemePosition } from '@/lib/themes/types';

export type ChunkOption = {
  id: string;
  slug: string;
  label: string;
  representativeFen: string;
  description: string | null;
};

export type PuzzleTagBundle = {
  themes: ThemeOption[];
  chunks: ChunkOption[];
};

const chunkSelectColumns = {
  id: chunks.id,
  slug: chunks.slug,
  title: chunks.title,
  representativeFen: chunks.representativeFen,
  description: chunks.description,
} as const;

type ChunkRow = {
  id: string;
  slug: string;
  title: string;
  representativeFen: string;
  description: string | null;
};

function mapChunkRow(row: ChunkRow): ChunkOption {
  return {
    id: row.id,
    slug: row.slug,
    label: row.title,
    representativeFen: row.representativeFen,
    description: row.description ?? null,
  };
}

/**
 * Bundle of themes + chunks attached to a puzzle. Themes share the
 * same query module used by the read-side detail page; the chunk
 * query is local to this loader because the editor needs the
 * `label`-renamed view (read-side callers consume the raw `title`).
 */
export const loadPuzzleTags = cache(
  async (positionId: string, locale: Locale): Promise<PuzzleTagBundle> => {
    const [themes, chunkRows] = await Promise.all([
      getLinkedThemesForPosition(positionId, locale),
      db
        .select(chunkSelectColumns)
        .from(positionChunks)
        .innerJoin(chunks, eq(chunks.id, positionChunks.chunkId))
        .where(and(eq(positionChunks.positionId, positionId), isNull(chunks.deletedAt)))
        .orderBy(asc(chunks.title)),
    ]);
    return { themes, chunks: chunkRows.map(mapChunkRow) };
  }
);

/**
 * Catalog of every theme-eligible glossary term and every non-deleted
 * chunk, for the picker. Both axes are bounded master data today; if
 * the chunk side grows large, swap the chunk query for a debounced
 * server-side search without changing the picker contract.
 */
export const loadAvailableTags = cache(async (locale: Locale): Promise<PuzzleTagBundle> => {
  const [themes, chunkRows] = await Promise.all([
    getAllAvailableThemes(locale),
    db
      .select(chunkSelectColumns)
      .from(chunks)
      .where(isNull(chunks.deletedAt))
      .orderBy(asc(chunks.title)),
  ]);
  return { themes, chunks: chunkRows.map(mapChunkRow) };
});
