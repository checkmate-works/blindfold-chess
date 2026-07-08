import { describe, expect, it } from 'vitest';

import {
  DEFAULT_NATIVE_THUMBNAIL_FEN,
  isNativeCardPayload,
  isNativeCardThumbnail,
  resolveNativeThumbnail,
} from './payload';

describe('isNativeCardThumbnail', () => {
  it('accepts a board thumbnail', () => {
    expect(isNativeCardThumbnail({ type: 'board', fen: 'startpos' })).toBe(true);
  });
  it('accepts an image thumbnail', () => {
    expect(isNativeCardThumbnail({ type: 'image', imagePath: '/x.png', alt: 'a' })).toBe(true);
  });
  it('rejects malformed thumbnails', () => {
    expect(isNativeCardThumbnail({ type: 'board' })).toBe(false);
    expect(isNativeCardThumbnail({ type: 'image', imagePath: '/x.png' })).toBe(false);
    expect(isNativeCardThumbnail({ type: 'video', src: 'x' })).toBe(false);
    expect(isNativeCardThumbnail(null)).toBe(false);
  });
});

describe('isNativeCardPayload with thumbnail', () => {
  const base = { avatarImagePath: null, avatarAlt: 'Ad', title: 't', description: 'd' };

  it('accepts a payload with no thumbnail (backward compatible)', () => {
    expect(isNativeCardPayload(base)).toBe(true);
  });
  it('accepts a valid thumbnail', () => {
    expect(isNativeCardPayload({ ...base, thumbnail: { type: 'board', fen: 'x' } })).toBe(true);
  });
  it('rejects an invalid thumbnail', () => {
    expect(isNativeCardPayload({ ...base, thumbnail: { type: 'image', imagePath: 5 } })).toBe(
      false
    );
  });
});

describe('resolveNativeThumbnail', () => {
  const base = { avatarImagePath: null, avatarAlt: 'Ad', title: 't', description: 'd' };

  it('defaults to the Ruy Lopez board when unset', () => {
    expect(resolveNativeThumbnail(base)).toEqual({
      type: 'board',
      fen: DEFAULT_NATIVE_THUMBNAIL_FEN,
    });
  });
  it('returns the configured thumbnail when present', () => {
    const thumb = { type: 'image' as const, imagePath: '/x.png', alt: 'a' };
    expect(resolveNativeThumbnail({ ...base, thumbnail: thumb })).toBe(thumb);
  });
});
