import { getStartingFen } from '@blindfold-chess/features/chess-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { groupImageRows, pgnRowToCard } from './attachment-card-mappers';

const baseRow = {
  id: 'a1',
  source: 'pgn',
  sourceUrl: null,
  sourceGameId: null,
  moveCount: 2,
  headerWhite: null,
  headerBlack: null,
  headerResult: null,
  headerEvent: null,
  headerSite: null,
  headerDate: null,
  anonymized: false,
  attributionPlatform: null,
  attributionPath: null,
};

describe('pgnRowToCard', () => {
  it('derives the final-position FEN by replaying the PGN', () => {
    const card = pgnRowToCard({ ...baseRow, pgn: '1. e4 e5' });
    expect(card.finalFen).toContain('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR');
    expect(card.pgn).toBe('1. e4 e5');
  });

  it('falls back to the standard start for an unparseable PGN', () => {
    const card = pgnRowToCard({ ...baseRow, pgn: '1. Zz9 ???' });
    expect(card.finalFen).toBe(getStartingFen());
  });
});

describe('groupImageRows', () => {
  const SAFE_PATH =
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/cccccccc-cccc-cccc-cccc-cccccccccccc.jpg';

  const imageRow = (overrides: { id: string; postId: string; storagePath?: string }) => ({
    id: overrides.id,
    postId: overrides.postId,
    storagePath: overrides.storagePath ?? SAFE_PATH,
    width: 100,
    height: 100,
    altText: null,
    displayOrder: 0,
  });

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('groups rows by post preserving per-bucket insertion order', () => {
    const grouped = groupImageRows([
      { ...imageRow({ id: 'i1', postId: 'p1' }), displayOrder: 0 },
      { ...imageRow({ id: 'i2', postId: 'p1' }), displayOrder: 1 },
      imageRow({ id: 'i3', postId: 'p2' }),
    ]);
    expect([...grouped.keys()]).toEqual(['p1', 'p2']);
    expect(grouped.get('p1')?.map((i) => i.id)).toEqual(['i1', 'i2']);
    expect(grouped.get('p1')?.[0].publicUrl).toContain('https://supabase.test/');
  });

  it('drops a row with an unresolvable storage path instead of throwing', () => {
    const dropped: string[] = [];
    const grouped = groupImageRows(
      [
        imageRow({ id: 'i1', postId: 'p1' }),
        imageRow({ id: 'evil', postId: 'p1', storagePath: '../etc/passwd' }),
        imageRow({ id: 'i2', postId: 'p2' }),
      ],
      (row) => dropped.push(row.id)
    );
    expect(grouped.get('p1')?.map((i) => i.id)).toEqual(['i1']);
    expect(grouped.get('p2')?.map((i) => i.id)).toEqual(['i2']);
    expect(dropped).toEqual(['evil']);
  });

  it('drops every row (still without throwing) when the Supabase URL is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    const dropped: unknown[] = [];
    const grouped = groupImageRows([imageRow({ id: 'i1', postId: 'p1' })], (_row, error) =>
      dropped.push(error)
    );
    expect(grouped.size).toBe(0);
    expect(dropped).toHaveLength(1);
  });
});
