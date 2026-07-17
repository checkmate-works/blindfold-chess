'use client';

import { Fragment, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import type { LoadMoreCommentsAction } from '../_lib/load-more-comments';

export type CommentTreeLoadMoreLabels = {
  /** "Show more comments" — the manual affordance. */
  showMore: string;
  /** Busy label while a batch is in flight. */
  loading: string;
  /** Button label after a failed load (manual retry). */
  retry: string;
  /** Error line shown above the retry button. */
  error: string;
};

type Props = {
  /**
   * Remounts the accumulated state when it changes — pass the validated
   * sort so a sort switch (which re-SSRs the first batch in the new order)
   * also drops every client-appended batch from the previous order.
   */
  resetKey: string;
  /** Whether batches exist beyond the SSR'd first one. */
  initialHasMore: boolean;
  /** Offset of the SECOND batch (= the first batch's root count / page size). */
  initialOffset: number;
  loadMoreAction: LoadMoreCommentsAction;
  labels: CommentTreeLoadMoreLabels;
  /** The SSR'd first batch. */
  children: ReactNode;
};

/**
 * Incremental-loading shell around a server-rendered comment tree
 * (issue #81). The first batch is SSR'd as `children`; further batches are
 * fetched through the page's Server Action, which returns each batch as
 * already-rendered JSX (see `LoadMoreCommentsResult`), and appended in
 * order.
 *
 * Hybrid trigger: the "Show more" button is always rendered while more
 * batches exist — it is the accessible, SR-visible affordance — and an
 * IntersectionObserver on the same footer auto-triggers it as the reader
 * approaches, so scrolling feels continuous without footer-trapping
 * (observation stops while a load is pending and after an error; errors
 * require a manual retry click so a dead backend cannot loop the observer).
 *
 * Known trade-off (accepted, see `getCommentTreePageForTopic`): offset
 * pagination under concurrent inserts can duplicate a root across two
 * appended batches until the next full render.
 */
export function CommentTreeLoadMore({ resetKey, ...rest }: Props) {
  // State lives in the keyed inner component so every call site gets the
  // sort-switch reset for free — it cannot be forgotten per page.
  return <CommentTreeLoadMoreState key={resetKey} {...rest} />;
}

function CommentTreeLoadMoreState({
  initialHasMore,
  initialOffset,
  loadMoreAction,
  labels,
  children,
}: Omit<Props, 'resetKey'>) {
  const [batches, setBatches] = useState<{ offset: number; node: ReactNode }[]>([]);
  const [offset, setOffset] = useState(initialOffset);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, setIsPending] = useState(false);
  const [hasError, setHasError] = useState(false);
  // Synchronous re-entrancy guard: the observer can fire between a click
  // and the state flush, and `isPending` alone would double-load.
  const inFlightRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadNext = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsPending(true);
    setHasError(false);
    try {
      const result = await loadMoreAction(offset);
      setBatches((prev) => [...prev, { offset, node: result.node }]);
      setOffset(result.nextOffset);
      setHasMore(result.hasMore);
    } catch {
      setHasError(true);
    } finally {
      inFlightRef.current = false;
      setIsPending(false);
    }
  }, [loadMoreAction, offset]);

  useEffect(() => {
    if (!hasMore || hasError || isPending) return;
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadNext();
        }
      },
      // Start fetching one screen early so the reader rarely sees the
      // loading state at all on a steady scroll.
      { rootMargin: '400px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, hasError, isPending, loadNext]);

  return (
    <div className="space-y-6">
      {children}
      {batches.map((batch) => (
        <Fragment key={batch.offset}>{batch.node}</Fragment>
      ))}
      {hasMore && (
        <div ref={sentinelRef} className="flex flex-col items-center gap-2 pt-2">
          {hasError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {labels.error}
            </p>
          )}
          <button
            type="button"
            onClick={() => void loadNext()}
            disabled={isPending}
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-default"
          >
            {isPending ? labels.loading : hasError ? labels.retry : labels.showMore}
          </button>
        </div>
      )}
    </div>
  );
}
