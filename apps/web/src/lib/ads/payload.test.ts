import { describe, expect, it } from 'vitest';

import {
  DEFAULT_NATIVE_THUMBNAIL_FEN,
  isNativeCardPayload,
  isNativeCardThumbnail,
  resolveNativeThumbnail,
  thumbnailHasImage,
} from './payload';

describe('isNativeCardThumbnail', () => {
  it('accepts a board-only thumbnail', () => {
    expect(isNativeCardThumbnail({ fen: 'startpos' })).toBe(true);
  });
  it('accepts a board + override image thumbnail', () => {
    expect(isNativeCardThumbnail({ fen: 'x', imagePath: '/x.png', imageAlt: 'a' })).toBe(true);
  });
  it('accepts a null override image', () => {
    expect(isNativeCardThumbnail({ fen: 'x', imagePath: null })).toBe(true);
  });
  it('rejects malformed thumbnails', () => {
    expect(isNativeCardThumbnail({})).toBe(false);
    expect(isNativeCardThumbnail({ fen: 5 })).toBe(false);
    expect(isNativeCardThumbnail({ fen: 'x', imagePath: 5 })).toBe(false);
    expect(isNativeCardThumbnail(null)).toBe(false);
  });
});

describe('isNativeCardPayload with thumbnail', () => {
  const base = { avatarImagePath: null, avatarAlt: 'Ad', title: 't', description: 'd' };

  it('accepts a payload with no thumbnail (backward compatible)', () => {
    expect(isNativeCardPayload(base)).toBe(true);
  });
  it('accepts a valid thumbnail', () => {
    expect(isNativeCardPayload({ ...base, thumbnail: { fen: 'x' } })).toBe(true);
  });
  it('stays native even with a legacy/odd thumbnail (normalized at read time)', () => {
    expect(
      isNativeCardPayload({ ...base, thumbnail: { type: 'image', imagePath: '/x.png' } })
    ).toBe(true);
  });
});

describe('resolveNativeThumbnail', () => {
  const base = { avatarImagePath: null, avatarAlt: 'Ad', title: 't', description: 'd' };

  it('defaults to the Ruy Lopez board when unset', () => {
    expect(resolveNativeThumbnail(base)).toEqual({ fen: DEFAULT_NATIVE_THUMBNAIL_FEN });
  });
  it('returns the current-shape thumbnail when present', () => {
    expect(
      resolveNativeThumbnail({
        ...base,
        thumbnail: { fen: 'x', imagePath: '/x.png', imageAlt: 'a' },
      })
    ).toEqual({ fen: 'x', imagePath: '/x.png', imageAlt: 'a' });
  });
  it('normalizes a legacy image thumbnail to an override over the default board', () => {
    const legacy = { type: 'image', imagePath: '/x.png', alt: 'a' } as unknown;
    expect(resolveNativeThumbnail({ ...base, thumbnail: legacy as never })).toEqual({
      fen: DEFAULT_NATIVE_THUMBNAIL_FEN,
      imagePath: '/x.png',
      imageAlt: 'a',
    });
  });
  it('normalizes a legacy board thumbnail to the default board', () => {
    const legacy = { type: 'board', fen: 'legacy-fen' } as unknown;
    // A legacy board carried a fen; the current shape keeps it.
    expect(resolveNativeThumbnail({ ...base, thumbnail: legacy as never })).toEqual({
      fen: 'legacy-fen',
    });
  });
});

describe('thumbnailHasImage', () => {
  it('is true only when a non-empty override image is set', () => {
    expect(thumbnailHasImage({ fen: 'x', imagePath: '/x.png' })).toBe(true);
    expect(thumbnailHasImage({ fen: 'x', imagePath: '' })).toBe(false);
    expect(thumbnailHasImage({ fen: 'x', imagePath: null })).toBe(false);
    expect(thumbnailHasImage({ fen: 'x' })).toBe(false);
  });
});
