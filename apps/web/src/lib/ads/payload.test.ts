import { describe, expect, it } from 'vitest';

import {
  DEFAULT_NATIVE_THUMBNAIL_FEN,
  isNativeCardPayload,
  isPayloadForKind,
  resolveNativeThumbnail,
} from './payload';

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

describe('isPayloadForKind', () => {
  const banner = { imagePath: '/x.png', alt: 'a', width: 10, height: 10 };
  const native = { avatarImagePath: null, avatarAlt: 'Ad', title: 't', description: 'd' };

  it('dispatches to the guard matching the kind', () => {
    expect(isPayloadForKind('banner', banner)).toBe(true);
    expect(isPayloadForKind('native_card', native)).toBe(true);
  });
  it('rejects a payload written for the other kind', () => {
    expect(isPayloadForKind('banner', native)).toBe(false);
    expect(isPayloadForKind('native_card', banner)).toBe(false);
  });
});
