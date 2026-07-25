import { unstable_cache } from 'next/cache';

import { eq, sql } from 'drizzle-orm';

import { parseBoardAnnotations } from '@/lib/board-annotations/parse';
import type { BoardAnnotations } from '@/lib/board-annotations/types';
import { EMPTY_BOARD_ANNOTATIONS } from '@/lib/board-annotations/types';
import {
  db,
  glossaryTermAliases,
  glossaryTermPositions,
  glossaryTermTranslations,
  glossaryTerms,
} from '@/lib/db';

import type { ChessTerm, GlossaryCategory } from './types';

export type TermWithAliasRow = {
  termId: string;
  slug: string;
  termEn: string;
  category: string;
  translatedTerm: string | null;
  definition: string | null;
  reading: string | null;
  alias: string | null;
};

export type TermWithPositionRow = {
  termId: string;
  slug: string;
  termEn: string;
  category: string;
  translatedTerm: string | null;
  definition: string | null;
  reading: string | null;
  positionFen: string | null;
  positionSortOrder: number | null;
  positionCaption: string | null;
  /**
   * Raw JSONB payload from `glossary_term_positions.annotations`, narrowed
   * to `unknown` because the type can only be trusted after passing through
   * {@link parseBoardAnnotations}. `null` when there is no joined position
   * row for the term (left-join miss). Optional in the type so existing
   * fixtures don't need updating row-by-row.
   */
  positionAnnotations?: unknown;
};

const termBaseFields = {
  termId: glossaryTerms.id,
  slug: glossaryTerms.slug,
  termEn: glossaryTerms.termEn,
  category: glossaryTerms.category,
  translatedTerm: glossaryTermTranslations.term,
  definition: glossaryTermTranslations.definition,
  reading: glossaryTermTranslations.reading,
};

function buildAliasQuery(locale: string) {
  return db
    .select({
      ...termBaseFields,
      alias: glossaryTermAliases.alias,
    })
    .from(glossaryTerms)
    .leftJoin(
      glossaryTermTranslations,
      sql`${glossaryTermTranslations.termId} = ${glossaryTerms.id} AND ${glossaryTermTranslations.locale} = ${locale}`
    )
    .leftJoin(glossaryTermAliases, eq(glossaryTermAliases.termId, glossaryTerms.id));
}

function buildPositionQuery(locale: string) {
  return db
    .select({
      ...termBaseFields,
      positionFen: glossaryTermPositions.fen,
      positionSortOrder: glossaryTermPositions.sortOrder,
      positionCaption: glossaryTermPositions.caption,
      positionAnnotations: glossaryTermPositions.annotations,
    })
    .from(glossaryTerms)
    .leftJoin(
      glossaryTermTranslations,
      sql`${glossaryTermTranslations.termId} = ${glossaryTerms.id} AND ${glossaryTermTranslations.locale} = ${locale}`
    )
    .leftJoin(glossaryTermPositions, eq(glossaryTermPositions.termId, glossaryTerms.id));
}

/**
 * Merges alias rows and position rows into ChessTerm[] by grouping on termId.
 * Deduplicates aliases (by value) and positions (by fen).
 * Preserves insertion order from the alias rows (which share the same orderBy).
 */
export function mergeTermRows(
  aliasRows: TermWithAliasRow[],
  positionRows: TermWithPositionRow[]
): ChessTerm[] {
  const termMap = new Map<
    string,
    {
      slug: string;
      termEn: string;
      category: string;
      translatedTerm: string | null;
      definition: string | null;
      reading: string | null;
      aliases: Set<string>;
      positions: Map<
        string,
        { fen: string; sortOrder: number; caption?: string; annotations: BoardAnnotations }
      >;
    }
  >();

  for (const row of aliasRows) {
    let entry = termMap.get(row.termId);
    if (!entry) {
      entry = {
        slug: row.slug,
        termEn: row.termEn,
        category: row.category,
        translatedTerm: row.translatedTerm,
        definition: row.definition,
        reading: row.reading,
        aliases: new Set(),
        positions: new Map(),
      };
      termMap.set(row.termId, entry);
    }

    if (row.alias !== null) {
      entry.aliases.add(row.alias);
    }
  }

  for (const row of positionRows) {
    let entry = termMap.get(row.termId);
    if (!entry) {
      entry = {
        slug: row.slug,
        termEn: row.termEn,
        category: row.category,
        translatedTerm: row.translatedTerm,
        definition: row.definition,
        reading: row.reading,
        aliases: new Set(),
        positions: new Map(),
      };
      termMap.set(row.termId, entry);
    }

    if (row.positionFen !== null && !entry.positions.has(row.positionFen)) {
      entry.positions.set(row.positionFen, {
        fen: row.positionFen,
        sortOrder: row.positionSortOrder ?? 0,
        caption: row.positionCaption ?? undefined,
        annotations:
          row.positionAnnotations === undefined
            ? EMPTY_BOARD_ANNOTATIONS
            : parseBoardAnnotations(row.positionAnnotations),
      });
    }
  }

  const results: ChessTerm[] = [];
  for (const entry of termMap.values()) {
    const definition = entry.definition ?? entry.termEn;
    const aliases = [...entry.aliases];
    const positions = [...entry.positions.values()].sort((a, b) => a.sortOrder - b.sortOrder);

    results.push({
      slug: entry.slug,
      term: entry.termEn,
      termJa: entry.translatedTerm ?? undefined,
      reading: entry.reading ?? undefined,
      definition,
      definitionEn: definition,
      aliases: aliases.length > 0 ? aliases : undefined,
      positions: positions.length > 0 ? positions : undefined,
      category: entry.category as GlossaryCategory,
    });
  }

  return results;
}

