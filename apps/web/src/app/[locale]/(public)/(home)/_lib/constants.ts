/**
 * Number of feed items between consecutive in-feed ad slots. The first slot
 * leads the feed (before item 1); the next precedes item `AD_INTERVAL + 1`,
 * and so on — see `buildDisplayItems`.
 *
 * @design Ads (AdSenseInFeed) are interleaved rather than stored in
 * feed_items because ad display is presentation logic, not user activity.
 * When `showAds` is false, no ads appear.
 */
export const AD_INTERVAL = 10;
