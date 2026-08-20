import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mergeAttachmentsByPreference } from './get-attachments-for-posts';

/**
 * Row builders. The card mappers are exercised on their own; here only the
 * `postId` and the resulting `kind` matter, so every row is minimal.
 */
const pgn = (postId: string) => ({ id: `pgn-${postId}`, postId, pgn: '1. e4 e5' }) as never;
const embed = (postId: string) => ({ id: `embed-${postId}`, postId }) as never;
const fen = (postId: string) =>
  ({ id: `fen-${postId}`, postId, fen: '8/8/8/8/8/8/8/8 w - - 0 1' }) as never;
const video = (postId: string) => ({ id: `video-${postId}`, postId }) as never;
const image = (postId: string, displayOrder = 0) =>
  ({
    id: `img-${postId}-${displayOrder}`,
    postId,
    storagePath:
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/cccccccc-cccc-cccc-cccc-cccccccccccc.jpg',
    width: 100,
    height: 100,
    altText: null,
    displayOrder,
  }) as never;

const empty = { pgnRows: [], embedRows: [], imageRows: [], fenRows: [], videoRows: [] };
const merge = (rows: Partial<typeof empty>, onConflict = vi.fn()) => ({
  map: mergeAttachmentsByPreference({ ...empty, ...rows }, { onConflict }),
  onConflict,
});

describe('mergeAttachmentsByPreference', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.test');
  });

  it('returns an empty map when no rows exist', () => {
    expect(merge({}).map.size).toBe(0);
  });

  it.each([
    ['pgn', { pgnRows: [pgn('p1')] }],
    ['embed', { embedRows: [embed('p1')] }],
    ['image', { imageRows: [image('p1')] }],
    ['fen', { fenRows: [fen('p1')] }],
    ['video', { videoRows: [video('p1')] }],
  ])('maps a lone %s row to its own kind', (kind, rows) => {
    expect(merge(rows).map.get('p1')?.kind).toBe(kind);
  });

  it('applies the documented pgn > embed > image > fen > video order', () => {
    const all = {
      pgnRows: [pgn('p1')],
      embedRows: [embed('p1')],
      imageRows: [image('p1')],
      fenRows: [fen('p1')],
      videoRows: [video('p1')],
    };
    expect(merge(all).map.get('p1')?.kind).toBe('pgn');
    expect(merge({ ...all, pgnRows: [] }).map.get('p1')?.kind).toBe('embed');
    expect(merge({ ...all, pgnRows: [], embedRows: [] }).map.get('p1')?.kind).toBe('image');
    expect(merge({ ...all, pgnRows: [], embedRows: [], imageRows: [] }).map.get('p1')?.kind).toBe(
      'fen'
    );
    expect(
      merge({ ...all, pgnRows: [], embedRows: [], imageRows: [], fenRows: [] }).map.get('p1')?.kind
    ).toBe('video');
  });

  it('reports each dropped kind through onConflict without throwing', () => {
    const { onConflict } = merge({
      pgnRows: [pgn('p1')],
      fenRows: [fen('p1')],
      videoRows: [video('p1')],
    });
    expect(onConflict).toHaveBeenCalledTimes(2);
    expect(onConflict).toHaveBeenCalledWith('p1', 'pgn', 'fen');
    expect(onConflict).toHaveBeenCalledWith('p1', 'pgn', 'video');
  });

  it('keeps posts independent of one another', () => {
    const { map, onConflict } = merge({
      pgnRows: [pgn('p1')],
      videoRows: [video('p2')],
    });
    expect(map.get('p1')?.kind).toBe('pgn');
    expect(map.get('p2')?.kind).toBe('video');
    expect(onConflict).not.toHaveBeenCalled();
  });

  it('collects a post’s images into one entry, in row order', () => {
    const { map } = merge({ imageRows: [image('p1', 0), image('p1', 1)] });
    const entry = map.get('p1');
    expect(entry?.kind).toBe('image');
    expect(entry?.kind === 'image' && entry.data.map((i) => i.displayOrder)).toEqual([0, 1]);
  });
});
