import { describe, expect, it } from 'vitest';

import { AD_INTERVAL } from './constants';
import { buildDisplayItems } from './feed-display';
import type { FeedItem } from './types';

// --- Helpers ---

function createFeedItem(id: string): FeedItem {
  return {
    id,
    entityType: 'topic_post',
    entityId: `entity-${id}`,
    actorId: `actor-${id}`,
    createdAt: '2025-01-01T00:00:00.000Z',
    data: {},
  } as unknown as FeedItem;
}

function createFeedItems(count: number): FeedItem[] {
  return Array.from({ length: count }, (_, i) => createFeedItem(`item-${i}`));
}

// --- Tests ---

describe('buildDisplayItems', () => {
  it('should return an empty array when items is empty', () => {
    const result = buildDisplayItems([], true);
    expect(result).toEqual([]);
  });

  it('should return only feed items when showAds is false', () => {
    const items = createFeedItems(AD_INTERVAL * 2);
    const result = buildDisplayItems(items, false);

    expect(result).toHaveLength(AD_INTERVAL * 2);
    expect(result.every((d) => d.type === 'feed')).toBe(true);
  });

  it('should place an ad before every AD_INTERVAL-th item, starting with the first', () => {
    const items = createFeedItems(AD_INTERVAL * 3);
    const result = buildDisplayItems(items, true);

    // Total: items + 3 ads (before item 1, item AD_INTERVAL+1, item 2*AD_INTERVAL+1)
    expect(result).toHaveLength(AD_INTERVAL * 3 + 3);
    expect(result[0].type).toBe('ad');

    // Every ad is followed by a feed item, and the feed items seen so far are
    // always a multiple of AD_INTERVAL when an ad appears.
    let feedCount = 0;
    result.forEach((displayItem, i) => {
      if (displayItem.type === 'feed') {
        feedCount++;
      } else {
        expect(feedCount % AD_INTERVAL).toBe(0);
        expect(result[i + 1]?.type).toBe('feed');
      }
    });
  });

  it('should assign a running 0-based adIndex to each inserted ad', () => {
    const items = createFeedItems(AD_INTERVAL * 3);
    const result = buildDisplayItems(items, true);

    const adIndexes = result
      .filter((d) => d.type === 'ad')
      .map((d) => (d as { adIndex: number }).adIndex);
    expect(adIndexes).toEqual([0, 1, 2]);
  });

  it('should lead with a single ad when item count is less than AD_INTERVAL', () => {
    const items = createFeedItems(AD_INTERVAL - 1);
    const result = buildDisplayItems(items, true);

    expect(result).toHaveLength(AD_INTERVAL);
    expect(result[0].type).toBe('ad');
    expect(result.slice(1).every((d) => d.type === 'feed')).toBe(true);
  });

  it('should not end on an ad when item count is exactly AD_INTERVAL', () => {
    // The second slot precedes item AD_INTERVAL+1, which has not loaded yet,
    // so an initial page of exactly AD_INTERVAL items carries only the
    // leading ad and never finishes on an empty-looking slot.
    const items = createFeedItems(AD_INTERVAL);
    const result = buildDisplayItems(items, true);

    expect(result).toHaveLength(AD_INTERVAL + 1);
    expect(result[0].type).toBe('ad');
    expect(result[result.length - 1].type).toBe('feed');
  });
});
