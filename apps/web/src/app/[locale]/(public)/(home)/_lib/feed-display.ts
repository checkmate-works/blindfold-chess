import type { AdBannerConfig } from '@/lib/ad';

import { AD_INTERVAL } from './constants';
import type { DisplayItem, FeedItem } from './types';

/**
 * Build an interleaved list of feed items and native ads.
 *
 * @param items      - Feed items to display
 * @param adBanners  - Available ad banners (empty = no ads)
 * @param indexOffset - Number of items already rendered (e.g. by SSR),
 *                      so the ad cadence continues seamlessly.
 */
export function buildDisplayItems(
  items: FeedItem[],
  adBanners: AdBannerConfig[],
  indexOffset = 0
): DisplayItem[] {
  const result: DisplayItem[] = [];
  items.forEach((item, index) => {
    result.push({ type: 'feed', item });
    const globalIndex = indexOffset + index;
    if (adBanners.length > 0 && (globalIndex + 1) % AD_INTERVAL === 0) {
      const adIndex = Math.floor(globalIndex / AD_INTERVAL) % adBanners.length;
      result.push({ type: 'ad', ad: adBanners[adIndex] });
    }
  });
  return result;
}
