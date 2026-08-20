import { AD_INTERVAL } from './constants';
import type { DisplayItem, FeedItem } from './types';

/**
 * Build an interleaved list of feed items and ad placeholders.
 *
 * An ad slot is placed BEFORE every `AD_INTERVAL`-th item, starting with the
 * very first one, whenever ads are shown for this viewer: `[ad, 1..10, ad,
 * 11..20, ad, ...]`. Leading with a slot puts one ad in the first viewport of
 * the server-rendered page; the earlier "after every `AD_INTERVAL` items"
 * placement left the first slot at the tail of the initial page — technically
 * in the SSR HTML, but a full page-length of scrolling below the fold, so the
 * most-viewed part of the feed carried no ad at all. Placing slots before an
 * item rather than after also means a page whose length is a multiple of
 * `AD_INTERVAL` never ends on an ad: the next slot appears only once the item
 * it precedes has loaded.
 *
 * The slot is always filled — by the highest-priority admin-configured native
 * creative if one exists, otherwise by the AdSense fallback — so insertion
 * depends only on `showAds`, not on whether a creative happens to be
 * configured. Each ad carries an `adIndex` the client uses to rotate through
 * the available creatives; it is derived from the item's position rather than
 * counted separately, so the ordinal cannot drift away from the placement
 * rule beside it. (It did once: when the rule changed from "after every
 * AD_INTERVAL-th item" to "before", the separate counter was left untouched
 * and silently changed meaning.)
 *
 * @param items    - Feed items to display
 * @param showAds  - Whether this viewer sees ads at all
 */
export function buildDisplayItems(items: FeedItem[], showAds: boolean): DisplayItem[] {
  return items.flatMap((item, index) =>
    showAds && index % AD_INTERVAL === 0
      ? [{ type: 'ad', adIndex: index / AD_INTERVAL } as const, { type: 'feed', item } as const]
      : [{ type: 'feed', item } as const]
  );
}
