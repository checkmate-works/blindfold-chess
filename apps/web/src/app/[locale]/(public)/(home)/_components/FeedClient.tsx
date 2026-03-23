'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { AdBannerConfig } from '@/lib/ad';

import { getFeed } from '../_actions/getFeed';
import type { FeedItem } from '../_lib/types';
import { FeedCard } from './FeedCard';
import { FeedSkeleton } from './FeedSkeleton';
import { NativeAdCard } from './NativeAdCard';

/** Number of feed items between each native ad insertion. */
const AD_INTERVAL = 3;

type Props = {
  initialItems: FeedItem[];
  initialCursor: string | null;
  locale: string;
  showMoreLabel: string;
  justNowLabel: string;
  newReplyTemplate: string;
  noItemsLabel: string;
  adBanners?: AdBannerConfig[];
  adLabel?: string;
  sponsorLabel?: string;
  sponsoredLinkLabel?: string;
};

export function FeedClient({
  initialItems,
  initialCursor,
  locale,
  showMoreLabel,
  justNowLabel,
  newReplyTemplate,
  noItemsLabel,
  adBanners = [],
  adLabel = '',
  sponsorLabel = '',
  sponsoredLinkLabel = '',
}: Props) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || isLoading) return;
    setIsLoading(true);
    try {
      const result = await getFeed(cursor);
      setItems((prev) => [...prev, ...result.items]);
      setCursor(result.nextCursor);
    } finally {
      setIsLoading(false);
    }
  }, [cursor, isLoading]);

  useEffect(() => {
    if (!cursor || isLoading) return;

    const target = observerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [cursor, isLoading, loadMore]);

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">{noItemsLabel}</p>;
  }

  const elements: React.ReactNode[] = [];
  items.forEach((item, index) => {
    elements.push(
      <FeedCard
        key={item.id}
        item={item}
        locale={locale}
        showMoreLabel={showMoreLabel}
        justNowLabel={justNowLabel}
        newReplyTemplate={newReplyTemplate}
      />
    );
    if (adBanners.length > 0 && (index + 1) % AD_INTERVAL === 0) {
      const adIndex = Math.floor(index / AD_INTERVAL) % adBanners.length;
      elements.push(
        <NativeAdCard
          key={`ad-${index}`}
          ad={adBanners[adIndex]}
          adLabel={adLabel}
          sponsorLabel={sponsorLabel}
          sponsoredLinkLabel={sponsoredLinkLabel}
          locale={locale}
        />
      );
    }
  });

  return (
    <div className="divide-y divide-border">
      {elements}
      {cursor && <div ref={observerRef}>{isLoading && <FeedSkeleton />}</div>}
    </div>
  );
}
