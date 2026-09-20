import { AD_INTERVAL } from '@/lib/ads/placement';

import type { DisplayItem, FeedItem } from './types';

/**
 * Build an interleaved list of feed items and ad placeholders.
 *
 * The placement rule — a slot before every `AD_INTERVAL`-th item, starting
 * with the first — is the one every vertical list on the site follows, and it
 * is explained where the constant lives (`@/lib/ads/placement`). What is
 * specific here is the shape: the feed is a client component that renders
 * from a cursor-paged array, so slots are emitted as `DisplayItem`s for the
 * client to map, rather than as the finished nodes `withRepeatingNativeAds`
 * splices into an already-rendered list.
 *
 * Leading with a slot puts one ad in the first viewport of the
 * server-rendered page; the earlier "after every `AD_INTERVAL` items"
 * placement left the first slot at the tail of the initial page — technically
 * in the SSR HTML, but a full page-length of scrolling below the fold, so the
 * most-viewed part of the feed carried no ad at all. Placing slots before an
 * item rather than after also means a page whose length is a multiple of
 * `AD_INTERVAL` never ends on an ad: the next slot appears only once the item
 * it precedes has loaded.
 *
 * Every slot this produces is filled by a native creative, so the caller must
 * pass `insertAds: false` when the pool is empty — otherwise the feed grows a
 * blank row with a divider on it. Each ad carries an `adIndex` the client uses
 * to rotate through the available creatives; it is derived from the item's
 * position rather than counted separately, so the ordinal cannot drift away
 * from the placement rule beside it. (It did once: when the rule changed from
 * "after every AD_INTERVAL-th item" to "before", the separate counter was left
 * untouched and silently changed meaning.)
 *
 * @param items      - Feed items to display
 * @param insertAds  - Whether this viewer sees ads AND there is a creative to show
 */
export function buildDisplayItems(items: FeedItem[], insertAds: boolean): DisplayItem[] {
  return items.flatMap((item, index) =>
    insertAds && index % AD_INTERVAL === 0
      ? [{ type: 'ad', adIndex: index / AD_INTERVAL } as const, { type: 'feed', item } as const]
      : [{ type: 'feed', item } as const]
  );
}
