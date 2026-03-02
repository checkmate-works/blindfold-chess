import { eq, sql } from 'drizzle-orm';

import {
  db,
  glossaryTermAliases,
  glossaryTermPositions,
  glossaryTermTranslations,
  glossaryTerms,
} from '@/lib/db';

import type { ChessTerm } from '../../_lib/types';
import type { GlossaryCategory } from './types';

function toChessTerm(
  row: {
    termEn: string;
    category: string;
    translatedTerm: string | null;
    definition: string | null;
    reading: string | null;
  },
  aliases: string[],
  positions: { fen: string; sortOrder: number; caption?: string }[]
): ChessTerm {
  const definition = row.definition ?? row.termEn;
  return {
    term: row.termEn,
    termJa: row.translatedTerm ?? undefined,
    reading: row.reading ?? undefined,
    definition,
    definitionEn: definition,
    aliases: aliases.length > 0 ? aliases : undefined,
    positions: positions.length > 0 ? positions : undefined,
    category: row.category as GlossaryCategory,
  };
}

async function fetchAliasesMap(termIds: string[]): Promise<Map<string, string[]>> {
  const aliasRows =
    termIds.length > 0
      ? await db
          .select({
            termId: glossaryTermAliases.termId,
            alias: glossaryTermAliases.alias,
          })
          .from(glossaryTermAliases)
          .where(sql`${glossaryTermAliases.termId} IN ${termIds}`)
      : [];

  const aliasMap = new Map<string, string[]>();
  for (const row of aliasRows) {
    const existing = aliasMap.get(row.termId) || [];
    existing.push(row.alias);
    aliasMap.set(row.termId, existing);
  }

  return aliasMap;
}

async function fetchPositionsMap(
  termIds: string[]
): Promise<Map<string, { fen: string; sortOrder: number; caption?: string }[]>> {
  const positionRows =
    termIds.length > 0
      ? await db
          .select({
            termId: glossaryTermPositions.termId,
            fen: glossaryTermPositions.fen,
            sortOrder: glossaryTermPositions.sortOrder,
            caption: glossaryTermPositions.caption,
          })
          .from(glossaryTermPositions)
          .where(sql`${glossaryTermPositions.termId} IN ${termIds}`)
      : [];

  const positionMap = new Map<string, { fen: string; sortOrder: number; caption?: string }[]>();
  for (const row of positionRows) {
    const existing = positionMap.get(row.termId) || [];
    existing.push({
      fen: row.fen,
      sortOrder: row.sortOrder ?? 0,
      caption: row.caption ?? undefined,
    });
    positionMap.set(row.termId, existing);
  }

  // Sort positions by sortOrder
  for (const positions of positionMap.values()) {
    positions.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return positionMap;
}

export async function getGlossaryTerms(locale: string): Promise<ChessTerm[]> {
  const rows = await db
    .select({
      termId: glossaryTerms.id,
      termEn: glossaryTerms.termEn,
      category: glossaryTerms.category,
      translatedTerm: glossaryTermTranslations.term,
      definition: glossaryTermTranslations.definition,
      reading: glossaryTermTranslations.reading,
    })
    .from(glossaryTerms)
    .leftJoin(
      glossaryTermTranslations,
      sql`${glossaryTermTranslations.termId} = ${glossaryTerms.id} AND ${glossaryTermTranslations.locale} = ${locale}`
    )
    .orderBy(glossaryTerms.termEn);

  const termIds = rows.map((r) => r.termId);
  const aliasMap = await fetchAliasesMap(termIds);
  const positionMap = await fetchPositionsMap(termIds);

  return rows.map((row) =>
    toChessTerm(row, aliasMap.get(row.termId) || [], positionMap.get(row.termId) || [])
  );
}

export async function getTermsByLetter(letter: string, locale: string): Promise<ChessTerm[]> {
  const upperLetter = letter.toUpperCase();

  const rows = await db
    .select({
      termId: glossaryTerms.id,
      termEn: glossaryTerms.termEn,
      category: glossaryTerms.category,
      translatedTerm: glossaryTermTranslations.term,
      definition: glossaryTermTranslations.definition,
      reading: glossaryTermTranslations.reading,
    })
    .from(glossaryTerms)
    .leftJoin(
      glossaryTermTranslations,
      sql`${glossaryTermTranslations.termId} = ${glossaryTerms.id} AND ${glossaryTermTranslations.locale} = ${locale}`
    )
    .where(sql`upper(left(${glossaryTerms.termEn}, 1)) = ${upperLetter}`)
    .orderBy(glossaryTerms.termEn);

  const termIds = rows.map((r) => r.termId);
  const aliasMap = await fetchAliasesMap(termIds);
  const positionMap = await fetchPositionsMap(termIds);

  return rows.map((row) =>
    toChessTerm(row, aliasMap.get(row.termId) || [], positionMap.get(row.termId) || [])
  );
}

export async function getTermsByCategory(category: string, locale: string): Promise<ChessTerm[]> {
  const rows = await db
    .select({
      termId: glossaryTerms.id,
      termEn: glossaryTerms.termEn,
      category: glossaryTerms.category,
      translatedTerm: glossaryTermTranslations.term,
      definition: glossaryTermTranslations.definition,
      reading: glossaryTermTranslations.reading,
    })
    .from(glossaryTerms)
    .leftJoin(
      glossaryTermTranslations,
      sql`${glossaryTermTranslations.termId} = ${glossaryTerms.id} AND ${glossaryTermTranslations.locale} = ${locale}`
    )
    .where(eq(glossaryTerms.category, category))
    .orderBy(glossaryTerms.termEn);

  const termIds = rows.map((r) => r.termId);
  const aliasMap = await fetchAliasesMap(termIds);
  const positionMap = await fetchPositionsMap(termIds);

  return rows.map((row) =>
    toChessTerm(row, aliasMap.get(row.termId) || [], positionMap.get(row.termId) || [])
  );
}

export async function getUniqueLetters(): Promise<string[]> {
  const rows = await db
    .selectDistinct({
      letter: sql<string>`upper(left(${glossaryTerms.termEn}, 1))`,
    })
    .from(glossaryTerms)
    .orderBy(sql`upper(left(${glossaryTerms.termEn}, 1))`);

  return rows.map((r) => r.letter);
}

export async function getLetterCounts(): Promise<Record<string, number>> {
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
}

export async function getCategoryCounts(): Promise<Record<string, number>> {
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
}
