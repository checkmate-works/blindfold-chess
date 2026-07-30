import { describe, expect, it } from 'vitest';

import { diffChunkIdentity } from './identity-changes';

const SAVED = {
  title: 'Rook battery',
  slug: 'rook-battery',
  representativeFen: '8/8/8/8/8/8/8/8 w - - 0 1',
};

describe('diffChunkIdentity', () => {
  it('reports nothing for an unchanged row', () => {
    expect(diffChunkIdentity(SAVED, { ...SAVED })).toEqual([]);
  });

  it('names each identity field that changed', () => {
    expect(diffChunkIdentity(SAVED, { ...SAVED, title: 'Rook doubling' })).toEqual(['title']);
    expect(diffChunkIdentity(SAVED, { ...SAVED, slug: 'rook-doubling' })).toEqual(['slug']);
    expect(
      diffChunkIdentity(SAVED, { ...SAVED, representativeFen: '8/8/8/8/4P3/8/8/8 w - - 0 1' })
    ).toEqual(['fen']);
  });

  it('lists several changes in the order the warning names them', () => {
    expect(
      diffChunkIdentity(SAVED, {
        title: 'Rook doubling',
        slug: 'rook-doubling',
        representativeFen: '8/8/8/8/4P3/8/8/8 w - - 0 1',
      })
    ).toEqual(['title', 'slug', 'fen']);
  });

  // What gets persisted is trimmed, so a stray space is not a rename —
  // warning about one would front an edit that changes nothing.
  it('ignores whitespace-only differences', () => {
    expect(
      diffChunkIdentity(SAVED, {
        title: '  Rook battery ',
        slug: 'rook-battery ',
        representativeFen: ' 8/8/8/8/8/8/8/8 w - - 0 1',
      })
    ).toEqual([]);
  });
});
