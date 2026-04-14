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
    const items = createFeedItems(10);
    const result = buildDisplayItems(items, false);

    expect(result).toHaveLength(10);
    expect(result.every((d) => d.type === 'feed')).toBe(true);
  });

  it('should insert an ad after every AD_INTERVAL items', () => {
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

  it('should not insert ads when item count is less than AD_INTERVAL', () => {
    const items = createFeedItems(AD_INTERVAL - 1);
    const result = buildDisplayItems(items, true);

    expect(result).toHaveLength(AD_INTERVAL - 1);
    expect(result.every((d) => d.type === 'feed')).toBe(true);
  });

  it('should continue ad cadence correctly with indexOffset', () => {
    // Simulate: SSR rendered 3 items (indices 0,1,2).
    // Client loads 2 more items with offset=3 (global indices 3,4).
    // Global index 4 → (4+1)=5 → 5 % AD_INTERVAL === 0 → ad inserted.
    const items = createFeedItems(2);
    const offset = AD_INTERVAL - 2; // e.g. if AD_INTERVAL=5, offset=3

    const result = buildDisplayItems(items, true, offset);

    // 2 feed items + 1 ad (at global index AD_INTERVAL-1)
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('feed');
    expect(result[1].type).toBe('feed');
    expect(result[2].type).toBe('ad');
  });

  it('should default indexOffset to 0 and work correctly', () => {
    const items = createFeedItems(AD_INTERVAL);

    // Without explicit offset (defaults to 0)
    const result = buildDisplayItems(items, true);

    // AD_INTERVAL items + 1 ad
    expect(result).toHaveLength(AD_INTERVAL + 1);
    expect(result[result.length - 1].type).toBe('ad');
  });
});
