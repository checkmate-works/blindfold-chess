/**
 * Unit tests for the `ChessEngine` init-retry loop and the `resetChessEngine`
 * singleton teardown helper — both added in commit 362a7f6d
 * ("fix(web): recover chess engine from Worker failures instead of hanging").
 *
 * These tests mock the `UciTransport` module so that every new instance can
 * be programmed (via `queueNextBehaviour`) to either resolve or reject its
 * `waitForUciOk` / `waitForReadyOk` handshake. That lets us exercise the
 * retry loop deterministically without touching a real Stockfish Worker.
 *
 * Behavioural contracts covered:
 *   1. One init failure → the second attempt succeeds.
 *   2. Three failures → the loop gives up and rethrows the **last** error
 *      (wrapped in the `Chess engine initialization failed: ...` prefix).
 *   3. Retry delays match `INIT_RETRY_DELAYS_MS` exactly.
 *   4. `getBestMove` does NOT loop on its own errors — a post-init failure
 *      bubbles up as-is on the first attempt.
 *   5. `resetChessEngine()` swaps the singleton so the next `getChessEngine()`
 *      produces a fresh transport with no lingering state.
 */
import type { Fen } from '@blindfold-chess/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Intentionally imported after `vi.mock('./uci-transport', ...)` — Vitest
// hoists `vi.mock` calls to the top of the file, so the mock is registered
// before this import resolves.
import {
  ChessEngine,
  INIT_RETRY_DELAYS_MS,
  MAX_INIT_ATTEMPTS,
  getChessEngine,
  resetChessEngine,
} from './chess-engine';

type TransportBehaviour =
  | { kind: 'success' }
  | { kind: 'uciOkFails'; reason?: string }
  | { kind: 'readyOkFails'; reason?: string }
  | { kind: 'bestMoveFails'; reason?: string };

type TransportInstance = {
  waitForUciOk: ReturnType<typeof vi.fn>;
  waitForReadyOk: ReturnType<typeof vi.fn>;
  waitForBestMove: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  subscribeInfo: ReturnType<typeof vi.fn>;
  clearBestMoveResolver: ReturnType<typeof vi.fn>;
  isDead: ReturnType<typeof vi.fn>;
  behaviour: TransportBehaviour;
};

// Queue of behaviours that subsequent `new UciTransport(...)` calls pop from.
// `createdInstances` lets assertions inspect every transport the engine spun
// up across retries.
const behaviourQueue: TransportBehaviour[] = [];
const createdInstances: TransportInstance[] = [];

function queueNextBehaviour(behaviour: TransportBehaviour): void {
  behaviourQueue.push(behaviour);
}

vi.mock('./uci-transport', () => {
  class MockUciTransport {
    public readonly behaviour: TransportBehaviour;
    public waitForUciOk: ReturnType<typeof vi.fn>;
    public waitForReadyOk: ReturnType<typeof vi.fn>;
    public waitForBestMove: ReturnType<typeof vi.fn>;
    public send = vi.fn();
    public destroy = vi.fn();
    public subscribeInfo = vi.fn(() => () => {});
    public clearBestMoveResolver = vi.fn();
    public isDead = vi.fn(() => false);

    constructor(_workerPath: string) {
      this.behaviour = behaviourQueue.shift() ?? { kind: 'success' };

      this.waitForUciOk = vi.fn(async () => {
        if (this.behaviour.kind === 'uciOkFails') {
          throw new Error(this.behaviour.reason ?? 'uciOk failure');
        }
      });
      this.waitForReadyOk = vi.fn(async () => {
        if (this.behaviour.kind === 'readyOkFails') {
          throw new Error(this.behaviour.reason ?? 'readyOk failure');
        }
      });
      this.waitForBestMove = vi.fn(async () => {
        if (this.behaviour.kind === 'bestMoveFails') {
          throw new Error(this.behaviour.reason ?? 'bestmove failure');
        }
        return 'e2e4';
      });

      createdInstances.push(this as unknown as TransportInstance);
    }
  }

  return { UciTransport: MockUciTransport };
});

beforeEach(() => {
  behaviourQueue.length = 0;
  createdInstances.length = 0;
  // `getChessEngine` gates on `typeof window` / `typeof Worker` being defined,
  // so we stub a minimal `Worker` global for tests that exercise the
  // singleton. JSDOM provides `window` but not `Worker`.
  vi.stubGlobal('Worker', class {} as unknown as typeof Worker);
});

