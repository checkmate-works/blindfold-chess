import { AD_INTERVAL } from './constants';
import type { DisplayItem, FeedItem } from './types';

/**
 * Build an interleaved list of feed items and ad placeholders.
 *
 * An ad slot is inserted after every `AD_INTERVAL` items, but only when
 * there is at least one native-ad creative to fill it — an empty ad slot
 * would render nothing, so it is skipped entirely rather than leaving a
 * blank gap. Each inserted ad carries a running `adIndex` the client uses to
 * rotate through the available creatives.
 *
 * @param items      - Feed items to display
 * @param adCount    - Number of native-ad creatives available (0 = no ads)
 */
export function buildDisplayItems(items: FeedItem[], adCount: number): DisplayItem[] {
  const result: DisplayItem[] = [];
  let adIndex = 0;
  items.forEach((item, index) => {
    result.push({ type: 'feed', item });
    if (adCount > 0 && (index + 1) % AD_INTERVAL === 0) {
      result.push({ type: 'ad', adIndex });
      adIndex += 1;
    }
  });
  return result;
}
