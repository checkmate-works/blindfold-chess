'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { NativeAdView } from '@/lib/ads/ad';

import type { EngagementCounterSize } from '@/app/[locale]/_components/EngagementCounter';
import { NativeAdCard } from '@/app/[locale]/_components/NativeAdCard';

import { getFeed } from '../_actions/getFeed';
import type { FeedScope } from '../_actions/getFeed';
import { buildDisplayItems } from '../_lib/feed-display';
import type { DisplayItem, FeedItem, FeedResponse } from '../_lib/types';
import { FeedCard } from './FeedCard';
import { FeedSkeleton } from './FeedSkeleton';

type Props = {
  /**
   * Initial feed items rendered server-side for SEO. Because this component
   * is a Client Component, Next.js still emits the initial HTML on the server,
   * so Googlebot receives real content while the browser hydrates into a
   * single scrolling list. Keeping SSR and infinite-scroll items in one
   * container lets `last:border-b-0` correctly target the visually-last item.
   *
   * SEEDS STATE ONCE — a later value for this prop is ignored, because the
   * list it feeds is owned by `useState` from then on (infinite scroll appends
   * to it). A surface that re-renders this component with a DIFFERENT feed
   * (one that swaps its feed in place, e.g. tabs over the same list) must
   * therefore force a remount with a `key`; otherwise the new items are
   * fetched server-side and then silently discarded, leaving the previous feed
   * on screen. Home and topics never change theirs in place, so they need no
   * key.
   */
  initialItems: FeedItem[];
  initialCursor: string | null;
  locale: string;
  showMoreLabel: string;
  /**
   * Label for the manual "load the next page" button, shown once auto-loading
   * has stopped — after too many empty pages ({@link EMPTY_PAGE_LIMIT}) or once
   * the list is full enough ({@link AUTO_LOAD_ITEM_LIMIT}). Distinct
   * from `showMoreLabel`, which expands a truncated post body inside a card.
   */
  loadMoreLabel: string;
  justNowLabel: string;
  showAds?: boolean;
  /**
   * Admin-configured native-ad creatives for the in-feed slot, resolved
   * server-side (active + in-schedule, priority-ordered). Each ad slot is
   * filled by the next creative (rotating `adIndex % n`). An empty list
   * suppresses the slots entirely: a native card is the only thing that can
   * fill one, so an ad row with nothing to put in it would be a blank row
   * carrying a divider.
   */
  nativeAdCreatives?: NativeAdView[];
  /**
   * Item layout. `'feed'` (default) renders a continuous divider list
   * (`border-b` between items) — the home feed. `'card'` renders each item as
   * a stand-alone bordered card spaced with `space-y-3` — matching the
   * catalog list pages (e.g. position-memory). Forwarded to `FeedCard`/
   * `ActivityCard` as well so the cards pick up their own border in `'card'`.
   */
  variant?: 'feed' | 'card';
  /** Size variant for the footer engagement actions (like + comment counter), forwarded to every `FeedCard`. */
  actionSize?: EngagementCounterSize;
  'data-tour-id'?: string;
};

/**
 * Where the next page comes from — exactly one of the two, never both.
 *
 * `scope` names a feed whose entity-type whitelist is resolved inside
 * `getFeed`, server-side; that is what stops a client from paginating an
 * arbitrary entity-type list, so home and topics keep using it. `fetchPage`
 * is for surfaces `scope` cannot express (the profile timeline, which pages
 * within one member) and takes a Server Action already bound
 * to that scope, so the client still only supplies the cursor. Either way the
 * pages must be consistent with `initialItems` — they land in the same list.
 *
 * A union rather than an optional override: with both readable at once, one
 * silently won, and `scope="topics" fetchPage={...}` type-checked while
 * quietly paginating something else entirely.
 */
type PaginationSource =
  | {
      /** Must match the scope used to build `initialItems`. Defaults to `'home'`. */
      scope?: FeedScope;
      fetchPage?: never;
    }
  | {
      scope?: never;
      fetchPage: (cursor: string) => Promise<FeedResponse>;
    };

/**
 * How many consecutive pages may come back with nothing to render before
 * auto-loading stops and hands the reader a button.
 *
 * A page can be empty while still carrying a cursor: `feed_items` rows outlive
 * the entity they point at, and the loader drops those rows after they have
 * already counted against the page limit. Since nothing is appended, the list
 * does not grow, the sentinel stays inside the observer's root margin, and the
 * next render re-fires it — an unbounded request loop that makes no progress.
 * Measured before this guard: 24 requests in 20s, zero items rendered, still
 * going.
 *
 * Two rather than one, because a single empty page is a normal hiccup that the
 * next page usually clears, and pausing on it would put a button in front of
 * readers who would never have noticed.
 */
const EMPTY_PAGE_LIMIT = 2;

