import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HistoryTraversalRecovery } from './HistoryTraversalRecovery';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const mockReplace = vi.fn();
const mockCaptureMessage = vi.fn();

// The URL the router "renders" — what usePathname/useSearchParams report.
// Kept separate from window.location so a test can put the two out of sync,
// which is exactly the broken state this component detects: the browser has
// traversed to a new entry while the App Router still shows the old one.
let renderedPathname = '/en/leaderboard/score/all-time';
let renderedSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  usePathname: () => renderedPathname,
  useSearchParams: () => renderedSearchParams,
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@sentry/nextjs', () => ({
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
}));

function dispatchPopState(state: unknown) {
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate', { state }));
  });
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('HistoryTraversalRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    renderedPathname = '/en/leaderboard/score/all-time';
    renderedSearchParams = new URLSearchParams();
    window.history.replaceState(null, '', '/en/leaderboard/score/all-time');
  });

  describe('null-state popstate (BLINDFOLD-CHESS-2J variant)', () => {
    it('recovers immediately: replaces to the actual URL and reports to Sentry', () => {
      render(<HistoryTraversalRecovery />);

      window.history.replaceState(null, '', '/en/leaderboard/score/weekly');
      dispatchPopState(null);

      expect(mockReplace).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/en/leaderboard/score/weekly');
      expect(mockCaptureMessage).toHaveBeenCalledTimes(1);
      expect(mockCaptureMessage).toHaveBeenCalledWith(
        'popstate with null history state recovered',
        expect.objectContaining({
          level: 'warning',
          extra: expect.objectContaining({
            renderedUrl: '/en/leaderboard/score/all-time',
          }),
        })
      );
    });

    it('includes the query string on both sides of the comparison', () => {
      renderedSearchParams = new URLSearchParams('period=weekly');
      render(<HistoryTraversalRecovery />);

      window.history.replaceState(null, '', '/en/leaderboard/score/all-time?period=monthly');
      dispatchPopState(null);

      expect(mockReplace).toHaveBeenCalledWith('/en/leaderboard/score/all-time?period=monthly');
    });

    it('ignores a null-state popstate whose URL matches the rendered one (load-time popstate)', () => {
      render(<HistoryTraversalRecovery />);

      dispatchPopState(null);

      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockCaptureMessage).not.toHaveBeenCalled();
    });

    it('ignores a fragment-only traversal (hash differs, pathname+search match)', () => {
      render(<HistoryTraversalRecovery />);

      window.history.replaceState(null, '', '/en/leaderboard/score/all-time#row-5');
      dispatchPopState(null);

      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockCaptureMessage).not.toHaveBeenCalled();
    });
  });

  describe('suppressed popstate (WebKit 248303 variant)', () => {
    it('recovers when the URL changes with no popstate at all, after two watchdog ticks', () => {
      vi.useFakeTimers();
      render(<HistoryTraversalRecovery />);

      window.history.replaceState(null, '', '/en/leaderboard/score/weekly');
      advance(1200); // first tick: mismatch noted
      expect(mockReplace).not.toHaveBeenCalled();
      advance(1200); // second tick: same mismatch confirmed

      expect(mockReplace).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/en/leaderboard/score/weekly');
      expect(mockCaptureMessage).toHaveBeenCalledWith(
        'url changed without popstate recovered',
        expect.objectContaining({ level: 'warning' })
      );
    });

    it('does nothing while the URL and the rendered route agree', () => {
      vi.useFakeTimers();
      render(<HistoryTraversalRecovery />);

      advance(1200 * 5);

      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockCaptureMessage).not.toHaveBeenCalled();
    });

    it('does not re-attempt the same URL within the cooldown window', () => {
      vi.useFakeTimers();
      render(<HistoryTraversalRecovery />);

      window.history.replaceState(null, '', '/en/leaderboard/score/weekly');
      advance(1200 * 4);

      expect(mockReplace).toHaveBeenCalledTimes(1);
    });

    it('stays quiet when a state-carrying popstate arrived recently (router owns the traversal)', () => {
      vi.useFakeTimers();
      render(<HistoryTraversalRecovery />);

      window.history.replaceState(null, '', '/en/leaderboard/score/weekly');
      dispatchPopState({ __NA: true });
      advance(1200 * 2);

      // Watchdog defers to the commit-grace check; no interval recovery.
      expect(mockCaptureMessage).not.toHaveBeenCalledWith(
        'url changed without popstate recovered',
        expect.anything()
      );
    });
  });

  describe('state-carrying popstate the router never commits', () => {
    it('recovers after the commit grace period if the rendered URL never catches up', () => {
      vi.useFakeTimers();
      render(<HistoryTraversalRecovery />);

      window.history.replaceState(null, '', '/en/leaderboard/score/weekly');
      dispatchPopState({ __NA: true });
      advance(3500);

      expect(mockReplace).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/en/leaderboard/score/weekly');
      expect(mockCaptureMessage).toHaveBeenCalledWith(
        'popstate was not applied by the router',
        expect.objectContaining({
          extra: expect.objectContaining({ popstateHadNextState: true }),
        })
      );
    });

    it('does not recover when the router commits the traversal in time', () => {
      vi.useFakeTimers();
      const { rerender } = render(<HistoryTraversalRecovery />);

      window.history.replaceState(null, '', '/en/leaderboard/score/weekly');
      dispatchPopState({ __NA: true });

      // The router catches up: rendered URL now matches the browser.
      renderedPathname = '/en/leaderboard/score/weekly';
      rerender(<HistoryTraversalRecovery />);
      advance(3500);

      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockCaptureMessage).not.toHaveBeenCalled();
    });
  });

  describe('entry-skip diagnostic', () => {
    it('reports when the guard stack index jumps by more than 1', () => {
      window.history.replaceState(
        { __NA: true, __next_navigation_guard_stack_index: 5 },
        '',
        '/en/leaderboard/score/all-time'
      );
      render(<HistoryTraversalRecovery />);

      // Swipe-back lands 3 entries away in one traversal.
      renderedPathname = '/en/leaderboard/score/weekly';
      window.history.replaceState(null, '', '/en/leaderboard/score/weekly');
      dispatchPopState({ __NA: true, __next_navigation_guard_stack_index: 2 });

      expect(mockCaptureMessage).toHaveBeenCalledWith(
        'history traversal skipped entries',
        expect.objectContaining({
          extra: expect.objectContaining({ fromGuardIndex: 5, toGuardIndex: 2 }),
        })
      );
    });

    it('stays quiet for a normal one-step traversal', () => {
      window.history.replaceState(
        { __NA: true, __next_navigation_guard_stack_index: 5 },
        '',
        '/en/leaderboard/score/all-time'
      );
      render(<HistoryTraversalRecovery />);

      renderedPathname = '/en/leaderboard/score/weekly';
      window.history.replaceState(null, '', '/en/leaderboard/score/weekly');
      dispatchPopState({ __NA: true, __next_navigation_guard_stack_index: 4 });

      expect(mockCaptureMessage).not.toHaveBeenCalled();
    });
  });

  it('stops listening and polling after unmount', () => {
    vi.useFakeTimers();
    const { unmount } = render(<HistoryTraversalRecovery />);
    unmount();

    window.history.replaceState(null, '', '/en/leaderboard/score/weekly');
    dispatchPopState(null);
    advance(1200 * 4);

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
