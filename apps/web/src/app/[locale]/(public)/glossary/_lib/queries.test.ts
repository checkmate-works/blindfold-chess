import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EMPTY_BOARD_ANNOTATIONS } from '@/lib/board-annotations/types';
import { db } from '@/lib/db';

import {
  getCategoryCounts,
  getGlossaryTerms,
  getLetterCounts,
  getTermsByCategory,
  getTermsByLetter,
  getUniqueLetters,
  mergeTermRows,
} from './queries';
import type { TermWithAliasRow, TermWithPositionRow } from './queries';
import type { ChessTerm } from './types';

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

// Mock the db module before importing queries
vi.mock('@/lib/db', () => {
  const mockDb = {
    select: vi.fn(),
    selectDistinct: vi.fn(),
  };

  return {
    db: mockDb,
    glossaryTerms: {
      id: 'glossary_terms.id',
      termEn: 'glossary_terms.term_en',
      category: 'glossary_terms.category',
    },
    glossaryTermTranslations: {
      termId: 'glossary_term_translations.term_id',
      term: 'glossary_term_translations.term',
      definition: 'glossary_term_translations.definition',
      reading: 'glossary_term_translations.reading',
      locale: 'glossary_term_translations.locale',
    },
    glossaryTermAliases: {
      termId: 'glossary_term_aliases.term_id',
      alias: 'glossary_term_aliases.alias',
    },
    glossaryTermPositions: {
      termId: 'glossary_term_positions.term_id',
      fen: 'glossary_term_positions.fen',
      sortOrder: 'glossary_term_positions.sort_order',
      caption: 'glossary_term_positions.caption',
      annotations: 'glossary_term_positions.annotations',
    },
  };
});

const mockDb = vi.mocked(db);

/**
 * Creates a chainable mock that resolves to `rows` when awaited.
 * Each chained method (select, from, leftJoin, where, orderBy, groupBy)
 * returns the same object so the Drizzle-style chaining works.
 */
function mockChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'selectDistinct', 'from', 'leftJoin', 'where', 'orderBy', 'groupBy'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Make it thenable so `await` resolves to rows
  chain.then = (resolve: (v: unknown) => void) => resolve(rows);
  return chain;
}

/**
 * Sets up mock for two parallel queries (alias query + position query).
 * Each call to db.select() returns the corresponding rows.
 */
function setupMockParallelQueries(aliasRows: unknown[], positionRows: unknown[]) {
  const aliasChain = mockChain(aliasRows);
  const positionChain = mockChain(positionRows);
  mockDb.select
    .mockReturnValueOnce(aliasChain as unknown as ReturnType<typeof mockDb.select>)
    .mockReturnValueOnce(positionChain as unknown as ReturnType<typeof mockDb.select>);
}

