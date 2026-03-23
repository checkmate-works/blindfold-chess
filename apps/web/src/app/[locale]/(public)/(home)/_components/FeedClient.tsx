'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getFeed } from '../_actions/getFeed';
import type { FeedItem } from '../_lib/types';
import { FeedCard } from './FeedCard';
import { FeedSkeleton } from './FeedSkeleton';

type Props = {
  initialItems: FeedItem[];
  initialCursor: string | null;
  locale: string;
  showMoreLabel: string;
  justNowLabel: string;
  newReplyTemplate: string;
  noItemsLabel: string;
};

export function FeedClient({
  initialItems,
  initialCursor,
  locale,
  showMoreLabel,
  justNowLabel,
  newReplyTemplate,
  noItemsLabel,
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

  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <FeedCard
          key={item.id}
          item={item}
          locale={locale}
          showMoreLabel={showMoreLabel}
          justNowLabel={justNowLabel}
          newReplyTemplate={newReplyTemplate}
        />
      ))}
      {cursor && <div ref={observerRef}>{isLoading && <FeedSkeleton />}</div>}
    </div>
  );
}
