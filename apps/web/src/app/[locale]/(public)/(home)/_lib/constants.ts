/**
 * Number of feed items between each native ad insertion.
 *
 * @design Native ads (NativeAdCard) are interleaved rather than stored in
 * feed_items because ad display is presentation logic, not user activity.
 * Ads cycle through the `adBanners` array via modulo indexing. When
 * `adBanners` is empty (ads disabled or none active), no ads appear.
 */
export const AD_INTERVAL = 5;
