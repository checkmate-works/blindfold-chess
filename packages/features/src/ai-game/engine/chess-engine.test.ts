/**
 * Unit tests for the shared `ChessEngine` init-retry loop.
 *
 * Drive the REAL `UciTransport` + `ChessEngine` against a hand-rolled fake
 * `UciMessageChannel` rather than `vi.mock`-ing the transport. This exercises
 * the whole protocol state machine (parser, pending resolvers, `failPending`)
 * under realistic conditions while still letting each test script the
 * channel's response sequence deterministically.
 *
 * Behavioural contracts covered:
 *   1. One init failure → the second attempt succeeds.
 *   2. Three failures → the loop gives up and rethrows the last error
 *      (wrapped in the `Chess engine initialization failed: ...` prefix).
 *   3. Retry delays match `INIT_RETRY_DELAYS_MS` exactly.
 *   4. `getBestMove` does NOT loop on its own errors — a post-init failure
 *      bubbles up as-is on the first attempt.
 *   5. `readyok` failure is retried too (not just `uciok`).
 */
import type { Fen } from "@blindfold-chess/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ChessEngine,
  INIT_RETRY_DELAYS_MS,
  MAX_INIT_ATTEMPTS,
} from "./chess-engine";
import type { UciMessageChannel } from "./message-channel";

type ChannelBehaviour =
  | { kind: "success" }
  | { kind: "uciOkFails"; reason?: string }
  | { kind: "readyOkFails"; reason?: string }
  | { kind: "bestMoveFails"; reason?: string };

type FakeChannel = UciMessageChannel & {
  behaviour: ChannelBehaviour;
  terminate: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
};

/**
 * Build a fake channel that scripts its responses based on `behaviour`:
 * - `success` → replies `uciok` to `uci`, `readyok` to `isready`, and
 *   `bestmove e2e4` to any `go ...`.
 * - `uciOkFails` → fires a fatal error instead of the `uciok` response.
 * - `readyOkFails` → replies `uciok` normally, then fires a fatal error
 *   before `readyok`.
 * - `bestMoveFails` → handshake succeeds; fatal error on `go ...`.
 *
 * Responses are dispatched via microtask so that the caller's `await`
 * promise chain can register its resolver before the reply fires.
 */
function createFakeChannel(behaviour: ChannelBehaviour): FakeChannel {
  const messageHandlers = new Set<(msg: string) => void>();
  const errorHandlers = new Set<(err: Error) => void>();
  let fatal = false;

  const fireMessage = (msg: string) => {
    for (const h of messageHandlers) h(msg);
  };
  const fireError = (reason: string) => {
    fatal = true;
    const err = new Error(reason);
    for (const h of errorHandlers) h(err);
  };

  const send = vi.fn((command: string) => {
    if (fatal) return;
    if (command === "uci") {
      queueMicrotask(() => {
        if (behaviour.kind === "uciOkFails") {
          fireError(behaviour.reason ?? "uciOk failure");
        } else {
          fireMessage("uciok");
        }
      });
      return;
    }
    if (command === "isready") {
      queueMicrotask(() => {
        if (behaviour.kind === "readyOkFails") {
          fireError(behaviour.reason ?? "readyOk failure");
        } else {
          fireMessage("readyok");
        }
      });
      return;
    }
    if (command.startsWith("go")) {
      queueMicrotask(() => {
        if (behaviour.kind === "bestMoveFails") {
          fireError(behaviour.reason ?? "bestmove failure");
        } else {
          fireMessage("bestmove e2e4");
        }
      });
      return;
    }
    // setoption etc. — fire-and-forget.
  });

  const terminate = vi.fn();

  const channel: FakeChannel = {
    behaviour,
    send,
    onMessage(handler) {
      messageHandlers.add(handler);
      return () => messageHandlers.delete(handler);
    },
    onError(handler) {
      errorHandlers.add(handler);
      return () => errorHandlers.delete(handler);
    },
    terminate,
  };

  return channel;
}

function makeChannelFactory(...behaviours: ChannelBehaviour[]): {
  factory: () => UciMessageChannel;
  created: FakeChannel[];
} {
  const queue = [...behaviours];
  const created: FakeChannel[] = [];
  const factory = () => {
    const next = queue.shift() ?? { kind: "success" };
    const channel = createFakeChannel(next);
    created.push(channel);
    return channel;
  };
  return { factory, created };
}

beforeEach(() => {
  // No global setup required — the fake channel does not touch Worker / DOM.
});

afterEach(() => {
  vi.useRealTimers();
});

const STARTING_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" as Fen;

