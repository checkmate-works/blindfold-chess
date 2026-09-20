import type { ReactNode } from 'react';

/**
 * Where the one native ad card goes in a paginated list, and the only rule
 * every such surface shares.
 *
 * A list that ends at a pager gets exactly one card. The infinite home
 * timeline is the other shape and keeps its own rule — `buildDisplayItems`
 * repeats a card every `AD_INTERVAL` items, which only makes sense because
 * that list has no end to reach. Applying the repeating rule to a five-entry
 * page would put two ads in five rows.
 */

/** 0-based index of the list entry the card follows on a full page. */
export const NATIVE_AD_AFTER_INDEX = 5;

/**
 * The index the card follows in a list of `length` entries: the constant
 * above, or the last entry when the page holds fewer than that.
 *
 * Clamping rather than dropping the card is what makes the rule usable at
 * all: the topic lists page at five entries (`TOPIC_PAGE_SIZE`), so an
 * unclamped "after the sixth" would place an ad on no page in the section.
 */
export function nativeAdIndexFor(length: number): number {
  return Math.min(NATIVE_AD_AFTER_INDEX, length - 1);
}

/**
 * `cards` with `ad` spliced in at {@link nativeAdIndexFor}.
 *
 * A null `ad` — no creative in the slot's pool, or a viewer the server
 * entitlement gate already excluded — returns the cards untouched, so no call
 * site needs its own conditional around the placement. The ad node must carry
 * its own `key`, as the surrounding cards do.
 */
export function withNativeAdCard(cards: readonly ReactNode[], ad: ReactNode | null): ReactNode[] {
  if (ad === null || cards.length === 0) return [...cards];

  const at = nativeAdIndexFor(cards.length);
  return [...cards.slice(0, at + 1), ad, ...cards.slice(at + 1)];
}
