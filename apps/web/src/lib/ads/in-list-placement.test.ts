import { describe, expect, it } from 'vitest';

import { NATIVE_AD_AFTER_INDEX, nativeAdIndexFor, withNativeAdCard } from './in-list-placement';

const cards = (n: number) => Array.from({ length: n }, (_, i) => `card-${i}`);

describe('nativeAdIndexFor', () => {
  it('follows the configured entry once the page is long enough', () => {
    expect(nativeAdIndexFor(20)).toBe(NATIVE_AD_AFTER_INDEX);
  });

  it('clamps to the last entry on a page shorter than that', () => {
    // The topic lists page at five entries, so this is the common case there,
    // not an edge: unclamped, they would never show a card at all.
    expect(nativeAdIndexFor(5)).toBe(4);
    expect(nativeAdIndexFor(1)).toBe(0);
  });
});

describe('withNativeAdCard', () => {
  it('places the ad after the configured entry', () => {
    expect(withNativeAdCard(cards(10), 'ad')).toEqual([
      'card-0',
      'card-1',
      'card-2',
      'card-3',
      'card-4',
      'card-5',
      'ad',
      'card-6',
      'card-7',
      'card-8',
      'card-9',
    ]);
  });

  it('places the ad last on a short page', () => {
    expect(withNativeAdCard(cards(3), 'ad')).toEqual(['card-0', 'card-1', 'card-2', 'ad']);
  });

  it('inserts exactly one ad however long the list is', () => {
    expect(withNativeAdCard(cards(50), 'ad').filter((c) => c === 'ad')).toHaveLength(1);
  });

  it('returns the cards untouched when there is no ad to place', () => {
    expect(withNativeAdCard(cards(10), null)).toEqual(cards(10));
  });

  it('adds nothing to an empty list', () => {
    expect(withNativeAdCard([], 'ad')).toEqual([]);
  });
});
