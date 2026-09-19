import { describe, expect, it } from 'vitest';

import type { CreateAdCreativeData } from './validation';
import { validateCreateAdCreative } from './validation';

const payload = {
  avatarImagePath: null,
  avatarAlt: 'Ad',
  title: { en: 'Title' },
  description: { en: 'Description' },
};

const data = (overrides: Partial<CreateAdCreativeData> = {}): CreateAdCreativeData => ({
  slot: 'feed-native-ad',
  href: 'https://awin1.com/cread.php?awinmid=1&awinaffid=2',
  isActive: true,
  payload,
  ...overrides,
});

describe('validateCreateAdCreative href', () => {
  it('accepts an untagged network URL', () => {
    expect(validateCreateAdCreative(data())).toBeNull();
  });

  it('rejects an href that already carries a clickref', () => {
    // Awin's own UI hands out a link with a sample clickref on it. Tagging
    // skips a URL that has one, so accepting this would report every click
    // under the sample instead of this creative.
    expect(
      validateCreateAdCreative(
        data({ href: 'https://awin1.com/cread.php?awinmid=1&clickref=sample' })
      )
    ).toBe('href already carries a clickref');
  });

  it('rejects a bare path, which has no page to resolve against at render time', () => {
    expect(validateCreateAdCreative(data({ href: '/internal/page' }))).toBe('invalid href');
  });
});

describe('validateCreateAdCreative localized copy', () => {
  it('accepts copy in a subset of locales as long as en is there', () => {
    expect(
      validateCreateAdCreative(
        data({ payload: { ...payload, title: { en: 'Title', ja: 'タイトル' } } })
      )
    ).toBeNull();
  });

  it('rejects copy with no en fallback', () => {
    expect(
      validateCreateAdCreative(
        data({ payload: { ...payload, title: { ja: 'タイトル' } as never } })
      )
    ).toBe('invalid title.en');
  });

  it('rejects an unsupported locale key rather than storing something never read', () => {
    expect(
      validateCreateAdCreative(
        data({ payload: { ...payload, description: { en: 'd', fr: 'Bonjour' } as never } })
      )
    ).toBe('invalid description locale');
  });

  it('applies the length cap to every locale, not just en', () => {
    const tooLong = 'x'.repeat(2001);
    expect(
      validateCreateAdCreative(
        data({ payload: { ...payload, title: { en: 'Title', ja: tooLong } } })
      )
    ).toBe('invalid title.ja');
  });
});
