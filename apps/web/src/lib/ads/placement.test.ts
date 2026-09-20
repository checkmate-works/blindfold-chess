import { describe, expect, it } from 'vitest';

import {
  AD_INTERVAL,
  singleNativeAdIndexFor,
  withRepeatingNativeAds,
  withSingleNativeAd,
} from './placement';

const cards = (n: number) => Array.from({ length: n }, (_, i) => `card-${i}`);

/** Renders an ad as a plain string so the placement is readable in a diff. */
const renderAd = (creative: string, key: string) => `${key}:${creative}`;

describe('withRepeatingNativeAds', () => {
  it('leads the list and repeats every AD_INTERVAL entries', () => {
    const result = withRepeatingNativeAds(cards(AD_INTERVAL * 2), ['a'], renderAd);

    expect(result).toEqual([
      'native-ad-0:a',
      ...cards(AD_INTERVAL),
      'native-ad-1:a',
      ...cards(AD_INTERVAL * 2).slice(AD_INTERVAL),
    ]);
  });

  it('shows exactly one card on a page shorter than the interval', () => {
    // The topic lists page at TOPIC_PAGE_SIZE entries, which is this interval,
    // so a page one shorter is the ordinary case there and not an edge.
    const result = withRepeatingNativeAds(cards(AD_INTERVAL - 1), ['a'], renderAd);
    expect(result.filter((c) => typeof c === 'string' && c.startsWith('native-ad'))).toHaveLength(
      1
    );
    expect(result[0]).toBe('native-ad-0:a');
  });

  it('never ends on an ad when the list length is a multiple of the interval', () => {
    // The slot that would precede the next entry does not exist until that
    // entry does, which is what keeps a pager from sitting under an ad.
    const result = withRepeatingNativeAds(cards(AD_INTERVAL), ['a'], renderAd);
    expect(result).toHaveLength(AD_INTERVAL + 1);
    expect(result[result.length - 1]).toBe(`card-${AD_INTERVAL - 1}`);
  });

  it('rotates through the pool by slot ordinal', () => {
    const result = withRepeatingNativeAds(cards(AD_INTERVAL * 4), ['a', 'b'], renderAd);
    const ads = result.filter((c): c is string => typeof c === 'string' && c.includes('native-ad'));
    expect(ads).toEqual(['native-ad-0:a', 'native-ad-1:b', 'native-ad-2:a', 'native-ad-3:b']);
  });

  it('returns the cards untouched when the pool is empty', () => {
    // How an ad-free reader and an unfilled slot both arrive.
    expect(withRepeatingNativeAds(cards(10), [], renderAd)).toEqual(cards(10));
  });

  it('leaves an empty list empty rather than making it a lone ad', () => {
    expect(withRepeatingNativeAds([], ['a'], renderAd)).toEqual([]);
  });
});

describe('singleNativeAdIndexFor', () => {
  it('follows the entry at the interval once the list is long enough', () => {
    expect(singleNativeAdIndexFor(20)).toBe(AD_INTERVAL);
  });

  it('clamps to the last entry on a shorter list', () => {
    expect(singleNativeAdIndexFor(3)).toBe(2);
    expect(singleNativeAdIndexFor(1)).toBe(0);
  });
});

describe('withSingleNativeAd', () => {
  it('places one ad after the entry at the interval, never at the head', () => {
    const result = withSingleNativeAd(cards(20), 'ad');
    expect(result.indexOf('ad')).toBe(AD_INTERVAL + 1);
    expect(result.filter((c) => c === 'ad')).toHaveLength(1);
  });

  it('places the ad last on a short list', () => {
    expect(withSingleNativeAd(cards(3), 'ad')).toEqual(['card-0', 'card-1', 'card-2', 'ad']);
  });

  it('inserts exactly one ad however long the list is', () => {
    expect(withSingleNativeAd(cards(50), 'ad').filter((c) => c === 'ad')).toHaveLength(1);
  });

  it('returns the cards untouched when there is no ad to place', () => {
    expect(withSingleNativeAd(cards(10), null)).toEqual(cards(10));
  });

  it('adds nothing to an empty list', () => {
    expect(withSingleNativeAd([], 'ad')).toEqual([]);
  });
});
