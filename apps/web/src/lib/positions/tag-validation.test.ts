import { describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

import { validateAndDedupeTagIds } from './tag-validation';

const mockThemeWhere = vi.fn();
const mockChunkWhere = vi.fn();

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {
    select: () => ({
      from: (table: { __name: string }) => ({
        where: () => (table.__name === 'glossary_terms' ? mockThemeWhere() : mockChunkWhere()),
      }),
    }),
  },
  glossaryTerms: { __name: 'glossary_terms', id: 'id', isTheme: 'is_theme' },
  chunks: { __name: 'chunks', id: 'id', deletedAt: 'deleted_at' },
}));

describe('validateAndDedupeTagIds', () => {
  it('returns ok with both undefined when no input is passed', async () => {
    const result = await validateAndDedupeTagIds({});
    expect(result).toEqual({ ok: true, deduped: { themeIds: undefined, chunkIds: undefined } });
    expect(mockThemeWhere).not.toHaveBeenCalled();
    expect(mockChunkWhere).not.toHaveBeenCalled();
  });

  it('preserves explicit empty arrays without hitting the DB', async () => {
    const result = await validateAndDedupeTagIds({ themeIds: [], chunkIds: [] });
    expect(result).toEqual({ ok: true, deduped: { themeIds: [], chunkIds: [] } });
    expect(mockThemeWhere).not.toHaveBeenCalled();
    expect(mockChunkWhere).not.toHaveBeenCalled();
  });

  it('dedupes theme IDs before querying', async () => {
    mockThemeWhere.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const result = await validateAndDedupeTagIds({ themeIds: ['a', 'b', 'a', 'b'] });
    expect(result).toEqual({
      ok: true,
      deduped: { themeIds: ['a', 'b'], chunkIds: undefined },
    });
    expect(mockThemeWhere).toHaveBeenCalledTimes(1);
  });

  it('dedupes chunk IDs before querying', async () => {
    mockChunkWhere.mockResolvedValue([{ id: 'x' }, { id: 'y' }]);
    const result = await validateAndDedupeTagIds({ chunkIds: ['x', 'y', 'x'] });
    expect(result).toEqual({
      ok: true,
      deduped: { themeIds: undefined, chunkIds: ['x', 'y'] },
    });
    expect(mockChunkWhere).toHaveBeenCalledTimes(1);
  });

  it('returns invalidTheme when the DB returns fewer theme rows than requested', async () => {
    mockThemeWhere.mockResolvedValue([{ id: 'a' }]); // only 1 of 2 IDs matched
    const result = await validateAndDedupeTagIds({ themeIds: ['a', 'nonexistent'] });
    expect(result).toEqual({ ok: false, error: 'invalidTheme' });
  });

  it('returns invalidChunk when the DB returns fewer chunk rows than requested', async () => {
    mockChunkWhere.mockResolvedValue([{ id: 'x' }]); // only 1 of 2 IDs matched
    const result = await validateAndDedupeTagIds({ chunkIds: ['x', 'soft-deleted'] });
    expect(result).toEqual({ ok: false, error: 'invalidChunk' });
  });

  it('checks themes before chunks (short-circuits chunk query on theme failure)', async () => {
    mockThemeWhere.mockResolvedValue([]); // 0 returned for 1 requested → invalidTheme
    const result = await validateAndDedupeTagIds({ themeIds: ['a'], chunkIds: ['x'] });
    expect(result).toEqual({ ok: false, error: 'invalidTheme' });
    expect(mockChunkWhere).not.toHaveBeenCalled();
  });

  it('passes both validations when all IDs match', async () => {
    mockThemeWhere.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);
    mockChunkWhere.mockResolvedValue([{ id: 'c1' }]);
    const result = await validateAndDedupeTagIds({
      themeIds: ['t1', 't2'],
      chunkIds: ['c1'],
    });
    expect(result).toEqual({
      ok: true,
      deduped: { themeIds: ['t1', 't2'], chunkIds: ['c1'] },
    });
  });
});
