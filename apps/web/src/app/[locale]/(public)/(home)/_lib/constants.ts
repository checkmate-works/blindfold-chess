/**
 * Number of feed items between consecutive in-feed ad slots. The first slot
 * leads the feed (before item 1); the next precedes item `AD_INTERVAL + 1`,
 * and so on — see `buildDisplayItems`.
 *
 * The leading slot is not an artefact of the interval and is not negotiable
 * against it: raising `AD_INTERVAL` thins the feed further down but leaves the
 * first card exactly where it is, and that card is the one most readers
 * actually see. Deciding the two separately is the point — density below the
 * fold is what this number controls, and it is set to 5 so a reader scrolling
 * the timeline meets a card about as often as they meet one on a list page.
 *
 * Not configurable from `/admin/ads`, deliberately for now: a number that can
 * be changed per environment is a number nobody can reason about from the
 * code, and there is no measurement yet that would justify moving it at
 * runtime. The admin owns which creatives run; the shape of the feed stays
 * here.
 *
 * The `5` is unrelated to `NATIVE_AD_AFTER_INDEX` in
 * `@/lib/ads/in-list-placement`, which happens to be 5 as well. That one is a
 * 0-based position within a single paginated page ("after the sixth entry"),
 * this one is a repeat interval on a list with no end. They answer different
 * questions and must not be collapsed into one constant.
 *
 * @design Ad rows are interleaved at render time rather than stored in
 * feed_items, because ad display is presentation logic, not user activity.
 * No ads appear when the viewer is ad-free or the slot's creative pool is
 * empty — see `buildDisplayItems`.
 */
export const AD_INTERVAL = 5;