describe('mergeTermRows', () => {
  it('should group multiple rows for the same term correctly', () => {
    const aliasRows: TermWithAliasRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Fork',
        category: 'tactics',
        translatedTerm: 'フォーク',
        definition: 'フォークの説明',
        reading: 'ふぉーく',
        alias: 'Double Attack',
      },
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Fork',
        category: 'tactics',
        translatedTerm: 'フォーク',
        definition: 'フォークの説明',
        reading: 'ふぉーく',
        alias: 'Family Fork',
      },
    ];

    const positionRows: TermWithPositionRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Fork',
        category: 'tactics',
        translatedTerm: 'フォーク',
        definition: 'フォークの説明',
        reading: 'ふぉーく',
        positionFen: 'fen-1',
        positionSortOrder: 1,
        positionCaption: 'Example 1',
      },
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Fork',
        category: 'tactics',
        translatedTerm: 'フォーク',
        definition: 'フォークの説明',
        reading: 'ふぉーく',
        positionFen: 'fen-2',
        positionSortOrder: 2,
        positionCaption: null,
      },
    ];

    const result = mergeTermRows(aliasRows, positionRows);

    expect(result).toHaveLength(1);
    expect(result[0].term).toBe('Fork');
    expect(result[0].aliases).toEqual(['Double Attack', 'Family Fork']);
    expect(result[0].positions).toEqual([
      { fen: 'fen-1', sortOrder: 1, caption: 'Example 1', annotations: EMPTY_BOARD_ANNOTATIONS },
      { fen: 'fen-2', sortOrder: 2, caption: undefined, annotations: EMPTY_BOARD_ANNOTATIONS },
    ]);
  });

  it('should deduplicate aliases by value', () => {
    const aliasRows: TermWithAliasRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Castling',
        category: 'general',
        translatedTerm: 'キャスリング',
        definition: 'キャスリングの説明',
        reading: null,
        alias: 'Castle',
      },
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Castling',
        category: 'general',
        translatedTerm: 'キャスリング',
        definition: 'キャスリングの説明',
        reading: null,
        alias: 'Castle',
      },
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Castling',
        category: 'general',
        translatedTerm: 'キャスリング',
        definition: 'キャスリングの説明',
        reading: null,
        alias: 'O-O',
      },
    ];

    const positionRows: TermWithPositionRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Castling',
        category: 'general',
        translatedTerm: 'キャスリング',
        definition: 'キャスリングの説明',
        reading: null,
        positionFen: 'fen-a',
        positionSortOrder: 1,
        positionCaption: null,
      },
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Castling',
        category: 'general',
        translatedTerm: 'キャスリング',
        definition: 'キャスリングの説明',
        reading: null,
        positionFen: 'fen-b',
        positionSortOrder: 2,
        positionCaption: null,
      },
    ];

    const result = mergeTermRows(aliasRows, positionRows);

    expect(result).toHaveLength(1);
    expect(result[0].aliases).toEqual(['Castle', 'O-O']);
    expect(result[0].positions).toEqual([
      { fen: 'fen-a', sortOrder: 1, caption: undefined, annotations: EMPTY_BOARD_ANNOTATIONS },
      { fen: 'fen-b', sortOrder: 2, caption: undefined, annotations: EMPTY_BOARD_ANNOTATIONS },
    ]);
  });

  it('should deduplicate positions by fen via Map', () => {
    const aliasRows: TermWithAliasRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Pin',
        category: 'tactics',
        translatedTerm: 'ピン',
        definition: 'ピンの説明',
        reading: null,
        alias: null,
      },
    ];

    const positionRows: TermWithPositionRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Pin',
        category: 'tactics',
        translatedTerm: 'ピン',
        definition: 'ピンの説明',
        reading: null,
        positionFen: 'same-fen',
        positionSortOrder: 1,
        positionCaption: 'Caption A',
      },
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Pin',
        category: 'tactics',
        translatedTerm: 'ピン',
        definition: 'ピンの説明',
        reading: null,
        positionFen: 'same-fen',
        positionSortOrder: 1,
        positionCaption: 'Caption A',
      },
    ];

    const result = mergeTermRows(aliasRows, positionRows);

    expect(result).toHaveLength(1);
    expect(result[0].aliases).toBeUndefined();
    // Only one position despite two rows with the same fen
    expect(result[0].positions).toEqual([
      {
        fen: 'same-fen',
        sortOrder: 1,
        caption: 'Caption A',
        annotations: EMPTY_BOARD_ANNOTATIONS,
      },
    ]);
  });

  it('should return undefined aliases when all alias values are null', () => {
    const aliasRows: TermWithAliasRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Tempo',
        category: 'general',
        translatedTerm: 'テンポ',
        definition: 'テンポの説明',
        reading: null,
        alias: null,
      },
    ];

    const positionRows: TermWithPositionRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Tempo',
        category: 'general',
        translatedTerm: 'テンポ',
        definition: 'テンポの説明',
        reading: null,
        positionFen: null,
        positionSortOrder: null,
        positionCaption: null,
      },
    ];

    const result = mergeTermRows(aliasRows, positionRows);

    expect(result).toHaveLength(1);
    expect(result[0].aliases).toBeUndefined();
  });

  it('should return undefined positions when all position fields are null', () => {
    const aliasRows: TermWithAliasRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Tempo',
        category: 'general',
        translatedTerm: 'テンポ',
        definition: 'テンポの説明',
        reading: null,
        alias: 'Time',
      },
    ];

    const positionRows: TermWithPositionRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Tempo',
        category: 'general',
        translatedTerm: 'テンポ',
        definition: 'テンポの説明',
        reading: null,
        positionFen: null,
        positionSortOrder: null,
        positionCaption: null,
      },
    ];

    const result = mergeTermRows(aliasRows, positionRows);

    expect(result).toHaveLength(1);
    expect(result[0].aliases).toEqual(['Time']);
    expect(result[0].positions).toBeUndefined();
  });

  it('should handle null values for alias, positionFen, etc.', () => {
    const aliasRows: TermWithAliasRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Zugzwang',
        category: 'strategy',
        translatedTerm: null,
        definition: null,
        reading: null,
        alias: null,
      },
    ];

    const positionRows: TermWithPositionRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Zugzwang',
        category: 'strategy',
        translatedTerm: null,
        definition: null,
        reading: null,
        positionFen: null,
        positionSortOrder: null,
        positionCaption: null,
      },
    ];

    const result = mergeTermRows(aliasRows, positionRows);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual<ChessTerm>({
      slug: 'id-1',
      term: 'Zugzwang',
      termJa: undefined,
      reading: undefined,
      definition: 'Zugzwang',
      definitionEn: 'Zugzwang',
      aliases: undefined,
      positions: undefined,
      category: 'strategy',
    });
  });

  it('should sort positions by sortOrder', () => {
    const aliasRows: TermWithAliasRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Discovery',
        category: 'tactics',
        translatedTerm: null,
        definition: null,
        reading: null,
        alias: null,
      },
    ];

    const positionRows: TermWithPositionRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Discovery',
        category: 'tactics',
        translatedTerm: null,
        definition: null,
        reading: null,
        positionFen: 'fen-step-3',
        positionSortOrder: 3,
        positionCaption: 'Step 3',
      },
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Discovery',
        category: 'tactics',
        translatedTerm: null,
        definition: null,
        reading: null,
        positionFen: 'fen-step-1',
        positionSortOrder: 1,
        positionCaption: 'Step 1',
      },
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Discovery',
        category: 'tactics',
        translatedTerm: null,
        definition: null,
        reading: null,
        positionFen: 'fen-step-2',
        positionSortOrder: 2,
        positionCaption: null,
      },
    ];

    const result = mergeTermRows(aliasRows, positionRows);

    expect(result[0].positions).toEqual([
      { fen: 'fen-step-1', sortOrder: 1, caption: 'Step 1', annotations: EMPTY_BOARD_ANNOTATIONS },
      { fen: 'fen-step-2', sortOrder: 2, caption: undefined, annotations: EMPTY_BOARD_ANNOTATIONS },
      { fen: 'fen-step-3', sortOrder: 3, caption: 'Step 3', annotations: EMPTY_BOARD_ANNOTATIONS },
    ]);
  });

  it('should default sortOrder to 0 when null', () => {
    const aliasRows: TermWithAliasRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Battery',
        category: 'tactics',
        translatedTerm: null,
        definition: null,
        reading: null,
        alias: null,
      },
    ];

    const positionRows: TermWithPositionRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Battery',
        category: 'tactics',
        translatedTerm: null,
        definition: null,
        reading: null,
        positionFen: 'battery-fen',
        positionSortOrder: null,
        positionCaption: null,
      },
    ];

    const result = mergeTermRows(aliasRows, positionRows);

    expect(result[0].positions).toEqual([
      {
        fen: 'battery-fen',
        sortOrder: 0,
        caption: undefined,
        annotations: EMPTY_BOARD_ANNOTATIONS,
      },
    ]);
  });

  it('should separate rows for different terms correctly', () => {
    const aliasRows: TermWithAliasRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Bishop',
        category: 'general',
        translatedTerm: 'ビショップ',
        definition: 'ビショップの説明',
        reading: 'びしょっぷ',
        alias: 'B',
      },
      {
        termId: 'id-2',
        slug: 'id-2',
        termEn: 'Knight',
        category: 'general',
        translatedTerm: 'ナイト',
        definition: 'ナイトの説明',
        reading: 'ないと',
        alias: 'N',
      },
      {
        termId: 'id-2',
        slug: 'id-2',
        termEn: 'Knight',
        category: 'general',
        translatedTerm: 'ナイト',
        definition: 'ナイトの説明',
        reading: 'ないと',
        alias: 'Kt',
      },
    ];

    const positionRows: TermWithPositionRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Bishop',
        category: 'general',
        translatedTerm: 'ビショップ',
        definition: 'ビショップの説明',
        reading: 'びしょっぷ',
        positionFen: null,
        positionSortOrder: null,
        positionCaption: null,
      },
      {
        termId: 'id-2',
        slug: 'id-2',
        termEn: 'Knight',
        category: 'general',
        translatedTerm: 'ナイト',
        definition: 'ナイトの説明',
        reading: 'ないと',
        positionFen: 'knight-fen',
        positionSortOrder: 1,
        positionCaption: null,
      },
    ];

    const result = mergeTermRows(aliasRows, positionRows);

    expect(result).toHaveLength(2);
    expect(result[0].term).toBe('Bishop');
    expect(result[0].aliases).toEqual(['B']);
    expect(result[0].positions).toBeUndefined();

    expect(result[1].term).toBe('Knight');
    expect(result[1].aliases).toEqual(['N', 'Kt']);
    expect(result[1].positions).toEqual([
      { fen: 'knight-fen', sortOrder: 1, caption: undefined, annotations: EMPTY_BOARD_ANNOTATIONS },
    ]);
  });

  it('should return empty array for empty input', () => {
    const result = mergeTermRows([], []);
    expect(result).toEqual([]);
  });

  it('should use definition from translation when available', () => {
    const aliasRows: TermWithAliasRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Check',
        category: 'tactics',
        translatedTerm: 'チェック',
        definition: 'チェックの説明',
        reading: 'ちぇっく',
        alias: null,
      },
    ];

    const result = mergeTermRows(aliasRows, []);

    expect(result[0].definition).toBe('チェックの説明');
    expect(result[0].definitionEn).toBe('チェックの説明');
  });

  it('should fall back to termEn for definition when translation definition is null', () => {
    const aliasRows: TermWithAliasRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Zugzwang',
        category: 'strategy',
        translatedTerm: 'ツークツヴァンク',
        definition: null,
        reading: null,
        alias: null,
      },
    ];

    const result = mergeTermRows(aliasRows, []);

    expect(result[0].definition).toBe('Zugzwang');
    expect(result[0].definitionEn).toBe('Zugzwang');
  });

  it('should set caption to undefined when positionCaption is null', () => {
    const positionRows: TermWithPositionRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Pin',
        category: 'tactics',
        translatedTerm: null,
        definition: null,
        reading: null,
        positionFen: 'pin-fen',
        positionSortOrder: 1,
        positionCaption: null,
      },
    ];

    const result = mergeTermRows([], positionRows);

    expect(result[0].positions![0].caption).toBeUndefined();
  });

  it('should preserve caption when positionCaption is provided', () => {
    const positionRows: TermWithPositionRow[] = [
      {
        termId: 'id-1',
        slug: 'id-1',
        termEn: 'Pin',
        category: 'tactics',
        translatedTerm: null,
        definition: null,
        reading: null,
        positionFen: 'pin-fen',
        positionSortOrder: 1,
        positionCaption: 'A classic pin',
      },
    ];

    const result = mergeTermRows([], positionRows);

    expect(result[0].positions![0].caption).toBe('A classic pin');
  });

  it('should maintain insertion order of terms from alias rows', () => {
    const aliasRows: TermWithAliasRow[] = [
      {
        termId: 'id-a',
        slug: 'id-a',
        termEn: 'Alpha',
        category: 'general',
        translatedTerm: null,
        definition: null,
        reading: null,
        alias: null,
      },
      {
        termId: 'id-b',
        slug: 'id-b',
        termEn: 'Beta',
        category: 'general',
        translatedTerm: null,
        definition: null,
        reading: null,
        alias: null,
      },
      {
        termId: 'id-c',
        slug: 'id-c',
        termEn: 'Charlie',
        category: 'general',
        translatedTerm: null,
        definition: null,
        reading: null,
        alias: null,
      },
    ];

    const result = mergeTermRows(aliasRows, []);

    expect(result).toHaveLength(3);
    expect(result[0].term).toBe('Alpha');
    expect(result[1].term).toBe('Beta');
    expect(result[2].term).toBe('Charlie');
  });
});