describe("ChessEngine init retry loop", () => {
  it("succeeds on the second attempt after one transient uciok failure", async () => {
    const { factory, created } = makeChannelFactory(
      { kind: "uciOkFails", reason: "transient" },
      { kind: "success" },
    );
    vi.useFakeTimers();
    const engine = new ChessEngine(factory);
    const moveP = engine.getBestMove(STARTING_FEN);

    await vi.advanceTimersByTimeAsync(INIT_RETRY_DELAYS_MS[0]);

    const move = await moveP;
    expect(move).toBe("e2e4");
    expect(created).toHaveLength(2);
    // The first (dead) channel must have been terminated before retry.
    expect(created[0].terminate).toHaveBeenCalledTimes(1);
  });

  it('rejects with the last error wrapped in "Chess engine initialization failed" after MAX_INIT_ATTEMPTS failures', async () => {
    const { factory, created } = makeChannelFactory(
      { kind: "uciOkFails", reason: "attempt-1-error" },
      { kind: "uciOkFails", reason: "attempt-2-error" },
      { kind: "uciOkFails", reason: "attempt-3-error" },
    );
    vi.useFakeTimers();
    const engine = new ChessEngine(factory);
    const moveP = engine.getBestMove(STARTING_FEN);
    const rejected = moveP.catch((err: unknown) => err as Error);

    for (const delay of INIT_RETRY_DELAYS_MS.slice(0, MAX_INIT_ATTEMPTS - 1)) {
      await vi.advanceTimersByTimeAsync(delay);
    }

    const err = await rejected;
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(
      /Chess engine initialization failed/,
    );
    expect((err as Error).message).toMatch(/attempt-3-error/);
    expect(created).toHaveLength(MAX_INIT_ATTEMPTS);
    for (const ch of created) {
      expect(ch.terminate).toHaveBeenCalled();
    }
  });

  it("waits the exact INIT_RETRY_DELAYS_MS between attempts (not earlier)", async () => {
    const { factory, created } = makeChannelFactory(
      { kind: "uciOkFails" },
      { kind: "uciOkFails" },
      { kind: "success" },
    );
    vi.useFakeTimers();
    const engine = new ChessEngine(factory);
    const moveP = engine.getBestMove(STARTING_FEN);

    await vi.advanceTimersByTimeAsync(INIT_RETRY_DELAYS_MS[0] - 1);
    expect(created).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(created).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(INIT_RETRY_DELAYS_MS[1] - 1);
    expect(created).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(created).toHaveLength(3);

    const move = await moveP;
    expect(move).toBe("e2e4");
  });

  it("retries when readyok fails, not just uciok (both are init-phase failures)", async () => {
    const { factory, created } = makeChannelFactory(
      { kind: "readyOkFails", reason: "readyok-transient" },
      { kind: "success" },
    );
    vi.useFakeTimers();
    const engine = new ChessEngine(factory);
    const moveP = engine.getBestMove(STARTING_FEN);
    await vi.advanceTimersByTimeAsync(INIT_RETRY_DELAYS_MS[0]);
    await expect(moveP).resolves.toBe("e2e4");
    expect(created).toHaveLength(2);
  });
});

describe("ChessEngine getBestMove — not retried", () => {
  it("propagates a bestmove failure on the first attempt without retrying", async () => {
    const { factory, created } = makeChannelFactory({
      kind: "bestMoveFails",
      reason: "engine crashed mid-search",
    });
    const engine = new ChessEngine(factory);
    await expect(engine.getBestMove(STARTING_FEN)).rejects.toThrow(
      /engine crashed mid-search/,
    );

    // Exactly one channel was constructed — the retry loop must NOT cover
    // getBestMove failures.
    expect(created).toHaveLength(1);
  });
});

describe("ChessEngine — instance isolation", () => {
  it("two ChessEngine instances each use their own channel factory and state", async () => {
    const { factory: factoryA, created: createdA } = makeChannelFactory({
      kind: "success",
    });
    const { factory: factoryB, created: createdB } = makeChannelFactory({
      kind: "success",
    });

    const engineA = new ChessEngine(factoryA);
    const engineB = new ChessEngine(factoryB);

    await engineA.getBestMove(STARTING_FEN);
    await engineB.getBestMove(STARTING_FEN);

    expect(createdA).toHaveLength(1);
    expect(createdB).toHaveLength(1);
    // Neither factory leaked into the other engine.
    expect(createdA[0]).not.toBe(createdB[0]);
  });

  it("destroy() tears down the channel and resets init state", async () => {
    const { factory, created } = makeChannelFactory(
      { kind: "success" },
      { kind: "success" },
    );
    const engine = new ChessEngine(factory);
    await engine.getBestMove(STARTING_FEN);
    expect(created).toHaveLength(1);

    await engine.destroy();
    expect(created[0].terminate).toHaveBeenCalledTimes(1);
    expect(engine.isReady).toBe(false);

    // After destroy, a subsequent getBestMove must spin up a fresh channel.
    await engine.getBestMove(STARTING_FEN);
    expect(created).toHaveLength(2);
  });
});
