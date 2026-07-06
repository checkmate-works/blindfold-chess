import { AD_INTERVAL } from './constants';
import type { DisplayItem, FeedItem } from './types';

/**
 * Build an interleaved list of feed items and ad placeholders.
 *
 * An ad slot is inserted after every `AD_INTERVAL` items whenever ads are
 * shown for this viewer. The slot is always filled — by the highest-priority
 * admin-configured native creative if one exists, otherwise by the AdSense
 * fallback — so insertion depends only on `showAds`, not on whether a
 * creative happens to be configured. Each ad carries a running `adIndex` the
 * client uses to rotate through the available creatives.
 *
 * @param items    - Feed items to display
 * @param showAds  - Whether this viewer sees ads at all
 */
export function buildDisplayItems(items: FeedItem[], showAds: boolean): DisplayItem[] {
  const result: DisplayItem[] = [];
  let adIndex = 0;
  items.forEach((item, index) => {
    result.push({ type: 'feed', item });
    if (showAds && (index + 1) % AD_INTERVAL === 0) {
      result.push({ type: 'ad', adIndex });
      adIndex += 1;
    }
  });
  return result;
}
