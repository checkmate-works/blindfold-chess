/**
 * Unit tests for the Maia opponent adapter, focused on the failure modes that
 * are invisible from the UI: a worker that stops answering, and a worker that
 * dies. Both used to leave `getBestMove` pending forever, which the game shows
 * as an AI turn that simply never ends.
 *
 * The tests drive a fake Worker (jsdom has none) so the protocol can be
 * exercised message by message, with fake timers standing in for the deadlines.
 */
import { MAIA3_POLICY_SIZE, MAIA3_VALUE_SIZE } from '@blindfold-chess/features/ai-game/maia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MAIA_INFERENCE_TIMEOUT_MS,
  MAIA_INIT_TIMEOUT_MS,
  createMaiaOpponent,
} from './create-maia-opponent';
import type { MaiaWorkerRequest, MaiaWorkerResponse } from './worker-protocol';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

type MessageListener = (event: MessageEvent<MaiaWorkerResponse>) => void;
type ErrorListener = (event: ErrorEvent) => void;

class FakeMaiaWorker {
  readonly posted: MaiaWorkerRequest[] = [];
  terminated = false;
  private messageListeners = new Set<MessageListener>();
  private errorListeners = new Set<ErrorListener>();

  addEventListener(type: 'message' | 'error', listener: MessageListener | ErrorListener): void {
    if (type === 'message') this.messageListeners.add(listener as MessageListener);
    if (type === 'error') this.errorListeners.add(listener as ErrorListener);
  }

  removeEventListener(type: 'message' | 'error', listener: MessageListener | ErrorListener): void {
    if (type === 'message') this.messageListeners.delete(listener as MessageListener);
    if (type === 'error') this.errorListeners.delete(listener as ErrorListener);
  }

