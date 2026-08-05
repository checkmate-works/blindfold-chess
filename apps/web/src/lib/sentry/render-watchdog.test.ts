import { after } from 'next/server';

import * as Sentry from '@sentry/nextjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { markRenderStage, startRenderWatchdog } from './render-watchdog';

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  flush: vi.fn(() => Promise.resolve(true)),
}));

// `after` callbacks run once the response has finished streaming; the tests
// drive that moment explicitly.
const afterCallbacks: Array<() => void> = [];
vi.mock('next/server', () => ({
  after: vi.fn((callback: () => void) => {
    afterCallbacks.push(callback);
  }),
}));

// `cache()` only memoizes inside a React render context, which these tests do
// not have. Substitute a plain per-call-site memo so the stage holder behaves
// as it does in a real request; `startRenderWatchdog` resets the stage when it
// arms, so nothing leaks between tests.
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  cache: <T>(fn: () => T) => {
    let value: T;
    let resolved = false;
    return () => {
      if (!resolved) {
        value = fn();
        resolved = true;
      }
      return value;
    };
  },
}));

const captureMessage = vi.mocked(Sentry.captureMessage);

function finishResponse() {
  afterCallbacks.splice(0).forEach((callback) => callback());
}

beforeEach(() => {
  vi.useFakeTimers();
  captureMessage.mockClear();
  vi.mocked(after).mockClear();
  afterCallbacks.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('startRenderWatchdog', () => {
  it('stays silent when the response finishes before the threshold', () => {
    startRenderWatchdog('profile', { username: 'someone' });

    vi.advanceTimersByTime(19_000);
    finishResponse();
    vi.advanceTimersByTime(60_000);

    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('reports the last stage reached when the response never finishes', () => {
    startRenderWatchdog('profile', { username: 'someone' });
    markRenderStage('shell-loaded');

    vi.advanceTimersByTime(20_000);

    expect(captureMessage).toHaveBeenCalledTimes(1);
    expect(captureMessage).toHaveBeenCalledWith(
      'render-watchdog:profile',
      expect.objectContaining({
        level: 'warning',
        extra: expect.objectContaining({ stage: 'shell-loaded', username: 'someone' }),
      })
    );
  });

  it('flushes the report, since the invocation is about to be killed', () => {
    startRenderWatchdog('profile');

    vi.advanceTimersByTime(20_000);

    expect(Sentry.flush).toHaveBeenCalled();
  });

  it('reports the stage the render did not get past, not the one it started at', () => {
    startRenderWatchdog('profile');
    markRenderStage('viewer-resolved');
    markRenderStage('shell-loaded');
    markRenderStage('page-returned');

    vi.advanceTimersByTime(20_000);

    expect(captureMessage).toHaveBeenCalledWith(
      'render-watchdog:profile',
      expect.objectContaining({ extra: expect.objectContaining({ stage: 'page-returned' }) })
    );
  });
});
