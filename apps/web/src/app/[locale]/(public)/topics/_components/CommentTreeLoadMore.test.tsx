import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LoadMoreCommentsResult } from '../_lib/load-more-comments';
import { CommentTreeLoadMore } from './CommentTreeLoadMore';

afterEach(() => {
  cleanup();
});

const LABELS = {
  showMore: 'Show more comments',
  loading: 'Loading…',
  retry: 'Retry',
  error: "Couldn't load more comments.",
};

// jsdom has no IntersectionObserver. The stub records instances so tests can
// drive the auto-load path by invoking the captured callback; observe() is a
// no-op, so the button remains the only default trigger.
type ObserverEntry = { callback: IntersectionObserverCallback; disconnected: boolean };
let observers: ObserverEntry[] = [];

class IntersectionObserverStub {
  entry: ObserverEntry;
  constructor(callback: IntersectionObserverCallback) {
    this.entry = { callback, disconnected: false };
    observers.push(this.entry);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    this.entry.disconnected = true;
  }
}

beforeEach(() => {
  observers = [];
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
});

function batchResult(id: string, hasMore: boolean, nextOffset: number): LoadMoreCommentsResult {
  return { node: <div data-testid={`batch-${id}`} />, hasMore, nextOffset };
}

describe('CommentTreeLoadMore', () => {
  it('renders the SSR batch and no footer when there is nothing more to load', () => {
    const action = vi.fn();
    render(
      <CommentTreeLoadMore
        resetKey="new"
        initialHasMore={false}
        initialOffset={20}
        loadMoreAction={action}
        labels={LABELS}
      >
        <div data-testid="ssr-batch" />
      </CommentTreeLoadMore>
    );

    expect(screen.getByTestId('ssr-batch')).toBeDefined();
    expect(screen.queryByRole('button')).toBeNull();
    expect(action).not.toHaveBeenCalled();
  });

  it('appends the fetched batch and advances the offset on click', async () => {
    const action = vi
      .fn()
      .mockResolvedValueOnce(batchResult('two', true, 40))
      .mockResolvedValueOnce(batchResult('three', false, 60));

    render(
      <CommentTreeLoadMore
        resetKey="new"
        initialHasMore={true}
        initialOffset={20}
        loadMoreAction={action}
        labels={LABELS}
      >
        <div data-testid="ssr-batch" />
      </CommentTreeLoadMore>
    );

    fireEvent.click(screen.getByRole('button', { name: LABELS.showMore }));
    await waitFor(() => expect(screen.getByTestId('batch-two')).toBeDefined());
    expect(action).toHaveBeenNthCalledWith(1, 20);

    fireEvent.click(screen.getByRole('button', { name: LABELS.showMore }));
    await waitFor(() => expect(screen.getByTestId('batch-three')).toBeDefined());
    expect(action).toHaveBeenNthCalledWith(2, 40);

    // Final batch reported hasMore=false — the footer disappears, earlier
    // batches stay mounted.
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByTestId('ssr-batch')).toBeDefined();
    expect(screen.getByTestId('batch-two')).toBeDefined();
  });

  it('shows the error state on failure and retries with the SAME offset', async () => {
    const action = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(batchResult('two', false, 40));

    render(
      <CommentTreeLoadMore
        resetKey="new"
        initialHasMore={true}
        initialOffset={20}
        loadMoreAction={action}
        labels={LABELS}
      >
        <div />
      </CommentTreeLoadMore>
    );

    fireEvent.click(screen.getByRole('button', { name: LABELS.showMore }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(LABELS.error));

    fireEvent.click(screen.getByRole('button', { name: LABELS.retry }));
    await waitFor(() => expect(screen.getByTestId('batch-two')).toBeDefined());
    // The failed offset was not consumed — both calls used offset 20.
    expect(action).toHaveBeenNthCalledWith(1, 20);
    expect(action).toHaveBeenNthCalledWith(2, 20);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('auto-loads when the IntersectionObserver reports the sentinel visible', async () => {
    const action = vi.fn().mockResolvedValueOnce(batchResult('two', false, 40));

    render(
      <CommentTreeLoadMore
        resetKey="new"
        initialHasMore={true}
        initialOffset={20}
        loadMoreAction={action}
        labels={LABELS}
      >
        <div />
      </CommentTreeLoadMore>
    );

    expect(observers.length).toBeGreaterThan(0);
    const observer = observers[observers.length - 1];
    await act(async () => {
      observer.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        observer as unknown as IntersectionObserver
      );
    });

    await waitFor(() => expect(screen.getByTestId('batch-two')).toBeDefined());
    expect(action).toHaveBeenCalledWith(20);
  });

  it('drops accumulated batches when resetKey changes (sort switch)', async () => {
    const action = vi.fn().mockResolvedValue(batchResult('two', true, 40));

    const { rerender } = render(
      <CommentTreeLoadMore
        resetKey="new"
        initialHasMore={true}
        initialOffset={20}
        loadMoreAction={action}
        labels={LABELS}
      >
        <div data-testid="ssr-new" />
      </CommentTreeLoadMore>
    );

    fireEvent.click(screen.getByRole('button', { name: LABELS.showMore }));
    await waitFor(() => expect(screen.getByTestId('batch-two')).toBeDefined());

    // Sort switch re-SSRs the first batch in the new order and changes the key.
    rerender(
      <CommentTreeLoadMore
        resetKey="popular"
        initialHasMore={true}
        initialOffset={20}
        loadMoreAction={action}
        labels={LABELS}
      >
        <div data-testid="ssr-popular" />
      </CommentTreeLoadMore>
    );

    expect(screen.getByTestId('ssr-popular')).toBeDefined();
    expect(screen.queryByTestId('batch-two')).toBeNull();
  });
});
