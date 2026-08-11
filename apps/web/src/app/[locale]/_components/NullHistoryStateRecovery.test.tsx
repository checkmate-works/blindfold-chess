import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NullHistoryStateRecovery } from './NullHistoryStateRecovery';

afterEach(() => {
  cleanup();
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
  window.dispatchEvent(new PopStateEvent('popstate', { state }));
}

describe('NullHistoryStateRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    renderedPathname = '/en/leaderboard/score/all-time';
    renderedSearchParams = new URLSearchParams();
    window.history.replaceState(null, '', '/en/leaderboard/score/all-time');
  });

  it('recovers a null-state traversal: replaces to the actual URL and reports to Sentry', () => {
    render(<NullHistoryStateRecovery />);

    // The browser traversed to another entry, but the router never processed
    // it (Next's onPopState early-returns on a null state).
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
    render(<NullHistoryStateRecovery />);

    // Same pathname, different search — still a mismatch to recover.
    window.history.replaceState(null, '', '/en/leaderboard/score/all-time?period=monthly');
    dispatchPopState(null);

    expect(mockReplace).toHaveBeenCalledWith('/en/leaderboard/score/all-time?period=monthly');
  });

  it('ignores popstate events that carry a state object', () => {
    render(<NullHistoryStateRecovery />);

    window.history.replaceState(null, '', '/en/leaderboard/score/weekly');
    dispatchPopState({ __NA: true });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('ignores a null-state popstate whose URL matches the rendered one (load-time popstate)', () => {
    render(<NullHistoryStateRecovery />);

    dispatchPopState(null);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('ignores a fragment-only traversal (hash differs, pathname+search match)', () => {
    render(<NullHistoryStateRecovery />);

    window.history.replaceState(null, '', '/en/leaderboard/score/all-time#row-5');
    dispatchPopState(null);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('stops listening after unmount', () => {
    const { unmount } = render(<NullHistoryStateRecovery />);
    unmount();

    window.history.replaceState(null, '', '/en/leaderboard/score/weekly');
    dispatchPopState(null);

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
