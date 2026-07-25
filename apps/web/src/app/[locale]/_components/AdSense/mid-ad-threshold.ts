/**
 * Minimum number of cards a catalog/feed list must show before the mid-page
 * (`content-middle`) ad is placed under the tab row. Below this the list is
 * short enough that `content-bottom` is already near the fold, so a second ad
 * would only crowd it. Shared by the topics feed and the chunks / repertoires
 * catalogs so the threshold stays in sync.
 */
export const CATALOG_MIN_CARDS_FOR_MID_AD = 3;
