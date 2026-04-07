/**
 * Number of feed items between each in-feed ad insertion.
 *
 * @design Ads (AdSenseInFeed) are interleaved rather than stored in
 * feed_items because ad display is presentation logic, not user activity.
 * When `showAds` is false, no ads appear.
 */
export const AD_INTERVAL = 5;
