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
import { ResponsiveAdSlot } from './ResponsiveAdSlot';

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
   * Label for the manual "load the next page" button, shown only after
   * auto-loading has paused itself — see {@link EMPTY_PAGE_LIMIT}. Distinct
   * from `showMoreLabel`, which expands a truncated post body inside a card.
   */
  loadMoreLabel: string;
  justNowLabel: string;
  showAds?: boolean;
  /**
   * Admin-configured native-ad creatives for the in-feed slot, resolved
   * server-side (active + in-schedule, priority-ordered). Each ad slot is
   * filled by the next creative (rotating `adIndex % n`); when the list is
   * empty the slot falls back to the AdSense in-feed unit. An empty list does
   * NOT suppress the slot — `showAds` alone decides whether ads appear.
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

  const adCreatives = useMemo(
    () => (showAds ? (nativeAdCreatives ?? []) : []),
    [showAds, nativeAdCreatives]
  );
  const displayItems = useMemo(() => buildDisplayItems(items, showAds), [items, showAds]);

  // In `card` layout each item is a self-contained bordered card spaced by the
  // container's `space-y-3`; in `feed` layout items share a continuous list and
  // are separated by a `border-b` divider on their wrapper.
  const itemWrapperClass = variant === 'card' ? '' : 'border-b border-border last:border-b-0';

  const renderDisplayItem = useCallback(
    (index: number, displayItem: DisplayItem) => {
      if (displayItem.type === 'ad') {
        // Waterfall: highest-priority admin creative, else AdSense fallback.
        // The `bfc_ads_hidden` no-flash CSS hide rides on `.ad-slot-wrapper`:
        // `NativeAdCard` owns its own, and takes the row divider classes via
        // `className` so the whole row collapses with it; the AdSense fallback
        // row carries the class here for the same reason.
        const creative =
          adCreatives.length > 0 ? adCreatives[displayItem.adIndex % adCreatives.length] : null;
        return creative ? (
          <NativeAdCard
            key={`ad-${index}`}
            creative={creative}
            locale={locale}
            variant={variant}
            className={itemWrapperClass}
          />
        ) : (
          <div key={`ad-${index}`} className={`${itemWrapperClass} ad-slot-wrapper`.trim()}>
            <ResponsiveAdSlot />
          </div>
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
          />
        </div>
      );
    },
    [locale, showMoreLabel, justNowLabel, variant, actionSize, itemWrapperClass, adCreatives]
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
      // into live rows never sees it again.
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
    if (!el || !cursor || autoLoadPaused) return;

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
  }, [cursor, loadMore, autoLoadPaused]);

  return (
    <div className={variant === 'card' ? 'space-y-3' : undefined} {...rest}>
      {displayItems.map((displayItem, index) => renderDisplayItem(index, displayItem))}
      {isLoading && <FeedSkeleton />}
      {cursor && !isLoading && !autoLoadPaused && <div ref={sentinelRef} />}
      {cursor && !isLoading && autoLoadPaused && (
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