describe('queries (integration with DB mock)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getGlossaryTerms', () => {
    it('should return all terms with full translations and aliases', async () => {
      const aliasRows: TermWithAliasRow[] = [
        {
          termId: 'id-1',
          slug: 'id-1',
          termEn: 'Checkmate',
          category: 'tactics',
          translatedTerm: 'チェックメイト',
          definition: '王手詰み',
          reading: 'ちぇっくめいと',
          alias: 'Mate',
        },
        {
          termId: 'id-1',
          slug: 'id-1',
          termEn: 'Checkmate',
          category: 'tactics',
          translatedTerm: 'チェックメイト',
          definition: '王手詰み',
          reading: 'ちぇっくめいと',
          alias: '#',
        },
        {
          termId: 'id-2',
          slug: 'id-2',
          termEn: 'Castling',
          category: 'general',
          translatedTerm: 'キャスリング',
          definition: 'キャスリングの説明',
          reading: 'きゃすりんぐ',
          alias: null,
        },
      ];

      const positionRows: TermWithPositionRow[] = [
        {
          termId: 'id-1',
          slug: 'id-1',
          termEn: 'Checkmate',
          category: 'tactics',
          translatedTerm: 'チェックメイト',
          definition: '王手詰み',
          reading: 'ちぇっくめいと',
          positionFen: null,
          positionSortOrder: null,
          positionCaption: null,
        },
        {
          termId: 'id-2',
          slug: 'id-2',
          termEn: 'Castling',
          category: 'general',
          translatedTerm: 'キャスリング',
          definition: 'キャスリングの説明',
          reading: 'きゃすりんぐ',
          positionFen: null,
          positionSortOrder: null,
          positionCaption: null,
        },
      ];

      setupMockParallelQueries(aliasRows, positionRows);

      const result = await getGlossaryTerms('ja');

      expect(result).toHaveLength(2);

      expect(result[0]).toEqual<ChessTerm>({
        slug: 'id-1',
        term: 'Checkmate',
        termJa: 'チェックメイト',
        reading: 'ちぇっくめいと',
        definition: '王手詰み',
        definitionEn: '王手詰み',
        aliases: ['Mate', '#'],
        positions: undefined,
        category: 'tactics',
      });

      expect(result[1]).toEqual<ChessTerm>({
        slug: 'id-2',
        term: 'Castling',
        termJa: 'キャスリング',
        reading: 'きゃすりんぐ',
        definition: 'キャスリングの説明',
        definitionEn: 'キャスリングの説明',
        aliases: undefined,
        positions: undefined,
        category: 'general',
      });
    });

    it('should return terms with termEn as definition when translation definition is null', async () => {
      const aliasRows: TermWithAliasRow[] = [
        {
          termId: 'id-1',
          slug: 'id-1',
          termEn: 'Zugzwang',
          category: 'strategy',
          translatedTerm: 'ツークツヴァンク',
          definition: null,
          reading: null,
          alias: null,
        },
      ];

      const positionRows: TermWithPositionRow[] = [
        {
          termId: 'id-1',
          slug: 'id-1',
          termEn: 'Zugzwang',
          category: 'strategy',
          translatedTerm: 'ツークツヴァンク',
          definition: null,
          reading: null,
          positionFen: null,
          positionSortOrder: null,
          positionCaption: null,
        },
      ];

      setupMockParallelQueries(aliasRows, positionRows);

      const result = await getGlossaryTerms('ja');

      expect(result).toHaveLength(1);
      expect(result[0].definition).toBe('Zugzwang');
      expect(result[0].definitionEn).toBe('Zugzwang');
      expect(result[0].reading).toBeUndefined();
    });

    it('should handle empty result set', async () => {
      setupMockParallelQueries([], []);

      const result = await getGlossaryTerms('ja');

      expect(result).toEqual([]);
      expect(mockDb.select).toHaveBeenCalledTimes(2);
    });

    it('should handle terms with no translation (translatedTerm is null)', async () => {
      const aliasRows: TermWithAliasRow[] = [
        {
          termId: 'id-1',
          slug: 'id-1',
          termEn: 'En Passant',
          category: 'tactics',
          translatedTerm: null,
          definition: null,
          reading: null,
          alias: null,
        },
      ];

      const positionRows: TermWithPositionRow[] = [
        {
          termId: 'id-1',
          slug: 'id-1',
          termEn: 'En Passant',
          category: 'tactics',
          translatedTerm: null,
          definition: null,
          reading: null,
          positionFen: null,
          positionSortOrder: null,
          positionCaption: null,
        },
      ];

      setupMockParallelQueries(aliasRows, positionRows);

      const result = await getGlossaryTerms('fr');

      expect(result).toHaveLength(1);
      expect(result[0].termJa).toBeUndefined();
      expect(result[0].definition).toBe('En Passant');
    });

    it('should map aliases correctly when term has empty aliases', async () => {
      const aliasRows: TermWithAliasRow[] = [
        {
          termId: 'id-1',
          slug: 'id-1',
          termEn: 'Fork',
          category: 'tactics',
          translatedTerm: 'フォーク',
          definition: 'フォークの説明',
          reading: 'ふぉーく',
          alias: null,
        },
      ];

      const positionRows: TermWithPositionRow[] = [
        {
          termId: 'id-1',
          slug: 'id-1',
          termEn: 'Fork',
          category: 'tactics',
          translatedTerm: 'フォーク',
          definition: 'フォークの説明',
          reading: 'ふぉーく',
          positionFen: null,
          positionSortOrder: null,
          positionCaption: null,
        },
      ];

      setupMockParallelQueries(aliasRows, positionRows);

      const result = await getGlossaryTerms('ja');

      expect(result[0].aliases).toBeUndefined();
    });
  });

  describe('getTermsByLetter', () => {
    it('should return terms filtered by letter', async () => {
      const aliasRows: TermWithAliasRow[] = [
        {
          termId: 'id-1',
          slug: 'id-1',
          termEn: 'Check',
          category: 'tactics',
          translatedTerm: 'チェック',
          definition: 'チェックの説明',
          reading: 'ちぇっく',
          alias: null,
        },
      ];

      const positionRows: TermWithPositionRow[] = [
        {
          termId: 'id-1',
          slug: 'id-1',
          termEn: 'Check',
          category: 'tactics',
          translatedTerm: 'チェック',
          definition: 'チェックの説明',
          reading: 'ちぇっく',
          positionFen: null,
          positionSortOrder: null,
          positionCaption: null,
        },
      ];

      setupMockParallelQueries(aliasRows, positionRows);

      const result = await getTermsByLetter('c', 'ja');

      expect(result).toHaveLength(1);
      expect(result[0].term).toBe('Check');
    });

    it('should handle uppercase letter input', async () => {
      setupMockParallelQueries([], []);

      const result = await getTermsByLetter('Z', 'en');

      expect(result).toEqual([]);
    });

    it('should return empty array when no terms match the letter', async () => {
      setupMockParallelQueries([], []);

      const result = await getTermsByLetter('x', 'ja');

      expect(result).toEqual([]);
    });

    it('should return positions when fetching terms by letter', async () => {
      const aliasRows: TermWithAliasRow[] = [
        {
          termId: 'id-1',
          slug: 'id-1',
          termEn: 'Fork',
          category: 'tactics',
          translatedTerm: 'フォーク',
          definition: 'フォークの説明',
          reading: 'ふぉーく',
          alias: null,
        },
      ];

      const positionRows: TermWithPositionRow[] = [
        {
          termId: 'id-1',
          slug: 'id-1',
          termEn: 'Fork',
          category: 'tactics',
          translatedTerm: 'フォーク',
          definition: 'フォークの説明',
          reading: 'ふぉーく',
          positionFen: 'fork-fen',
          positionSortOrder: 1,
          positionCaption: 'Fork position',
        },
      ];

      setupMockParallelQueries(aliasRows, positionRows);

      const result = await getTermsByLetter('f', 'ja');

      expect(result[0].positions).toEqual([
        {
          fen: 'fork-fen',
          sortOrder: 1,
          caption: 'Fork position',
          annotations: EMPTY_BOARD_ANNOTATIONS,
        },
      ]);
    });
  });

  describe('getTermsByCategory', () => {
    it('should return terms filtered by category', async () => {
      const aliasRows: TermWithAliasRow[] = [
        {
          termId: 'id-1',
          slug: 'id-1',
          termEn: 'Pin',
          category: 'tactics',
          translatedTerm: 'ピン',
          definition: 'ピンの説明',
          reading: 'ぴん',
          alias: null,
        },
        {
          termId: 'id-2',
          slug: 'id-2',
          termEn: 'Skewer',
          category: 'tactics',
          translatedTerm: 'スキュアー',
          definition: 'スキュアーの説明',
          reading: null,
          alias: null,
        },
      ];

      const positionRows: TermWithPositionRow[] = [
        {
          termId: 'id-1',
          slug: 'id-1',
          termEn: 'Pin',
          category: 'tactics',
          translatedTerm: 'ピン',
          definition: 'ピンの説明',
          reading: 'ぴん',
          positionFen: null,
          positionSortOrder: null,
          positionCaption: null,
        },
        {
          termId: 'id-2',
          slug: 'id-2',
          termEn: 'Skewer',
          category: 'tactics',
          translatedTerm: 'スキュアー',
          definition: 'スキュアーの説明',
          reading: null,
          positionFen: null,
          positionSortOrder: null,
          positionCaption: null,
        },
      ];

      setupMockParallelQueries(aliasRows, positionRows);

      const result = await getTermsByCategory('tactics', 'ja');

      expect(result).toHaveLength(2);
      expect(result[0].term).toBe('Pin');
      expect(result[1].term).toBe('Skewer');
      expect(result[1].reading).toBeUndefined();
    });

    it('should return empty array for non-existent category', async () => {
      setupMockParallelQueries([], []);

      const result = await getTermsByCategory('nonexistent', 'ja');

      expect(result).toEqual([]);
    });

    it('should return positions when fetching terms by category', async () => {
      const aliasRows: TermWithAliasRow[] = [
        {
          termId: 'id-1',
          slug: 'id-1',
          termEn: 'Pin',
          category: 'tactics',
          translatedTerm: 'ピン',
          definition: 'ピンの説明',
          reading: 'ぴん',
          alias: null,
        },
      ];

      const positionRows: TermWithPositionRow[] = [
        {
          termId: 'id-1',
          slug: 'id-1',
          termEn: 'Pin',
          category: 'tactics',
          translatedTerm: 'ピン',
          definition: 'ピンの説明',
          reading: 'ぴん',
          positionFen: 'pin-fen',
          positionSortOrder: 1,
          positionCaption: null,
        },
      ];

      setupMockParallelQueries(aliasRows, positionRows);

      const result = await getTermsByCategory('tactics', 'ja');

      expect(result[0].positions).toEqual([
        { fen: 'pin-fen', sortOrder: 1, caption: undefined, annotations: EMPTY_BOARD_ANNOTATIONS },
      ]);
    });
  });

  describe('getUniqueLetters', () => {
    it('should return sorted unique first letters', async () => {
      const rows = [{ letter: 'A' }, { letter: 'B' }, { letter: 'C' }];

      const chain = mockChain(rows);
      mockDb.selectDistinct.mockReturnValue(
        chain as unknown as ReturnType<typeof mockDb.selectDistinct>
      );

      const result = await getUniqueLetters();

      expect(result).toEqual(['A', 'B', 'C']);
    });

    it('should return empty array when no terms exist', async () => {
      const chain = mockChain([]);
      mockDb.selectDistinct.mockReturnValue(
        chain as unknown as ReturnType<typeof mockDb.selectDistinct>
      );

      const result = await getUniqueLetters();

      expect(result).toEqual([]);
    });
  });

  describe('getLetterCounts', () => {
    it('should return letter counts as a record', async () => {
      const rows = [
        { letter: 'A', count: 5 },
        { letter: 'B', count: 3 },
        { letter: 'C', count: 10 },
      ];

      const chain = mockChain(rows);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getLetterCounts();

      expect(result).toEqual({ A: 5, B: 3, C: 10 });
    });

    it('should return empty record when no terms exist', async () => {
      const chain = mockChain([]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getLetterCounts();

      expect(result).toEqual({});
    });
  });

  describe('getCategoryCounts', () => {
    it('should return category counts as a record', async () => {
      const rows = [
        { category: 'tactics', count: 15 },
        { category: 'strategy', count: 8 },
        { category: 'endgame', count: 12 },
      ];

      const chain = mockChain(rows);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getCategoryCounts();

      expect(result).toEqual({ tactics: 15, strategy: 8, endgame: 12 });
    });

    it('should return empty record when no terms exist', async () => {
      const chain = mockChain([]);
      mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

      const result = await getCategoryCounts();

      expect(result).toEqual({});
    });
  });
});
