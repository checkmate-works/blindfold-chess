import * as Sentry from '@sentry/nextjs';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoadingStallReporter } from './LoadingStallReporter';

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
}));

const captureMessage = vi.mocked(Sentry.captureMessage);

beforeEach(() => {
  vi.useFakeTimers();
  captureMessage.mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('LoadingStallReporter', () => {
  it('reports once, with the boundary name, when the skeleton outlives the threshold', () => {
    render(<LoadingStallReporter boundary="profile-shell" />);

    vi.advanceTimersByTime(15_000);

    expect(captureMessage).toHaveBeenCalledTimes(1);
    expect(captureMessage).toHaveBeenCalledWith(
      'loading-boundary-stalled:profile-shell',
      expect.objectContaining({ level: 'warning' })
    );

    // Still exactly one after further time passes — the timer does not repeat.
    vi.advanceTimersByTime(60_000);
    expect(captureMessage).toHaveBeenCalledTimes(1);
  });

  it('stays silent when the skeleton unmounts before the threshold — the normal load', () => {
    const { unmount } = render(<LoadingStallReporter boundary="home-feed" />);

    vi.advanceTimersByTime(14_999);
    unmount();
    vi.advanceTimersByTime(60_000);

    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('records the pathname so a stall can be traced to a route', () => {
    render(<LoadingStallReporter boundary="home-feed" />);

    vi.advanceTimersByTime(15_000);

    expect(captureMessage).toHaveBeenCalledWith(
      'loading-boundary-stalled:home-feed',
      expect.objectContaining({
        extra: expect.objectContaining({ pathname: window.location.pathname }),
      })
    );
  });
});
