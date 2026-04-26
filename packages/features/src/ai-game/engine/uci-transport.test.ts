/**
 * Unit tests for {@link UciTransport}, focused on the fatal-error recovery
 * path — the same behaviour the web test suite validated in the original
 * `uci-transport.test.ts`. Here the tests drive the shared, platform-agnostic
 * class directly against a fake `UciMessageChannel`, so they exercise the
 * real protocol state machine without needing a DOM Worker.
 *
 * The key assertion the production bug (web commit 362a7f6d) hinged on: when
 * the channel fires `onError`, every awaiter must reject **immediately** with
 * a message that identifies the channel failure — not with a 10-second
 * "Engine command timeout" that masked the real cause in Sentry.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import type { UciMessageChannel } from "./message-channel";
import { UciTransport } from "./uci-transport";

type FakeChannelHandle = {
  channel: UciMessageChannel;
  send: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  /** Fire a simulated fatal error on the channel (e.g., Worker onerror). */
  fireError: (reason: string) => void;
};

function createChannel(): FakeChannelHandle {
  const messageHandlers = new Set<(msg: string) => void>();
  const errorHandlers = new Set<(err: Error) => void>();
  let terminated = false;

  const send = vi.fn((_command: string) => {
    if (terminated) {
      throw new Error("channel already terminated");
    }
    // In this test suite we never need to auto-respond — the tests control
    // timing explicitly via `fireError`.
  });
  const terminate = vi.fn(() => {
    terminated = true;
  });

  const channel: UciMessageChannel = {
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

  const fireError = (reason: string) => {
    const err = new Error(reason);
    for (const h of errorHandlers) h(err);
  };

  return { channel, send, terminate, fireError };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("UciTransport — channel error path", () => {
  it("rejects a pending waitForUciOk() with the channel error (not a timeout) when onError fires", async () => {
    const h = createChannel();
    const transport = new UciTransport(h.channel);

    const uciOkPromise = transport.waitForUciOk();

    h.fireError("wasm fetch failed");

    await expect(uciOkPromise).rejects.toThrow(/wasm fetch failed/);
    await expect(uciOkPromise).rejects.not.toThrow(/Engine command timeout/);
  });

  it("rejects a pending waitForReadyOk() with the channel error when onError fires", async () => {
    const h = createChannel();
    const transport = new UciTransport(h.channel);

    const readyOkPromise = transport.waitForReadyOk();
    h.fireError("boom");

    await expect(readyOkPromise).rejects.toThrow(/boom/);
  });

  it("rejects a pending waitForBestMove() with the channel error when onError fires", async () => {
    const h = createChannel();
    const transport = new UciTransport(h.channel);

    const bestMovePromise = transport.waitForBestMove("go movetime 1000");
    h.fireError("fatal");

    await expect(bestMovePromise).rejects.toThrow(/fatal/);
    await expect(bestMovePromise).rejects.not.toThrow(/Engine command timeout/);
  });

  it("rejects all three pending awaiters simultaneously on a single onError", async () => {
    const h = createChannel();
    const transport = new UciTransport(h.channel);

    const uciOkPromise = transport.waitForUciOk();
    const readyOkPromise = transport.waitForReadyOk();
    const bestMovePromise = transport.waitForBestMove("go movetime 1000");

    h.fireError("catastrophic");

    await expect(uciOkPromise).rejects.toThrow(/catastrophic/);
    await expect(readyOkPromise).rejects.toThrow(/catastrophic/);
    await expect(bestMovePromise).rejects.toThrow(/catastrophic/);
  });

  it("rejects pending awaiters promptly — no fake-timer advance required", async () => {
    vi.useFakeTimers();

    const h = createChannel();
    const transport = new UciTransport(h.channel);

    const uciOkPromise = transport.waitForUciOk();
    const rejected = uciOkPromise.catch((err: unknown) => err as Error);

    h.fireError("prompt");

    // CRITICAL: No advanceTimersByTime. Rejection must come from the channel's
    // error path, not the 10s handshake timeout.
    const err = await rejected;
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/prompt/);
    expect((err as Error).message).not.toMatch(/timeout/i);
  });

  it("marks the transport dead after onError fires", () => {
    const h = createChannel();
    const transport = new UciTransport(h.channel);

    expect(transport.isDead()).toBe(false);

    h.fireError("boom");

    expect(transport.isDead()).toBe(true);
  });

  it('send() throws "Engine not initialized" on a dead transport', () => {
    const h = createChannel();
    const transport = new UciTransport(h.channel);
    h.fireError("boom");

    expect(() => transport.send("uci")).toThrow(/Engine not initialized/);
  });

  it('waitForBestMove() throws "Engine not initialized" on a dead transport', async () => {
    const h = createChannel();
    const transport = new UciTransport(h.channel);
    h.fireError("boom");

    await expect(transport.waitForBestMove("go movetime 1000")).rejects.toThrow(
      /Engine not initialized/,
    );
  });

  it('waitForUciOk() throws "Engine not initialized" on a dead transport', async () => {
    const h = createChannel();
    const transport = new UciTransport(h.channel);
    h.fireError("boom");

    await expect(transport.waitForUciOk()).rejects.toThrow(
      /Engine not initialized/,
    );
  });
});

describe("UciTransport — destroy() behaviour", () => {
  it("terminates the channel and clears in-flight timers without rejecting pending awaiters", async () => {
    vi.useFakeTimers();
    const h = createChannel();
    const transport = new UciTransport(h.channel);

    // Start a pending awaiter; destroy() is expected teardown (not an error)
    // so the resolver is just nulled. The caller's Promise never settles,
    // which matches the docstring on `destroy()`.
    const uciOkPromise = transport.waitForUciOk();
    const settled = Promise.race([
      uciOkPromise.then(() => "resolved").catch(() => "rejected"),
      new Promise<string>((r) => setTimeout(() => r("pending"), 1)),
    ]);

    transport.destroy();
    expect(h.terminate).toHaveBeenCalledTimes(1);
    expect(transport.isDead()).toBe(true);

    // Advance past the 10s UCI timeout: destroy() cleared the timer, so the
    // Promise does not reject; the 1ms fallback wins the race.
    await vi.advanceTimersByTimeAsync(11_000);
    await vi.advanceTimersByTimeAsync(2);
    const outcome = await settled;
    expect(outcome).toBe("pending");
  });
});

describe("UciTransport — message parsing", () => {
  it("resolves waitForUciOk when the channel delivers `uciok`", async () => {
    const h = createChannel();
    // Capture the onMessage handler so we can push messages through it.
    const handlers: Array<(msg: string) => void> = [];
    const orig = h.channel.onMessage;
    (h.channel as UciMessageChannel).onMessage = (handler) => {
      handlers.push(handler);
      return orig.call(h.channel, handler);
    };

    const transport = new UciTransport(h.channel);
    const p = transport.waitForUciOk();
    // Fire the uciok response.
    queueMicrotask(() => {
      for (const fn of handlers) fn("uciok");
    });
    await expect(p).resolves.toBeUndefined();
  });

  it("ignores non-UCI messages and non-parseable strings", async () => {
    const h = createChannel();
    const handlers: Array<(msg: string) => void> = [];
    const orig = h.channel.onMessage;
    (h.channel as UciMessageChannel).onMessage = (handler) => {
      handlers.push(handler);
      return orig.call(h.channel, handler);
    };

    const transport = new UciTransport(h.channel);
    const p = transport.waitForUciOk(50);

    // Feed in garbage + error-shaped lines; none of them should resolve uciok.
    queueMicrotask(() => {
      for (const fn of handlers) {
        fn("garbage line");
        fn("Error: something bad happened");
        fn("info depth 5 seldepth 3");
      }
    });

    await expect(p).rejects.toThrow(/Engine command timeout: uci/);
  });
});
