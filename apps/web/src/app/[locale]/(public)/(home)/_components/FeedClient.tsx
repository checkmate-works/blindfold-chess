'use client';

import { useCallback, useRef, useState } from 'react';

import { Virtuoso } from 'react-virtuoso';

import type { AdBannerConfig } from '@/lib/ad';

import { getFeed } from '../_actions/getFeed';
import type { FeedItem } from '../_lib/types';
import { FeedCard } from './FeedCard';
import { FeedSkeleton } from './FeedSkeleton';
import { NativeAdCard } from './NativeAdCard';

/**
 * Number of feed items between each native ad insertion.
 *
 * @design Native ads (NativeAdCard) are interleaved client-side rather than
 * stored in feed_items because ad display is presentation logic, not user
 * activity. Ads cycle through the `adBanners` array via modulo indexing.
 * When `adBanners` is empty (ads disabled or none active), no ads appear.
 */
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
  const isLoadingRef = useRef(false);

  // 広告を含む表示要素の構築
  // feed items と ad items を仮想リスト内で交互に配置するため、
  // 統一的なインデックスで管理する
  const getDisplayItems = useCallback(() => {
    const displayItems: Array<
      { type: 'feed'; item: FeedItem } | { type: 'ad'; ad: AdBannerConfig }
    > = [];
    items.forEach((item, index) => {
      displayItems.push({ type: 'feed', item });
      if (adBanners.length > 0 && (index + 1) % AD_INTERVAL === 0) {
        const adIndex = Math.floor(index / AD_INTERVAL) % adBanners.length;
        displayItems.push({ type: 'ad', ad: adBanners[adIndex] });
      }
    });
    return displayItems;
  }, [items, adBanners]);

  const displayItems = getDisplayItems();

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

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">{noItemsLabel}</p>;
  }

  return (
    <Virtuoso
      useWindowScroll
      data={displayItems}
      initialItemCount={displayItems.length}
      endReached={() => {
        if (cursor) loadMore();
      }}
      overscan={400}
      itemContent={(index, displayItem) => {
        if (displayItem.type === 'ad') {
          return (
            <div className="border-b border-border">
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
          <div className="border-b border-border">
            <FeedCard
              item={displayItem.item}
              locale={locale}
              showMoreLabel={showMoreLabel}
              justNowLabel={justNowLabel}
              newReplyTemplate={newReplyTemplate}
            />
          </div>
        );
      }}
      components={{
        Footer: () => (isLoading ? <FeedSkeleton /> : null),
      }}
    />
  );
}