afterEach(async () => {
  await resetChessEngine();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('ChessEngine init retry loop', () => {
  it('succeeds on the second attempt after one transient uciok failure', async () => {
    queueNextBehaviour({ kind: 'uciOkFails', reason: 'transient' });
    queueNextBehaviour({ kind: 'success' });

    vi.useFakeTimers();
    const engine = new ChessEngine();
    const moveP = engine.getBestMove(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' as Fen
    );

    // Advance the 500ms first-retry backoff so the second attempt runs.
    await vi.advanceTimersByTimeAsync(INIT_RETRY_DELAYS_MS[0]);

    const move = await moveP;
    expect(move).toBe('e2e4');
    expect(createdInstances).toHaveLength(2);
    // The first (dead) transport must be destroyed before retry.
    expect(createdInstances[0].destroy).toHaveBeenCalledTimes(1);
  });

  it('rejects with the last error wrapped in "Chess engine initialization failed" after MAX_INIT_ATTEMPTS failures', async () => {
    for (let i = 0; i < MAX_INIT_ATTEMPTS; i++) {
      queueNextBehaviour({ kind: 'uciOkFails', reason: `attempt-${i + 1}-error` });
    }

    vi.useFakeTimers();
    const engine = new ChessEngine();
    const moveP = engine.getBestMove(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' as Fen
    );
    const rejected = moveP.catch((err: unknown) => err as Error);

    // Advance through every inter-attempt backoff.
    for (const delay of INIT_RETRY_DELAYS_MS.slice(0, MAX_INIT_ATTEMPTS - 1)) {
      await vi.advanceTimersByTimeAsync(delay);
    }

    const err = await rejected;
    expect(err).toBeInstanceOf(Error);
    // The wrapper preserves the LAST attempt's error message.
    expect((err as Error).message).toMatch(/Chess engine initialization failed/);
    expect((err as Error).message).toMatch(/attempt-3-error/);
    expect(createdInstances).toHaveLength(MAX_INIT_ATTEMPTS);
    // Each dead transport is destroyed before the next attempt.
    for (const inst of createdInstances) {
      expect(inst.destroy).toHaveBeenCalled();
    }
  });

  it('waits the exact INIT_RETRY_DELAYS_MS between attempts (not earlier)', async () => {
    queueNextBehaviour({ kind: 'uciOkFails' });
    queueNextBehaviour({ kind: 'uciOkFails' });
    queueNextBehaviour({ kind: 'success' });

    vi.useFakeTimers();
    const engine = new ChessEngine();
    const moveP = engine.getBestMove(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' as Fen
    );

    // After the first failure, only 1 transport exists — advancing time by
    // `INIT_RETRY_DELAYS_MS[0] - 1` must NOT trigger the retry.
    await vi.advanceTimersByTimeAsync(INIT_RETRY_DELAYS_MS[0] - 1);
    expect(createdInstances).toHaveLength(1);

    // Crossing the 500ms mark spawns the second attempt.
    await vi.advanceTimersByTimeAsync(1);
    expect(createdInstances).toHaveLength(2);

    // Same check for the second inter-attempt delay (1500 ms).
    await vi.advanceTimersByTimeAsync(INIT_RETRY_DELAYS_MS[1] - 1);
    expect(createdInstances).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(createdInstances).toHaveLength(3);

    const move = await moveP;
    expect(move).toBe('e2e4');
  });

  it('retries when readyok fails, not just uciok (both are init-phase failures)', async () => {
    queueNextBehaviour({ kind: 'readyOkFails', reason: 'readyok-transient' });
    queueNextBehaviour({ kind: 'success' });

    vi.useFakeTimers();
    const engine = new ChessEngine();
    const moveP = engine.getBestMove(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' as Fen
    );
    await vi.advanceTimersByTimeAsync(INIT_RETRY_DELAYS_MS[0]);
    await expect(moveP).resolves.toBe('e2e4');
    expect(createdInstances).toHaveLength(2);
  });
});

describe('ChessEngine getBestMove — not retried', () => {
  it('propagates a bestmove failure on the first attempt without retrying', async () => {
    // Init succeeds; the subsequent go/bestmove roundtrip fails.
    queueNextBehaviour({ kind: 'bestMoveFails', reason: 'engine crashed mid-search' });

    const engine = new ChessEngine();
    await expect(
      engine.getBestMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' as Fen)
    ).rejects.toThrow(/engine crashed mid-search/);

    // Exactly one transport was constructed — the retry loop must NOT cover
    // getBestMove failures.
    expect(createdInstances).toHaveLength(1);
    expect(createdInstances[0].waitForBestMove).toHaveBeenCalledTimes(1);
  });
});

describe('resetChessEngine', () => {
  it('swaps the singleton so the next getChessEngine() produces a fresh transport', async () => {
    queueNextBehaviour({ kind: 'success' });
    queueNextBehaviour({ kind: 'success' });

    const first = getChessEngine();
    // Trigger lazy init so a transport actually exists.
    await first.getBestMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' as Fen);
    expect(createdInstances).toHaveLength(1);

    await resetChessEngine();

    const second = getChessEngine();
    expect(second).not.toBe(first);

    // The new instance is not yet initialized — confirm by forcing a call
    // that would spin up a fresh transport.
    await second.getBestMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' as Fen);
    expect(createdInstances).toHaveLength(2);
    // The old engine's transport was destroyed as part of reset.
    expect(createdInstances[0].destroy).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when no singleton exists yet', async () => {
    // No prior getChessEngine() call.
    await expect(resetChessEngine()).resolves.toBeUndefined();
    expect(createdInstances).toHaveLength(0);
  });
});
