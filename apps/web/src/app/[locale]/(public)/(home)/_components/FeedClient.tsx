'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { NativeAdView } from '@/lib/ads/ad';

import { NativeAdCard } from '@/app/[locale]/_components/NativeAdCard';

import { getFeed } from '../_actions/getFeed';
import type { FeedScope } from '../_actions/getFeed';
import { buildDisplayItems } from '../_lib/feed-display';
import type { DisplayItem, FeedItem } from '../_lib/types';
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
   */
  initialItems: FeedItem[];
  initialCursor: string | null;
  locale: string;
  showMoreLabel: string;
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
   * Which feed to paginate when loading more. Must match the scope used to
   * build `initialItems` server-side. Defaults to `'home'` (all entity types).
   */
  scope?: FeedScope;
  /**
   * Item layout. `'feed'` (default) renders a continuous divider list
   * (`border-b` between items) — the home feed. `'card'` renders each item as
   * a stand-alone bordered card spaced with `space-y-3` — matching the
   * catalog list pages (e.g. position-memory). Forwarded to `FeedCard`/
   * `ActivityCard` as well so the cards pick up their own border in `'card'`.
   */
  variant?: 'feed' | 'card';
  'data-tour-id'?: string;
};

export function FeedClient({
  initialItems,
  initialCursor,
  locale,
  showMoreLabel,
  justNowLabel,
  showAds = false,
  nativeAdCreatives,
  scope = 'home',
  variant = 'feed',
  ...rest
}: Props) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

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
        // `ad-slot-wrapper` opts the whole row into the `bfc_ads_hidden`
        // no-flash CSS hide so ad-free viewers (subscription or coin grant)
        // never see it — the same hook every AdSense slot already uses, now
        // covering the native card too.
        const creative =
          adCreatives.length > 0 ? adCreatives[displayItem.adIndex % adCreatives.length] : null;
        return (
          <div key={`ad-${index}`} className={`${itemWrapperClass} ad-slot-wrapper`.trim()}>
            {creative ? (
              <NativeAdCard creative={creative} locale={locale} variant={variant} />
            ) : (
              <ResponsiveAdSlot />
            )}
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
          />
        </div>
      );
    },
    [locale, showMoreLabel, justNowLabel, variant, itemWrapperClass, adCreatives]
  );

  const loadMore = useCallback(async () => {
    if (!cursor || isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const result = await getFeed(cursor, undefined, scope);
      setItems((prev) => [...prev, ...result.items]);
      setCursor(result.nextCursor);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [cursor, scope]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor) return;

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
  }, [cursor, loadMore]);

  return (
    <div className={variant === 'card' ? 'space-y-3' : undefined} {...rest}>
      {displayItems.map((displayItem, index) => renderDisplayItem(index, displayItem))}
      {isLoading && <FeedSkeleton />}
      {cursor && !isLoading && <div ref={sentinelRef} />}
    </div>
  );
}
