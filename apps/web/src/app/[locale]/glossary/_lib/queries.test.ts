import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';

import type { ChessTerm } from '../../_lib/types';
import {
  getCategoryCounts,
  getGlossaryTerms,
  getLetterCounts,
  getTermsByCategory,
  getTermsByLetter,
  getUniqueLetters,
} from './queries';

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

describe('queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getGlossaryTerms', () => {
    it('should return all terms with full translations and aliases', async () => {
      const termRows = [
        {
          termId: 'id-1',
          termEn: 'Checkmate',
          category: 'tactics',
          translatedTerm: 'チェックメイト',
          definition: '王手詰み',
          reading: 'ちぇっくめいと',
        },
        {
          termId: 'id-2',
          termEn: 'Castling',
          category: 'general',
          translatedTerm: 'キャスリング',
          definition: 'キャスリングの説明',
          reading: 'きゃすりんぐ',
        },
      ];

      const aliasRows = [
        { termId: 'id-1', alias: 'Mate' },
        { termId: 'id-1', alias: '#' },
      ];

      const chain1 = mockChain(termRows);
      const chain2 = mockChain(aliasRows);

      let callCount = 0;
      mockDb.select.mockImplementation((() => {
        callCount++;
        return callCount === 1 ? chain1 : chain2;
      }) as typeof mockDb.select);

      const result = await getGlossaryTerms('ja');

      expect(result).toHaveLength(2);

      expect(result[0]).toEqual<ChessTerm>({
        term: 'Checkmate',
        termJa: 'チェックメイト',
        reading: 'ちぇっくめいと',
        definition: '王手詰み',
        definitionEn: '王手詰み',
        aliases: ['Mate', '#'],
        category: 'tactics',
      });

      expect(result[1]).toEqual<ChessTerm>({
        term: 'Castling',
        termJa: 'キャスリング',
        reading: 'きゃすりんぐ',
        definition: 'キャスリングの説明',
        definitionEn: 'キャスリングの説明',
        aliases: undefined,
        category: 'general',
      });
    });

    it('should return terms with termEn as definition when translation definition is null', async () => {
      const termRows = [
        {
          termId: 'id-1',
          termEn: 'Zugzwang',
          category: 'strategy',
          translatedTerm: 'ツークツヴァンク',
          definition: null,
          reading: null,
        },
      ];

      const chain1 = mockChain(termRows);
      const chain2 = mockChain([]);

      let callCount = 0;
      mockDb.select.mockImplementation((() => {
        callCount++;
        return callCount === 1 ? chain1 : chain2;
      }) as typeof mockDb.select);

      const result = await getGlossaryTerms('ja');

      expect(result).toHaveLength(1);
      expect(result[0].definition).toBe('Zugzwang');
      expect(result[0].definitionEn).toBe('Zugzwang');
      expect(result[0].reading).toBeUndefined();
    });

    it('should handle empty result set', async () => {
      const chain1 = mockChain([]);
      mockDb.select.mockReturnValue(chain1 as ReturnType<typeof mockDb.select>);

      const result = await getGlossaryTerms('ja');

      expect(result).toEqual([]);
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });

    it('should handle terms with no translation (translatedTerm is null)', async () => {
      const termRows = [
        {
          termId: 'id-1',
          termEn: 'En Passant',
          category: 'tactics',
          translatedTerm: null,
          definition: null,
          reading: null,
        },
      ];

      const chain1 = mockChain(termRows);
      const chain2 = mockChain([]);

      let callCount = 0;
      mockDb.select.mockImplementation((() => {
        callCount++;
        return callCount === 1 ? chain1 : chain2;
      }) as typeof mockDb.select);

      const result = await getGlossaryTerms('fr');

      expect(result).toHaveLength(1);
      expect(result[0].termJa).toBeUndefined();
      expect(result[0].definition).toBe('En Passant');
    });

    it('should map aliases correctly when term has empty aliases', async () => {
      const termRows = [
        {
          termId: 'id-1',
          termEn: 'Fork',
          category: 'tactics',
          translatedTerm: 'フォーク',
          definition: 'フォークの説明',
          reading: 'ふぉーく',
        },
      ];

      const chain1 = mockChain(termRows);
      const chain2 = mockChain([]);

      let callCount = 0;
      mockDb.select.mockImplementation((() => {
        callCount++;
        return callCount === 1 ? chain1 : chain2;
      }) as typeof mockDb.select);

      const result = await getGlossaryTerms('ja');

      expect(result[0].aliases).toBeUndefined();
    });
  });

  describe('getTermsByLetter', () => {
    it('should return terms filtered by letter', async () => {
      const termRows = [
        {
          termId: 'id-1',
          termEn: 'Check',
          category: 'tactics',
          translatedTerm: 'チェック',
          definition: 'チェックの説明',
          reading: 'ちぇっく',
        },
      ];

      const chain1 = mockChain(termRows);
      const chain2 = mockChain([]);

      let callCount = 0;
      mockDb.select.mockImplementation((() => {
        callCount++;
        return callCount === 1 ? chain1 : chain2;
      }) as typeof mockDb.select);

      const result = await getTermsByLetter('c', 'ja');

      expect(result).toHaveLength(1);
      expect(result[0].term).toBe('Check');
    });

    it('should handle uppercase letter input', async () => {
      const chain1 = mockChain([]);
      mockDb.select.mockReturnValue(chain1 as ReturnType<typeof mockDb.select>);

      const result = await getTermsByLetter('Z', 'en');

      expect(result).toEqual([]);
    });

    it('should return empty array when no terms match the letter', async () => {
      const chain1 = mockChain([]);
      mockDb.select.mockReturnValue(chain1 as ReturnType<typeof mockDb.select>);

      const result = await getTermsByLetter('x', 'ja');

      expect(result).toEqual([]);
    });
  });

  describe('getTermsByCategory', () => {
    it('should return terms filtered by category', async () => {
      const termRows = [
        {
          termId: 'id-1',
          termEn: 'Pin',
          category: 'tactics',
          translatedTerm: 'ピン',
          definition: 'ピンの説明',
          reading: 'ぴん',
        },
        {
          termId: 'id-2',
          termEn: 'Skewer',
          category: 'tactics',
          translatedTerm: 'スキュアー',
          definition: 'スキュアーの説明',
          reading: null,
        },
      ];

      const chain1 = mockChain(termRows);
      const chain2 = mockChain([]);

      let callCount = 0;
      mockDb.select.mockImplementation((() => {
        callCount++;
        return callCount === 1 ? chain1 : chain2;
      }) as typeof mockDb.select);

      const result = await getTermsByCategory('tactics', 'ja');

      expect(result).toHaveLength(2);
      expect(result[0].term).toBe('Pin');
      expect(result[1].term).toBe('Skewer');
      expect(result[1].reading).toBeUndefined();
    });

    it('should return empty array for non-existent category', async () => {
      const chain1 = mockChain([]);
      mockDb.select.mockReturnValue(chain1 as ReturnType<typeof mockDb.select>);

      const result = await getTermsByCategory('nonexistent', 'ja');

      expect(result).toEqual([]);
    });
  });

  describe('getUniqueLetters', () => {
    it('should return sorted unique first letters', async () => {
      const rows = [{ letter: 'A' }, { letter: 'B' }, { letter: 'C' }];

      const chain = mockChain(rows);
      mockDb.selectDistinct.mockReturnValue(chain as ReturnType<typeof mockDb.selectDistinct>);

      const result = await getUniqueLetters();

      expect(result).toEqual(['A', 'B', 'C']);
    });

    it('should return empty array when no terms exist', async () => {
      const chain = mockChain([]);
      mockDb.selectDistinct.mockReturnValue(chain as ReturnType<typeof mockDb.selectDistinct>);

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
      mockDb.select.mockReturnValue(chain as ReturnType<typeof mockDb.select>);

      const result = await getLetterCounts();

      expect(result).toEqual({ A: 5, B: 3, C: 10 });
    });

    it('should return empty record when no terms exist', async () => {
      const chain = mockChain([]);
      mockDb.select.mockReturnValue(chain as ReturnType<typeof mockDb.select>);

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
      mockDb.select.mockReturnValue(chain as ReturnType<typeof mockDb.select>);

      const result = await getCategoryCounts();

      expect(result).toEqual({ tactics: 15, strategy: 8, endgame: 12 });
    });

    it('should return empty record when no terms exist', async () => {
      const chain = mockChain([]);
      mockDb.select.mockReturnValue(chain as ReturnType<typeof mockDb.select>);

      const result = await getCategoryCounts();

      expect(result).toEqual({});
    });
  });

  describe('toChessTerm (tested via getGlossaryTerms)', () => {
    it('should set definitionEn equal to definition (from translation or fallback)', async () => {
      const termRows = [
        {
          termId: 'id-1',
          termEn: 'Stalemate',
          category: 'endgame',
          translatedTerm: 'ステイルメイト',
          definition: 'ステイルメイトの説明',
          reading: 'すているめいと',
        },
      ];

      const chain1 = mockChain(termRows);
      const chain2 = mockChain([]);

      let callCount = 0;
      mockDb.select.mockImplementation((() => {
        callCount++;
        return callCount === 1 ? chain1 : chain2;
      }) as typeof mockDb.select);

      const result = await getGlossaryTerms('ja');

      expect(result[0].definitionEn).toBe('ステイルメイトの説明');
      expect(result[0].definition).toBe('ステイルメイトの説明');
    });

    it('should handle all nullable fields being null', async () => {
      const termRows = [
        {
          termId: 'id-1',
          termEn: 'Tempo',
          category: 'general',
          translatedTerm: null,
          definition: null,
          reading: null,
        },
      ];

      const chain1 = mockChain(termRows);
      const chain2 = mockChain([]);

      let callCount = 0;
      mockDb.select.mockImplementation((() => {
        callCount++;
        return callCount === 1 ? chain1 : chain2;
      }) as typeof mockDb.select);

      const result = await getGlossaryTerms('ja');

      expect(result[0]).toEqual<ChessTerm>({
        term: 'Tempo',
        termJa: undefined,
        reading: undefined,
        definition: 'Tempo',
        definitionEn: 'Tempo',
        aliases: undefined,
        category: 'general',
      });
    });

    it('should handle multiple aliases for different terms', async () => {
      const termRows = [
        {
          termId: 'id-1',
          termEn: 'Bishop',
          category: 'general',
          translatedTerm: 'ビショップ',
          definition: 'ビショップの説明',
          reading: 'びしょっぷ',
        },
        {
          termId: 'id-2',
          termEn: 'Knight',
          category: 'general',
          translatedTerm: 'ナイト',
          definition: 'ナイトの説明',
          reading: 'ないと',
        },
      ];

      const aliasRows = [
        { termId: 'id-1', alias: 'B' },
        { termId: 'id-2', alias: 'N' },
        { termId: 'id-2', alias: 'Kt' },
      ];

      const chain1 = mockChain(termRows);
      const chain2 = mockChain(aliasRows);

      let callCount = 0;
      mockDb.select.mockImplementation((() => {
        callCount++;
        return callCount === 1 ? chain1 : chain2;
      }) as typeof mockDb.select);

      const result = await getGlossaryTerms('ja');

      expect(result[0].aliases).toEqual(['B']);
      expect(result[1].aliases).toEqual(['N', 'Kt']);
    });
  });
});
