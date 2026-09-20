import { describe, expect, it } from 'vitest';

import {
  DEFAULT_NATIVE_THUMBNAIL_FEN,
  fromLocalizedCopyDraft,
  isNativeCardPayload,
  isNativeTilePayload,
  isPayloadForKind,
  resolveNativeCopy,
  resolveNativeThumbnail,
  toLocalizedCopyDraft,
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
  const base = {
    avatarImagePath: null,
    avatarAlt: 'Ad',
    title: { en: 't' },
    description: { en: 'd' },
  };

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
  const native = { avatarImagePath: null, avatarAlt: 'Ad', title: 't', description: 'd' };

  it('dispatches to the guard matching the kind', () => {
    expect(isPayloadForKind('native_card', native)).toBe(true);
  });
  it('rejects a payload that is not shaped for the kind', () => {
    expect(isPayloadForKind('native_card', { imagePath: '/x.png', alt: 'a' })).toBe(false);
  });
});

describe('isNativeCardPayload copy shapes', () => {
  const base = { avatarImagePath: null, avatarAlt: 'Ad' };

  it('accepts per-locale copy carrying en', () => {
    expect(
      isNativeCardPayload({ ...base, title: { en: 't', ja: 'タ' }, description: { en: 'd' } })
    ).toBe(true);
  });
  it('accepts the legacy bare string still in the DB', () => {
    expect(isNativeCardPayload({ ...base, title: 't', description: 'd' })).toBe(true);
  });
  it('rejects per-locale copy with no en fallback', () => {
    expect(isNativeCardPayload({ ...base, title: { ja: 'タ' }, description: { en: 'd' } })).toBe(
      false
    );
  });
});

describe('resolveNativeCopy', () => {
  const base = { avatarImagePath: null, avatarAlt: 'Ad' } as const;

  it("returns the locale's own copy when it exists", () => {
    const payload = { ...base, title: { en: 't', ja: 'タ' }, description: { en: 'd', ja: 'デ' } };
    expect(resolveNativeCopy(payload, 'ja')).toEqual({ title: 'タ', description: 'デ' });
  });

  it('falls back to en for a locale the admin left blank', () => {
    const payload = { ...base, title: { en: 't', ja: 'タ' }, description: { en: 'd' } };
    expect(resolveNativeCopy(payload, 'ja')).toEqual({ title: 'タ', description: 'd' });
  });

  it('reads a legacy bare string as en, so old rows keep rendering', () => {
    const legacy = { ...base, title: 't', description: 'd' } as never;
    expect(resolveNativeCopy(legacy, 'pt-BR')).toEqual({ title: 't', description: 'd' });
  });
});

describe('localized copy drafts', () => {
  it('spreads a legacy bare string into en and leaves the rest blank', () => {
    expect(toLocalizedCopyDraft('t')).toEqual({ en: 't', es: '', 'pt-BR': '', ja: '' });
  });

  it('does not pre-fill unwritten locales with the en fallback', () => {
    expect(toLocalizedCopyDraft({ en: 't', ja: 'タ' })).toEqual({
      en: 't',
      es: '',
      'pt-BR': '',
      ja: 'タ',
    });
  });

  it('drops blank locales on the way back so they keep falling back to en', () => {
    expect(fromLocalizedCopyDraft({ en: ' t ', es: '', 'pt-BR': '  ', ja: 'タ' })).toEqual({
      en: 't',
      ja: 'タ',
    });
  });
});

describe('isNativeTilePayload', () => {
  const valid = {
    icon: '♞',
    title: { en: 'Master the Ruy Lopez' },
    description: { en: 'A closer look at a very old opening.' },
  };

  it('accepts a tile with an icon and both copy fields', () => {
    expect(isNativeTilePayload(valid)).toBe(true);
  });

  it('rejects a tile with no icon', () => {
    // An empty icon is not a tile with a blank corner — it is a title that
    // starts where every neighbouring tile's emoji does.
    expect(isNativeTilePayload({ ...valid, icon: '' })).toBe(false);
    expect(isNativeTilePayload({ title: valid.title, description: valid.description })).toBe(false);
  });

  it('rejects a card payload, which carries no icon', () => {
    expect(
      isNativeTilePayload({
        avatarImagePath: null,
        avatarAlt: 'Ad',
        title: valid.title,
        description: valid.description,
      })
    ).toBe(false);
  });

  it('accepts a malformed thumbnail, which is normalized at read time', () => {
    expect(isNativeTilePayload({ ...valid, thumbnail: { type: 'board' } })).toBe(true);
  });
});