  postMessage(message: MaiaWorkerRequest): void {
    this.posted.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Deliver a protocol response to the adapter. */
  respond(response: MaiaWorkerResponse): void {
    for (const listener of this.messageListeners) {
      listener({ data: response } as MessageEvent<MaiaWorkerResponse>);
    }
  }

  /** Simulate the Worker itself dying (the DOM `error` event). */
  crash(message: string): void {
    for (const listener of this.errorListeners) {
      listener({ message } as ErrorEvent);
    }
  }

  postedOfType<T extends MaiaWorkerRequest['type']>(
    type: T
  ): Extract<MaiaWorkerRequest, { type: T }>[] {
    return this.posted.filter(
      (message): message is Extract<MaiaWorkerRequest, { type: T }> => message.type === type
    );
  }
}

let workers: FakeMaiaWorker[] = [];

/** The worker the opponent under test spawned. */
const spawnedWorker = (): FakeMaiaWorker => {
  const worker = workers.at(-1);
  if (!worker) throw new Error('No worker was spawned');
  return worker;
};

/** Let queued promise continuations run without advancing any deadline. */
const flush = () => vi.advanceTimersByTimeAsync(0);

const uniformLogits = () => ({
  policyLogits: new Float32Array(MAIA3_POLICY_SIZE),
  valueLogits: new Float32Array(MAIA3_VALUE_SIZE),
});

const newOpponent = () => createMaiaOpponent({ selfElo: 1500, opponentElo: 1500 });

const requestMove = (opponent: ReturnType<typeof newOpponent>) =>
  opponent.getBestMove({ fen: START_FEN, history: [] });

beforeEach(() => {
  vi.useFakeTimers();
  workers = [];
  vi.stubGlobal(
    'Worker',
    class {
      constructor() {
        const worker = new FakeMaiaWorker();
        workers.push(worker);
        return worker as unknown as Worker;
      }
    }
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('createMaiaOpponent — happy path', () => {
  it('initializes lazily and returns the top policy move', async () => {
    const opponent = newOpponent();
    expect(spawnedWorker().posted).toHaveLength(0);

    const result = requestMove(opponent);
    expect(spawnedWorker().postedOfType('init')).toHaveLength(1);

    spawnedWorker().respond({ type: 'ready' });
    await flush();

    const infer = spawnedWorker().postedOfType('infer')[0];
    expect(infer).toBeDefined();
    spawnedWorker().respond({ type: 'inferred', requestId: infer.requestId, ...uniformLogits() });

    const outcome = await result;
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.value.move).toMatch(/^[a-h][1-8][a-h][1-8]/);
  });
});

describe('createMaiaOpponent — inference deadline', () => {
  it('fails the move instead of hanging when the worker never answers an inference', async () => {
    const opponent = newOpponent();

    const result = requestMove(opponent);
    spawnedWorker().respond({ type: 'ready' });
    await flush();
    expect(spawnedWorker().postedOfType('infer')).toHaveLength(1);

    // The worker goes silent. Without a deadline this promise never settles.
    await vi.advanceTimersByTimeAsync(MAIA_INFERENCE_TIMEOUT_MS);

    const outcome = await result;
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.kind).toBe('move-generation-failed');
      expect((outcome.error as { cause: Error }).cause.message).toMatch(/timed out/i);
    }
  });

  it('does not fire the deadline for an inference that answered in time', async () => {
    const opponent = newOpponent();

    const result = requestMove(opponent);
    spawnedWorker().respond({ type: 'ready' });
    await flush();
    const infer = spawnedWorker().postedOfType('infer')[0];
    spawnedWorker().respond({ type: 'inferred', requestId: infer.requestId, ...uniformLogits() });
    await result;

    // A deadline left armed would keep the timer queue (and, in production,
    // the event loop) busy long after the move was played.
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('createMaiaOpponent — initialization failures', () => {
  it('fails initialization when the worker crashes during model load', async () => {
    const opponent = newOpponent();

    const result = requestMove(opponent);
    expect(spawnedWorker().postedOfType('init')).toHaveLength(1);

    // The worker dies mid-download: no protocol response will ever arrive, so
    // only the DOM `error` event can settle the awaiting move.
    spawnedWorker().crash('Worker died fetching the model');

    const outcome = await result;
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.kind).toBe('initialization-failed');
      expect((outcome.error as { cause: Error }).cause.message).toMatch(/died fetching/);
    }
  });

  it('replays a worker crash to later moves without waiting out a fresh deadline', async () => {
    const opponent = newOpponent();

    const first = requestMove(opponent);
    spawnedWorker().crash('Worker died fetching the model');
    await first;

    // No timers are advanced here: a crashed worker is unrecoverable, so the
    // latched error must settle this call immediately.
    const outcome = await requestMove(opponent);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error.kind).toBe('initialization-failed');
    expect(spawnedWorker().postedOfType('init')).toHaveLength(1);
  });

  it('fails initialization when the worker never reports readiness', async () => {
    const opponent = newOpponent();

    const result = requestMove(opponent);
    await vi.advanceTimersByTimeAsync(MAIA_INIT_TIMEOUT_MS);

    const outcome = await result;
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.kind).toBe('initialization-failed');
      expect((outcome.error as { cause: Error }).cause.message).toMatch(/timed out/i);
    }
  });

  it('retries initialization on the next move after a reported model-load failure', async () => {
    const opponent = newOpponent();

    const first = requestMove(opponent);
    // A global error (no requestId) is the worker reporting that the model
    // load failed — typically a transient network failure.
    spawnedWorker().respond({ type: 'error', message: 'model fetch failed: 503' });
    const firstOutcome = await first;
    expect(firstOutcome.ok).toBe(false);
    if (!firstOutcome.ok) expect(firstOutcome.error.kind).toBe('initialization-failed');

    // The rejected attempt must not be cached: the next move re-inits.
    const second = requestMove(opponent);
    expect(spawnedWorker().postedOfType('init')).toHaveLength(2);

    spawnedWorker().respond({ type: 'ready' });
    await flush();
    const infer = spawnedWorker().postedOfType('infer')[0];
    expect(infer).toBeDefined();
    spawnedWorker().respond({ type: 'inferred', requestId: infer.requestId, ...uniformLogits() });

    const outcome = await second;
    expect(outcome.ok).toBe(true);
  });

  it('initializes once for concurrent moves', async () => {
    const opponent = newOpponent();

    const first = requestMove(opponent);
    const second = requestMove(opponent);
    expect(spawnedWorker().postedOfType('init')).toHaveLength(1);

    spawnedWorker().respond({ type: 'ready' });
    await flush();

    for (const infer of spawnedWorker().postedOfType('infer')) {
      spawnedWorker().respond({ type: 'inferred', requestId: infer.requestId, ...uniformLogits() });
    }
    const outcomes = await Promise.all([first, second]);
    expect(outcomes.every((outcome) => outcome.ok)).toBe(true);
  });
});

describe('createMaiaOpponent — destroy', () => {
  it('terminates the worker and fails the move in flight', async () => {
    const opponent = newOpponent();

    const result = requestMove(opponent);
    spawnedWorker().respond({ type: 'ready' });
    await flush();

    await opponent.destroy();
    expect(spawnedWorker().terminated).toBe(true);

    const outcome = await result;
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error.kind).toBe('move-generation-failed');

    const afterDestroy = await requestMove(opponent);
    expect(afterDestroy.ok).toBe(false);
    if (!afterDestroy.ok) expect(afterDestroy.error.kind).toBe('opponent-destroyed');
  });

  it('leaves no armed deadline behind', async () => {
    const opponent = newOpponent();

    const result = requestMove(opponent);
    await opponent.destroy();
    await result;

    expect(vi.getTimerCount()).toBe(0);
  });
});