/**
 * How many items the list may hold before infinite scroll hands over to the
 * manual button for good.
 *
 * @design Why auto-loading has a ceiling at all
 * Every surface that renders this list sits above the site footer, and the
 * footer is the only place that links the contact form, the terms, the privacy
 * policy and the affiliate disclosure. Unbounded infinite scroll keeps
 * appending as the reader nears the bottom, so the footer recedes every time
 * it comes into reach and is never actually reachable — readers reported
 * exactly that. Social timelines that scroll forever get away with it because
 * they put no footer under the list (their legal links live in a sidebar);
 * this layout does, so the list has to stop on its own at some point.
 *
 * @design Why a ceiling on items rather than removing infinite scroll
 * Most readers never scroll past the first few pages, and for them automatic
 * loading is strictly better than a button. Stopping after a fixed amount
 * keeps that for the common case and only asks a reader who is deliberately
 * digging further to press a button — after which the footer sits directly
 * below it. The ceiling counts rendered items, not requests: page size is set
 * by each surface (and by the loader's clamping), and an empty page — see
 * {@link EMPTY_PAGE_LIMIT} — should not use up the reader's allowance.
 *
 * @design Why the button stays once the ceiling is reached
 * Past the ceiling, every press loads one page and shows the button again
 * instead of resuming automatic loading. Resuming would put the reader back
 * into the state the ceiling exists to end: the footer receding on every
 * scroll.
 *
 * @design Why 40
 * Forty is four pages of the home feed's ten items. It follows Google Search's
 * continuous scrolling, which loaded four pages of results automatically on
 * mobile and then showed a "More results" button (six pages on desktop). Feed
 * cards are much taller than a search-result row and ads are interleaved, so
 * the mobile figure fits better than the desktop one. Google withdrew
 * continuous scrolling altogether in June 2024 and went back to numbered
 * pages, citing no significant gain in user satisfaction rather than any
 * problem with the button, so the figure is a starting point to tune by use,
 * not a standard.
 *
 * Source for the Google figures: Search Engine Land, "Google rolling out
 * continuous scroll on mobile" (October 2021) and "Google brings continuous
 * scroll to desktop search results" (December 2022).
 */
const AUTO_LOAD_ITEM_LIMIT = 40;

export function FeedClient({
  initialItems,
  initialCursor,
  locale,
  showMoreLabel,
  loadMoreLabel,
  justNowLabel,
  showAds = false,
  nativeAdCreatives,
  scope = 'home',
  fetchPage,
  variant = 'feed',
  actionSize,
  ...rest
}: Props & PaginationSource) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  /** Consecutive pages that rendered nothing; reset by any page that does. */
  const emptyStreakRef = useRef(0);
  const [autoLoadPaused, setAutoLoadPaused] = useState(false);
  const autoLoadEnabled = !autoLoadPaused && items.length < AUTO_LOAD_ITEM_LIMIT;

  const adCreatives = useMemo(
    () => (showAds ? (nativeAdCreatives ?? []) : []),
    [showAds, nativeAdCreatives]
  );
  const displayItems = useMemo(
    () => buildDisplayItems(items, adCreatives.length > 0),
    [items, adCreatives]
  );

  // In `card` layout each item is a self-contained bordered card spaced by the
  // container's `space-y-3`; in `feed` layout items share a continuous list and
  // are separated by a `border-b` divider on their wrapper.
  const itemWrapperClass = variant === 'card' ? '' : 'border-b border-border last:border-b-0';

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const renderDisplayItem = useCallback(
    (index: number, displayItem: DisplayItem) => {
      if (displayItem.type === 'ad') {
        // Ad rows exist only when the pool is non-empty (see `displayItems`),
        // so the modulo always lands on a creative. The `bfc_ads_hidden`
        // no-flash CSS hide rides on `.ad-slot-wrapper`, which `NativeAdCard`
        // owns; it takes the row divider classes via `className` so the whole
        // row collapses with it.
        const creative = adCreatives[displayItem.adIndex % adCreatives.length];
        return (
          <NativeAdCard
            key={`ad-${index}`}
            creative={creative}
            locale={locale}
            variant={variant}
            className={itemWrapperClass}
          />
        );
      }
      return (
        <div key={displayItem.item.id} className={itemWrapperClass}>
          <FeedCard
            item={displayItem.item}
            locale={locale}
            showMoreLabel={showMoreLabel}
            justNowLabel={justNowLabel}
            variant={variant}
            actionSize={actionSize}
            onRemove={removeItem}
          />
        </div>
      );
    },
    [
      locale,
      showMoreLabel,
      justNowLabel,
      variant,
      actionSize,
      itemWrapperClass,
      adCreatives,
      removeItem,
    ]
  );

  const loadMore = useCallback(async () => {
    if (!cursor || isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const result = fetchPage ? await fetchPage(cursor) : await getFeed(cursor, undefined, scope);
      setItems((prev) => [...prev, ...result.items]);
      setCursor(result.nextCursor);

      // Stop auto-loading once enough pages in a row have rendered nothing —
      // see `EMPTY_PAGE_LIMIT`. A page that renders something clears the
      // streak and resumes scrolling, so a reader who presses the button back
      // into live rows does not see it again — unless the list has already
      // reached `AUTO_LOAD_ITEM_LIMIT`, which keeps the button on its own.
      if (result.items.length === 0) {
        emptyStreakRef.current += 1;
        if (emptyStreakRef.current >= EMPTY_PAGE_LIMIT) {
          setAutoLoadPaused(true);
        }
      } else {
        emptyStreakRef.current = 0;
        setAutoLoadPaused(false);
      }
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [cursor, scope, fetchPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor || !autoLoadEnabled) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, loadMore, autoLoadEnabled]);

  return (
    <div className={variant === 'card' ? 'space-y-3' : undefined} {...rest}>
      {displayItems.map((displayItem, index) => renderDisplayItem(index, displayItem))}
      {isLoading && <FeedSkeleton />}
      {cursor && !isLoading && autoLoadEnabled && <div ref={sentinelRef} />}
      {cursor && !isLoading && !autoLoadEnabled && (
        <div className="flex justify-center py-4">
          <button
            type="button"
            onClick={loadMore}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {loadMoreLabel}
          </button>
        </div>
      )}
    </div>
  );
}
