import type { ReactNode } from 'react';

/**
 * Number of entries between consecutive native ad slots, everywhere a list of
 * cards is stacked vertically: the home timeline, `/topics`, the topic
 * catalogs and threads, the glossary term lists, the puzzle and
 * position-memory lists, and both game lists (the viewer's own and the
 * public gallery).
 *
 * The first slot leads the list (before entry 1); the next precedes entry
 * `AD_INTERVAL + 1`, and so on. The leading slot is a separate decision from
 * this number and not negotiable against it: raising the interval thins the
 * list further down but leaves the first card exactly where it is, and that
 * card is the one most readers actually see. So one choice governs the
 * opening, and this one governs the density below it.
 *
 * It is one number for every vertical list on purpose. The rule used to be
 * split — the infinite timeline repeated, and a paginated list got exactly
 * one card after its sixth entry — on the reasoning that a repeating rule
 * would crowd a short page. At an interval of 5 that reasoning no longer
 * holds: a five-entry topic page gets one card, the same as before, and it
 * now sits where the reader meets it rather than below the last post. Two
 * rules meant a reader moving between surfaces met ads on two different
 * rhythms, and a change to either one silently only half-applied.
 *
 * `/practice` is the one surface that does not take this rule
 * ({@link withSingleNativeAd}), because its cards are a two-column grid of
 * practice modules rather than a column of things to read.
 *
 * Not configurable from `/admin/ads`, deliberately for now: a number that can
 * be changed per environment is a number nobody can reason about from the
 * code, and there is no measurement yet that would justify moving it at
 * runtime. The admin owns which creatives run; the shape of a list stays
 * here.
 *
 * @design Ad rows are interleaved at render time rather than stored
 * alongside the content, because ad display is presentation logic, not user
 * activity. Nothing is interleaved when the viewer is ad-free or the slot's
 * creative pool is empty — both reach these helpers as an empty pool.
 */
export const AD_INTERVAL = 5;

/**
 * `cards` with a native ad spliced in before every `AD_INTERVAL`-th entry,
 * starting with the first: `[ad, 1..5, ad, 6..10, ...]`.
 *
 * Placing a slot *before* an entry rather than after it is what keeps a page
 * whose length is a multiple of `AD_INTERVAL` from ending on an ad — the next
 * slot appears only once the entry it precedes exists. On an infinite feed
 * that means the slot arrives with the page that fills it; on a paginated one
 * it means the last thing above the pager is always content.
 *
 * `creatives` rotate by slot ordinal, so a pool of one repeats and a pool of
 * three cycles. The ordinal is derived from the entry's position rather than
 * counted separately, so it cannot drift away from the placement rule beside
 * it. (It did once, in the feed's copy of this logic: the rule changed from
 * "after every Nth entry" to "before" and the separate counter was left
 * alone, silently changing meaning.)
 *
 * An empty pool returns the cards untouched — that is how an ad-free reader
 * and an unfilled slot both arrive — so no call site needs its own
 * conditional. An empty list stays empty rather than becoming a lone ad.
 */
export function withRepeatingNativeAds<T>(
  cards: readonly ReactNode[],
  creatives: readonly T[],
  renderAd: (creative: T, key: string) => ReactNode
): ReactNode[] {
  if (creatives.length === 0 || cards.length === 0) return [...cards];

  return cards.flatMap((card, index) => {
    if (index % AD_INTERVAL !== 0) return [card];
    const adIndex = index / AD_INTERVAL;
    return [renderAd(creatives[adIndex % creatives.length], `native-ad-${adIndex}`), card];
  });
}

/**
 * 0-based index of the entry the single card follows: the entry at
 * {@link AD_INTERVAL}, or the last one when the list is shorter than that.
 *
 * Clamping rather than dropping the card is what makes the rule usable at
 * all — a grid filtered down to three tiles would otherwise show nothing.
 */
export function singleNativeAdIndexFor(length: number): number {
  return Math.min(AD_INTERVAL, length - 1);
}

/**
 * `cards` with exactly one `ad` spliced in at {@link singleNativeAdIndexFor},
 * and never at the head of the list.
 *
 * This is `/practice`'s rule, and it is the exception to
 * {@link withRepeatingNativeAds} rather than a second policy. The grid is a
 * two-column menu of practice modules, not a column of things to read: the
 * repeating rule would make roughly a fifth of the menu advertising, and its
 * leading slot would put a creative where the first module belongs. One tile,
 * a screenful in, is as much as a navigation surface carries.
 *
 * A null `ad` — no creative in the slot's pool, or an ad-free viewer —
 * returns the cards untouched. The ad node must carry its own `key`, as the
 * surrounding cards do.
 */
export function withSingleNativeAd(cards: readonly ReactNode[], ad: ReactNode | null): ReactNode[] {
  if (ad === null || cards.length === 0) return [...cards];

  const at = singleNativeAdIndexFor(cards.length);
  return [...cards.slice(0, at + 1), ad, ...cards.slice(at + 1)];
}