export const getGlossaryTerms = unstable_cache(
  async (locale: string): Promise<ChessTerm[]> => {
    const [aliasRows, positionRows] = await Promise.all([
      buildAliasQuery(locale).orderBy(glossaryTerms.termEn),
      buildPositionQuery(locale).orderBy(glossaryTerms.termEn),
    ]);

    return mergeTermRows(aliasRows, positionRows);
  },
  ['glossary-terms'],
  { tags: ['glossary'], revalidate: 3600 }
);

/**
 * Fetch a single term by its slug, or `null` if no such term exists.
 *
 * Backs the `/glossary/[slug]` single-term page and the guide term-link
 * modal preview. Shares the same alias/position join + merge path as
 * {@link getGlossaryTerms}, so the returned `ChessTerm` is shape-identical.
 */
export const getGlossaryTermBySlug = unstable_cache(
  async (slug: string, locale: string): Promise<ChessTerm | null> => {
    const whereClause = eq(glossaryTerms.slug, slug);

    const [aliasRows, positionRows] = await Promise.all([
      buildAliasQuery(locale).where(whereClause),
      buildPositionQuery(locale).where(whereClause),
    ]);

    const [term] = mergeTermRows(aliasRows, positionRows);
    return term ?? null;
  },
  ['glossary-term-by-slug'],
  { tags: ['glossary'], revalidate: 3600 }
);

export const getTermsByLetter = unstable_cache(
  async (letter: string, locale: string): Promise<ChessTerm[]> => {
    const upperLetter = letter.toUpperCase();
    const whereClause = sql`upper(left(${glossaryTerms.termEn}, 1)) = ${upperLetter}`;

    const [aliasRows, positionRows] = await Promise.all([
      buildAliasQuery(locale).where(whereClause).orderBy(glossaryTerms.termEn),
      buildPositionQuery(locale).where(whereClause).orderBy(glossaryTerms.termEn),
    ]);

    return mergeTermRows(aliasRows, positionRows);
  },
  ['glossary-terms-by-letter'],
  { tags: ['glossary'], revalidate: 3600 }
);

export const getTermsByCategory = unstable_cache(
  async (category: string, locale: string): Promise<ChessTerm[]> => {
    const [aliasRows, positionRows] = await Promise.all([
      buildAliasQuery(locale)
        .where(eq(glossaryTerms.category, category))
        .orderBy(glossaryTerms.termEn),
      buildPositionQuery(locale)
        .where(eq(glossaryTerms.category, category))
        .orderBy(glossaryTerms.termEn),
    ]);

    return mergeTermRows(aliasRows, positionRows);
  },
  ['glossary-terms-by-category'],
  { tags: ['glossary'], revalidate: 3600 }
);

export const getUniqueLetters = unstable_cache(
  async (): Promise<string[]> => {
    const rows = await db
      .selectDistinct({
        letter: sql<string>`upper(left(${glossaryTerms.termEn}, 1))`,
      })
      .from(glossaryTerms)
      .orderBy(sql`upper(left(${glossaryTerms.termEn}, 1))`);

    return rows.map((r) => r.letter);
  },
  ['glossary-unique-letters'],
  { tags: ['glossary'], revalidate: 3600 }
);

export const getLetterCounts = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const rows = await db
      .select({
        letter: sql<string>`upper(left(${glossaryTerms.termEn}, 1))`,
        count: sql<number>`count(*)::int`,
      })
      .from(glossaryTerms)
      .groupBy(sql`upper(left(${glossaryTerms.termEn}, 1))`);

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.letter] = row.count;
    }
    return counts;
  },
  ['glossary-letter-counts'],
  { tags: ['glossary'], revalidate: 3600 }
);

export const getCategoryCounts = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const rows = await db
      .select({
        category: glossaryTerms.category,
        count: sql<number>`count(*)::int`,
      })
      .from(glossaryTerms)
      .groupBy(glossaryTerms.category);

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.category] = row.count;
    }
    return counts;
  },
  ['glossary-category-counts'],
  { tags: ['glossary'], revalidate: 3600 }
);
