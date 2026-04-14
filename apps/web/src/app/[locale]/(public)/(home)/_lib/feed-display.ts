import { AD_INTERVAL } from './constants';
import type { DisplayItem, FeedItem } from './types';

/**
 * Build an interleaved list of feed items and ad placeholders.
 *
 * @param items       - Feed items to display
 * @param showAds     - Whether to insert ad slots
 * @param indexOffset  - Number of items already rendered (e.g. by SSR),
 *                       so the ad cadence continues seamlessly.
 */
export function buildDisplayItems(
  items: FeedItem[],
  showAds: boolean,
  indexOffset = 0
): DisplayItem[] {
  const result: DisplayItem[] = [];
  items.forEach((item, index) => {
    result.push({ type: 'feed', item });
    const globalIndex = indexOffset + index;
    if (showAds && (globalIndex + 1) % AD_INTERVAL === 0) {
      result.push({ type: 'ad' as const });
    }
  });
  return result;
}
