'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ADSENSE_INFEED_LAYOUT_KEY_DESKTOP,
  ADSENSE_INFEED_LAYOUT_KEY_MOBILE,
  ADSENSE_SLOT_INFEED_DESKTOP,
  ADSENSE_SLOT_INFEED_MOBILE,
  IS_LOCAL_DEV,
} from '@/config';

import { AdSenseInFeed } from '@/app/[locale]/_components/AdSense';

import { getFeed } from '../_actions/getFeed';
import { buildDisplayItems } from '../_lib/feed-display';
import type { DisplayItem, FeedItem } from '../_lib/types';
import { FeedCard } from './FeedCard';
import { FeedSkeleton } from './FeedSkeleton';

type Props = {
  initialCursor: string | null;
  locale: string;
  showMoreLabel: string;
  justNowLabel: string;
  newReplyTemplate: string;
  showAds?: boolean;
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
  showAds = false,
  adIndexOffset = 0,
}: Props) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const displayItems = useMemo(
    () => buildDisplayItems(items, showAds, adIndexOffset),
    [items, showAds, adIndexOffset]
  );

  const renderDisplayItem = useCallback(
    (index: number, displayItem: DisplayItem) => {
      if (displayItem.type === 'ad') {
        return (
          <div key={`ad-${index}`} className="border-b border-border">
            <>
              {(IS_LOCAL_DEV ||
                (ADSENSE_SLOT_INFEED_DESKTOP && ADSENSE_INFEED_LAYOUT_KEY_DESKTOP)) && (
                <div className="hidden md:block">
                  <AdSenseInFeed
                    slotId={ADSENSE_SLOT_INFEED_DESKTOP ?? ''}
                    layoutKey={ADSENSE_INFEED_LAYOUT_KEY_DESKTOP ?? ''}
                  />
                </div>
              )}
              {(IS_LOCAL_DEV ||
                (ADSENSE_SLOT_INFEED_MOBILE && ADSENSE_INFEED_LAYOUT_KEY_MOBILE)) && (
                <div className="block md:hidden">
                  <AdSenseInFeed
                    slotId={ADSENSE_SLOT_INFEED_MOBILE ?? ''}
                    layoutKey={ADSENSE_INFEED_LAYOUT_KEY_MOBILE ?? ''}
                  />
                </div>
              )}
            </>
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
    [locale, showMoreLabel, justNowLabel, newReplyTemplate]
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
