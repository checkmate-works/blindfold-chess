import { AD_INTERVAL } from './constants';
import type { DisplayItem, FeedItem } from './types';

/**
 * Build an interleaved list of feed items and ad placeholders.
 *
 * @param items       - Feed items to display
 * @param showAds     - Whether to insert ad slots
 */
export function buildDisplayItems(items: FeedItem[], showAds: boolean): DisplayItem[] {
  const result: DisplayItem[] = [];
  items.forEach((item, index) => {
    result.push({ type: 'feed', item });
    if (showAds && (index + 1) % AD_INTERVAL === 0) {
      result.push({ type: 'ad' as const });
    }
  });
  return result;
}
