'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getFeed } from '../_actions/getFeed';
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
  'data-tour-id'?: string;
};

export function FeedClient({
  initialItems,
  initialCursor,
  locale,
  showMoreLabel,
  justNowLabel,
  showAds = false,
  ...rest
}: Props) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const displayItems = useMemo(() => buildDisplayItems(items, showAds), [items, showAds]);

  const renderDisplayItem = useCallback(
    (index: number, displayItem: DisplayItem) => {
      if (displayItem.type === 'ad') {
        return (
          <div key={`ad-${index}`} className="border-b border-border last:border-b-0">
            <ResponsiveAdSlot />
          </div>
        );
      }
      return (
        <div key={displayItem.item.id} className="border-b border-border last:border-b-0">
          <FeedCard
            item={displayItem.item}
            locale={locale}
            showMoreLabel={showMoreLabel}
            justNowLabel={justNowLabel}
          />
        </div>
      );
    },
    [locale, showMoreLabel, justNowLabel]
  );

  const loadMore = useCallback(async () => {
    if (!cursor || isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const result = await getFeed(cursor);
      setItems((prev) => [...prev, ...result.items]);
      setCursor(result.nextCursor);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [cursor]);

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
    <div {...rest}>
      {displayItems.map((displayItem, index) => renderDisplayItem(index, displayItem))}
      {isLoading && <FeedSkeleton />}
      {cursor && !isLoading && <div ref={sentinelRef} />}
    </div>
  );
}
