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

  it('should insert an ad after every AD_INTERVAL items when showAds is true', () => {
    const items = createFeedItems(AD_INTERVAL * 3);
    const result = buildDisplayItems(items, true);

    // Total: items + 3 ads
    expect(result).toHaveLength(AD_INTERVAL * 3 + 3);

    // Check that ads appear at the correct positions
    let feedCount = 0;
    for (const displayItem of result) {
      if (displayItem.type === 'feed') {
        feedCount++;
      } else {
        // Each ad should appear right after AD_INTERVAL feed items
        expect(feedCount % AD_INTERVAL).toBe(0);
      }
    }
  });

  it('should assign a running 0-based adIndex to each inserted ad', () => {
    const items = createFeedItems(AD_INTERVAL * 3);
    const result = buildDisplayItems(items, true);

    const adIndexes = result
      .filter((d) => d.type === 'ad')
      .map((d) => (d as { adIndex: number }).adIndex);
    expect(adIndexes).toEqual([0, 1, 2]);
  });

  it('should not insert ads when item count is less than AD_INTERVAL', () => {
    const items = createFeedItems(AD_INTERVAL - 1);
    const result = buildDisplayItems(items, true);

    expect(result).toHaveLength(AD_INTERVAL - 1);
    expect(result.every((d) => d.type === 'feed')).toBe(true);
  });

  it('should insert an ad after exactly AD_INTERVAL items', () => {
    const items = createFeedItems(AD_INTERVAL);
    const result = buildDisplayItems(items, true);

    // AD_INTERVAL items + 1 ad
    expect(result).toHaveLength(AD_INTERVAL + 1);
    expect(result[result.length - 1].type).toBe('ad');
  });
});
