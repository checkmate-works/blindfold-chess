import { describe, expect, it } from 'vitest';

import { PLACEHOLDER_AD_HREF } from '@/lib/ads/placeholder';

import type { AdCreativeFields, CreateAdCreativeData } from './validation';
import { validateCreateAdCreative } from './validation';

const card: AdCreativeFields = {
  href: 'https://awin1.com/cread.php?awinmid=1&awinaffid=2',
  isActive: true,
  icon: null,
  avatarImagePath: null,
  avatarAlt: null,
  thumbnail: { fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3' },
  title: { en: 'Title' },
  description: { en: 'Description' },
};

const tile: AdCreativeFields = { ...card, icon: '♞' };

const data = (
  fields: AdCreativeFields,
  overrides: Partial<CreateAdCreativeData> = {}
): CreateAdCreativeData => ({ slot: 'feed-native-ad', ...fields, ...overrides });

describe('validateCreateAdCreative href', () => {
  it('accepts an untagged network URL', () => {
    expect(validateCreateAdCreative(data(card))).toBeNull();
  });

  it('rejects an href that already carries a clickref', () => {
    // Awin's own UI hands out a link with a sample clickref on it. Tagging
    // skips a URL that has one, so accepting this would report every click
    // under the sample instead of this creative.
    expect(
      validateCreateAdCreative(
        data(card, { href: 'https://awin1.com/cread.php?awinmid=1&clickref=sample' })
      )
    ).toBe('href already carries a clickref');
  });

  it('rejects a bare path, which has no page to resolve against at render time', () => {
    expect(validateCreateAdCreative(data(card, { href: '/internal/page' }))).toBe('invalid href');
  });
});

describe('validateCreateAdCreative native_thumb', () => {
  const thumbData = (overrides: Partial<AdCreativeFields> = {}): CreateAdCreativeData =>
    data({ ...card, ...overrides }, { slot: 'puzzle-result-native-ad' });

  it('accepts a thumb with no emoji and no author row', () => {
    expect(validateCreateAdCreative(thumbData())).toBeNull();
  });

  it('rejects an emoji, which the shape has nowhere to draw', () => {
    expect(validateCreateAdCreative(thumbData({ icon: '♞' }))).toBe('invalid icon');
  });

  it('rejects an author row, which the shape has nowhere to draw', () => {
    expect(validateCreateAdCreative(thumbData({ avatarImagePath: '/a.png' }))).toBe(
      'invalid avatar'
    );
  });

  it('still requires a description, because the en translation row must be complete', () => {
    // `ad_creative_translations_chk_en_complete` holds the en row to both
    // fields; the thumb tile never draws this one.
    expect(validateCreateAdCreative(thumbData({ description: { en: '' } }))).toBe(
      'invalid description.en'
    );
  });
});

describe('validateCreateAdCreative activation', () => {
  it('rejects a creative activated while its href is still the placeholder', () => {
    // The seed ships one such creative per slot so the admin has an example
    // of the slot's card to edit; the click has to be replaced before it can
    // go anywhere near a reader.
    expect(
      validateCreateAdCreative(data(card, { href: PLACEHOLDER_AD_HREF, isActive: true }))
    ).toBe('href is still the placeholder');
  });

  it('accepts the same creative while it is inactive', () => {
    expect(
      validateCreateAdCreative(data(card, { href: PLACEHOLDER_AD_HREF, isActive: false }))
    ).toBeNull();
  });

  it('accepts a real destination on an active creative', () => {
    expect(validateCreateAdCreative(data(card, { isActive: true }))).toBeNull();
  });
});

describe('validateCreateAdCreative localized copy', () => {
  it('accepts copy in a subset of locales as long as en is there', () => {
    expect(
      validateCreateAdCreative(data(card, { title: { en: 'Title', ja: 'タイトル' } }))
    ).toBeNull();
  });

  it('rejects copy with no en fallback', () => {
    expect(validateCreateAdCreative(data(card, { title: { ja: 'タイトル' } as never }))).toBe(
      'invalid title.en'
    );
  });

  it('rejects an unsupported locale key rather than storing something never read', () => {
    expect(
      validateCreateAdCreative(data(card, { description: { en: 'd', fr: 'Bonjour' } as never }))
    ).toBe('invalid description locale');
  });

  it('applies the length cap to every locale, not just en', () => {
    const tooLong = 'x'.repeat(2001);
    expect(validateCreateAdCreative(data(card, { title: { en: 'Title', ja: tooLong } }))).toBe(
      'invalid title.ja'
    );
  });
});

describe('validateCreateAdCreative fields for kind', () => {
  // The slot decides the kind: `feed-native-ad` binds a card,
  // `practice-grid-native-ad` a tile. These mirror
  // `ad_creatives_chk_fields_for_kind`, so the admin sees a field name
  // rather than a constraint name.
  it('rejects an emoji on a card', () => {
    expect(validateCreateAdCreative(data(card, { icon: '♞' }))).toBe('invalid icon');
  });

  it('requires an emoji on a tile', () => {
    expect(validateCreateAdCreative(data(tile, { slot: 'practice-grid-native-ad' }))).toBeNull();
    expect(
      validateCreateAdCreative(data(tile, { slot: 'practice-grid-native-ad', icon: '  ' }))
    ).toBe('invalid icon');
  });

  it('rejects an author row on a tile', () => {
    expect(
      validateCreateAdCreative(
        data(tile, { slot: 'practice-grid-native-ad', avatarImagePath: '/a.png', avatarAlt: 'a' })
      )
    ).toBe('invalid avatar');
  });

  it('rejects a blank thumbnail board', () => {
    expect(validateCreateAdCreative(data(card, { thumbnail: { fen: ' ' } }))).toBe(
      'invalid thumbnail fen'
    );
  });
});
