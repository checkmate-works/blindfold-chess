/**
 * Unit tests for {@link UciTransport}, focused on the Worker-failure recovery
 * path introduced in commit 362a7f6d ("fix(web): recover chess engine from
 * Worker failures instead of hanging").
 *
 * The real DOM Worker is not available under JSDOM, so we substitute a
 * minimal stub class via `vi.stubGlobal('Worker', ...)`. Each stub instance
 * exposes `postMessage`, `terminate`, and the `onmessage` / `onerror` /
 * `onmessageerror` hooks the transport attaches in its constructor, so the
 * test can fire error events directly and observe how the transport's
 * pending resolvers react.
 *
 * The key assertion the production bug hinged on: when the Worker fires
 * `onerror`, every awaiter must reject **immediately** with a message that
 * identifies the Worker failure — not with a 10-second "Engine command
 * timeout" that masked the real cause in Sentry.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UciTransport } from './uci-transport';

type ErrorHandler = ((event: ErrorEvent) => void) | null;
type MessageErrorHandler = ((event: MessageEvent) => void) | null;
type MessageHandler = ((event: MessageEvent) => void) | null;

class MockWorker {
  static instances: MockWorker[] = [];
  onmessage: MessageHandler = null;
  onerror: ErrorHandler = null;
  onmessageerror: MessageErrorHandler = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  constructor(public readonly url: string) {
    MockWorker.instances.push(this);
  }

  /** Fire the Worker's `onerror` hook with a synthetic ErrorEvent. */
  fireError(message = 'wasm fetch failed'): void {
    const event =
      typeof ErrorEvent !== 'undefined'
        ? new ErrorEvent('error', { message })
        : // Fallback plain object for environments without ErrorEvent.
          ({ message, type: 'error' } as unknown as ErrorEvent);
    this.onerror?.(event);
  }

  /** Fire the Worker's `onmessageerror` hook. */
  fireMessageError(): void {
    const event = { type: 'messageerror', data: null } as unknown as MessageEvent;
    this.onmessageerror?.(event);
  }
}

