import * as Sentry from '@sentry/nextjs';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoadingStallReporter } from './LoadingStallReporter';

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  flush: vi.fn(() => Promise.resolve(true)),
}));

const captureMessage = vi.mocked(Sentry.captureMessage);
const reload = vi.fn();

const PATHNAME = '/en/u/someone';

beforeEach(() => {
  vi.useFakeTimers();
  captureMessage.mockClear();
  reload.mockClear();
  sessionStorage.clear();
  vi.stubGlobal('location', { ...window.location, pathname: PATHNAME, reload });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Let the flush promise settle so the reload it chains actually runs. */
async function advancePastThreshold() {
  await vi.advanceTimersByTimeAsync(15_000);
}

describe('LoadingStallReporter', () => {
  it('reports once, with the boundary name, when the skeleton outlives the threshold', async () => {
    render(<LoadingStallReporter boundary="profile-shell" />);

    await advancePastThreshold();

    expect(captureMessage).toHaveBeenCalledTimes(1);
    expect(captureMessage).toHaveBeenCalledWith(
      'loading-boundary-stalled:profile-shell',
      expect.objectContaining({ level: 'warning' })
    );

    // Still exactly one after further time passes — the timer does not repeat.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(captureMessage).toHaveBeenCalledTimes(1);
  });

  it('stays silent when the skeleton unmounts before the threshold — the normal load', async () => {
    const { unmount } = render(<LoadingStallReporter boundary="home-feed" />);

    await vi.advanceTimersByTimeAsync(14_999);
    unmount();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(captureMessage).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('records the pathname so a stall can be traced to a route', async () => {
    render(<LoadingStallReporter boundary="home-feed" />);

    await advancePastThreshold();

    expect(captureMessage).toHaveBeenCalledWith(
      'loading-boundary-stalled:home-feed',
      expect.objectContaining({
        extra: expect.objectContaining({ pathname: PATHNAME }),
      })
    );
  });

  it('reloads to recover, only after the report has been flushed', async () => {
    render(<LoadingStallReporter boundary="profile-shell" />);

    await advancePastThreshold();

    expect(Sentry.flush).toHaveBeenCalled();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(captureMessage).toHaveBeenCalledWith(
      'loading-boundary-stalled:profile-shell',
      expect.objectContaining({ extra: expect.objectContaining({ recovering: true }) })
    );
  });

  it('stops reloading the same path once attempts run out — a stuck reload must not loop', async () => {
    // Each pass is the reloaded document stalling again and re-mounting the
    // boundary. The third must give up.
    for (let attempt = 0; attempt < 2; attempt++) {
      render(<LoadingStallReporter boundary="profile-shell" />);
      await advancePastThreshold();
      cleanup();
    }
    expect(reload).toHaveBeenCalledTimes(2);

    reload.mockClear();
    captureMessage.mockClear();
    render(<LoadingStallReporter boundary="profile-shell" />);
    await advancePastThreshold();

    expect(reload).not.toHaveBeenCalled();
    expect(captureMessage).toHaveBeenCalledWith(
      'loading-boundary-stalled:profile-shell',
      expect.objectContaining({ extra: expect.objectContaining({ recovering: false }) })
    );
  });

  it('reports without reloading when storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });

    render(<LoadingStallReporter boundary="profile-shell" />);
    await advancePastThreshold();

    expect(captureMessage).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });
});
