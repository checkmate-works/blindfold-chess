'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { AdBannerConfig } from '@/lib/ad';

import { getFeed } from '../_actions/getFeed';
import { buildDisplayItems } from '../_lib/feed-display';
import type { DisplayItem, FeedItem } from '../_lib/types';
import { FeedCard } from './FeedCard';
import { FeedSkeleton } from './FeedSkeleton';
import { NativeAdCard } from './NativeAdCard';

type Props = {
  initialCursor: string | null;
  locale: string;
  showMoreLabel: string;
  justNowLabel: string;
  newReplyTemplate: string;
  adBanners?: AdBannerConfig[];
  adLabel?: string;
  sponsorLabel?: string;
  sponsoredLinkLabel?: string;
  /**
   * Number of feed items already rendered server-side. Used to continue the
   * ad insertion cycle seamlessly (i.e. the first client-loaded item is treated
   * as item N+1 for AD_INTERVAL calculation).
   */
  adIndexOffset?: number;
};

export function FeedClient({
  initialCursor,
  locale,
  showMoreLabel,
  justNowLabel,
  newReplyTemplate,
  adBanners = [],
  adLabel = '',
  sponsorLabel = '',
  sponsoredLinkLabel = '',
  adIndexOffset = 0,
}: Props) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const displayItems = useMemo(
    () => buildDisplayItems(items, adBanners, adIndexOffset),
    [items, adBanners, adIndexOffset]
  );

  const renderDisplayItem = useCallback(
    (index: number, displayItem: DisplayItem) => {
      if (displayItem.type === 'ad') {
        return (
          <div key={`ad-${index}`} className="border-b border-border">
            <NativeAdCard
              ad={displayItem.ad}
              adLabel={adLabel}
              sponsorLabel={sponsorLabel}
              sponsoredLinkLabel={sponsoredLinkLabel}
              locale={locale}
            />
          </div>
        );
      }
      return (
        <div key={displayItem.item.id} className="border-b border-border">
          <FeedCard
            item={displayItem.item}
            locale={locale}
            showMoreLabel={showMoreLabel}
            justNowLabel={justNowLabel}
            newReplyTemplate={newReplyTemplate}
          />
        </div>
      );
    },
    [
      adLabel,
      sponsorLabel,
      sponsoredLinkLabel,
      locale,
      showMoreLabel,
      justNowLabel,
      newReplyTemplate,
    ]
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
    <div>
      {displayItems.map((displayItem, index) => renderDisplayItem(index, displayItem))}
      {isLoading && <FeedSkeleton />}
      {cursor && !isLoading && <div ref={sentinelRef} />}
    </div>
  );
}