beforeEach(() => {
  MockWorker.instances = [];
  vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function latestWorker(): MockWorker {
  const w = MockWorker.instances[MockWorker.instances.length - 1];
  if (!w) throw new Error('No MockWorker instance was constructed');
  return w;
}

describe('UciTransport — Worker error path', () => {
  it('rejects a pending waitForUciOk() with a Worker-error message (not a timeout) when onerror fires', async () => {
    const transport = new UciTransport('/stockfish.js');
    const worker = latestWorker();

    const uciOkPromise = transport.waitForUciOk();

    // Fire the Worker error before the 10s timeout could possibly elapse.
    worker.fireError('wasm fetch failed');

    await expect(uciOkPromise).rejects.toThrow(/Worker error/);
    await expect(uciOkPromise).rejects.not.toThrow(/Engine command timeout/);
  });

  it('rejects a pending waitForReadyOk() with a Worker-error message when onerror fires', async () => {
    const transport = new UciTransport('/stockfish.js');
    const worker = latestWorker();

    const readyOkPromise = transport.waitForReadyOk();

    worker.fireError('boom');

    await expect(readyOkPromise).rejects.toThrow(/Worker error/);
  });

  it('rejects a pending waitForBestMove() with a Worker-error message when onerror fires', async () => {
    const transport = new UciTransport('/stockfish.js');
    const worker = latestWorker();

    const bestMovePromise = transport.waitForBestMove('go movetime 1000');

    worker.fireError('fatal');

    await expect(bestMovePromise).rejects.toThrow(/Worker error/);
    await expect(bestMovePromise).rejects.not.toThrow(/Engine command timeout/);
  });

  it('rejects all three pending awaiters simultaneously on a single onerror', async () => {
    const transport = new UciTransport('/stockfish.js');
    const worker = latestWorker();

    const uciOkPromise = transport.waitForUciOk();
    const readyOkPromise = transport.waitForReadyOk();
    const bestMovePromise = transport.waitForBestMove('go movetime 1000');

    worker.fireError('catastrophic');

    await expect(uciOkPromise).rejects.toThrow(/Worker error/);
    await expect(readyOkPromise).rejects.toThrow(/Worker error/);
    await expect(bestMovePromise).rejects.toThrow(/Worker error/);
  });

  it('rejects pending awaiters promptly — no fake-timer advance required', async () => {
    // Use fake timers so that if the production code ever regressed to relying
    // on the 10s `setTimeout`, this test would hang unless we advanced timers.
    vi.useFakeTimers();

    const transport = new UciTransport('/stockfish.js');
    const worker = latestWorker();

    const uciOkPromise = transport.waitForUciOk();

    // Attach a catch handler so the rejection does not surface as an
    // unhandled promise during the await below.
    const rejected = uciOkPromise.catch((err: unknown) => err as Error);

    worker.fireError('prompt');

    // CRITICAL: Do NOT advanceTimersByTime. Rejection must happen synchronously
    // from failPending, not wait for the 10s timer.
    const err = await rejected;
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/Worker error/);
    expect((err as Error).message).not.toMatch(/timeout/i);
  });

  it('terminates the worker and marks the transport dead after onerror', () => {
    const transport = new UciTransport('/stockfish.js');
    const worker = latestWorker();

    expect(transport.isDead()).toBe(false);

    worker.fireError('boom');

    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(transport.isDead()).toBe(true);
  });

  it('send() throws "Engine not initialized" on a dead transport', () => {
    const transport = new UciTransport('/stockfish.js');
    const worker = latestWorker();
    worker.fireError('boom');

    expect(() => transport.send('uci')).toThrow(/Engine not initialized/);
  });

  it('waitForBestMove() throws "Engine not initialized" on a dead transport', async () => {
    const transport = new UciTransport('/stockfish.js');
    const worker = latestWorker();
    worker.fireError('boom');

    await expect(transport.waitForBestMove('go movetime 1000')).rejects.toThrow(
      /Engine not initialized/
    );
  });

  it('waitForUciOk() throws "Engine not initialized" on a dead transport', async () => {
    const transport = new UciTransport('/stockfish.js');
    const worker = latestWorker();
    worker.fireError('boom');

    await expect(transport.waitForUciOk()).rejects.toThrow(/Engine not initialized/);
  });
});

describe('UciTransport — onmessageerror path', () => {
  it('rejects a pending waitForUciOk() when onmessageerror fires', async () => {
    const transport = new UciTransport('/stockfish.js');
    const worker = latestWorker();

    const uciOkPromise = transport.waitForUciOk();

    worker.fireMessageError();

    await expect(uciOkPromise).rejects.toThrow(/Worker message deserialization failed/);
    await expect(uciOkPromise).rejects.not.toThrow(/Engine command timeout/);
  });

  it('terminates the worker and marks the transport dead after onmessageerror', () => {
    const transport = new UciTransport('/stockfish.js');
    const worker = latestWorker();

    worker.fireMessageError();

    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(transport.isDead()).toBe(true);
  });

  it('rejects all pending awaiters on onmessageerror', async () => {
    const transport = new UciTransport('/stockfish.js');
    const worker = latestWorker();

    const uciOkPromise = transport.waitForUciOk();
    const readyOkPromise = transport.waitForReadyOk();
    const bestMovePromise = transport.waitForBestMove('go movetime 1000');

    worker.fireMessageError();

    await expect(uciOkPromise).rejects.toThrow(/Worker message deserialization failed/);
    await expect(readyOkPromise).rejects.toThrow(/Worker message deserialization failed/);
    await expect(bestMovePromise).rejects.toThrow(/Worker message deserialization failed/);
  });
});

describe('UciTransport — destroy() behaviour', () => {
  it('terminates the worker and clears in-flight timers without rejecting pending awaiters', async () => {
    vi.useFakeTimers();
    const transport = new UciTransport('/stockfish.js');
    const worker = latestWorker();

    // Start a pending awaiter; destroy() is expected teardown (not an error)
    // so the resolver is just nulled. The caller's Promise never settles,
    // which matches the production `destroy()` docstring.
    const uciOkPromise = transport.waitForUciOk();
    // Suppress unhandled rejection warnings in case the test environment
    // surfaces the untouched Promise.
    const settled = Promise.race([
      uciOkPromise.then(() => 'resolved').catch(() => 'rejected'),
      new Promise<string>((r) => setTimeout(() => r('pending'), 1)),
    ]);

    transport.destroy();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(transport.isDead()).toBe(true);

    // Advance past the 10s UCI timeout: the timer must have been cleared by
    // destroy(), otherwise the Promise would reject with "Engine command
    // timeout: uci" and the race below would observe 'rejected'.
    await vi.advanceTimersByTimeAsync(11_000);
    // Let the microtask queue flush so the 1ms fallback resolves 'pending'.
    await vi.advanceTimersByTimeAsync(2);
    const outcome = await settled;
    expect(outcome).toBe('pending');
  });
});
