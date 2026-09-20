import { describe, expect, it } from 'vitest';

import {
  DEFAULT_AD_ALT,
  DEFAULT_NATIVE_THUMBNAIL_FEN,
  thumbnailFromColumns,
  thumbnailToColumns,
} from './thumbnail';

describe('thumbnailFromColumns', () => {
  it('returns the board alone when there is no override image', () => {
    expect(
      thumbnailFromColumns({ thumbnailFen: 'x', thumbnailImagePath: null, thumbnailImageAlt: null })
    ).toEqual({ fen: 'x' });
  });

  it('returns the image over the board when one is set', () => {
    expect(
      thumbnailFromColumns({
        thumbnailFen: 'x',
        thumbnailImagePath: '/x.png',
        thumbnailImageAlt: 'a',
      })
    ).toEqual({ fen: 'x', imagePath: '/x.png', imageAlt: 'a' });
  });
});

describe('thumbnailToColumns', () => {
  it('falls back to the default board for a blank fen', () => {
    expect(thumbnailToColumns({ fen: '  ' })).toEqual({
      thumbnailFen: DEFAULT_NATIVE_THUMBNAIL_FEN,
      thumbnailImagePath: null,
      thumbnailImageAlt: null,
    });
  });

  it('stores the alt only alongside an image, as the row constraint requires', () => {
    expect(thumbnailToColumns({ fen: 'x', imageAlt: 'stray' })).toEqual({
      thumbnailFen: 'x',
      thumbnailImagePath: null,
      thumbnailImageAlt: null,
    });
  });

  it('gives an image with no alt the default alt rather than none', () => {
    expect(thumbnailToColumns({ fen: 'x', imagePath: '/x.png' })).toEqual({
      thumbnailFen: 'x',
      thumbnailImagePath: '/x.png',
      thumbnailImageAlt: DEFAULT_AD_ALT,
    });
  });
});
