import { parseUciResponse } from "../uci-protocol";

import type { UciMessageChannel } from "./message-channel";

type InfoHandler = (message: string) => void;

type PendingResolver<T> = {
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

/**
 * Framework-agnostic UCI protocol state machine. Wraps a {@link UciMessageChannel}
 * (platform-specific byte pipe) and exposes a small, typed API for the
 * synchronous UCI flow used by `ChessEngine`:
 *
 * - `waitForUciOk` / `waitForReadyOk` — await the handshake responses
 * - `waitForBestMove`                — await the `bestmove` response
 * - `send`                           — fire-and-forget command post
 * - `subscribeInfo`                  — stream `info` lines during evaluation
 * - `destroy`                        — terminate the underlying channel
 *
 * Uses typed one-shot resolvers instead of a string-keyed callback map: each
 * "await X" call atomically claims the resolver slot for that response type.
 * Each slot holds both a resolve and a reject callback plus its timeout handle
 * so that fatal channel errors (`onError`) can reject all pending awaiters
 * promptly instead of letting them run out the full timeout with a misleading
 * "command timeout" message.
 */
export class UciTransport {
  private channel: UciMessageChannel | null = null;
  private unsubscribeMessage: (() => void) | null = null;
  private unsubscribeError: (() => void) | null = null;
  private uciOkResolver: PendingResolver<void> | null = null;
  private readyOkResolver: PendingResolver<void> | null = null;
  private bestMoveResolver: PendingResolver<string | undefined> | null = null;
  private infoHandler: InfoHandler | null = null;

  constructor(channel: UciMessageChannel) {
    this.channel = channel;
    this.unsubscribeMessage = channel.onMessage((msg) =>
      this.handleMessage(msg),
    );
    this.unsubscribeError = channel.onError((err) =>
      this.handleFatalError(err),
    );
  }

  /** Fire-and-forget command post. */
  send(command: string): void {
    if (!this.channel) {
      throw new Error("Engine not initialized");
    }
    this.channel.send(command);
  }

  /** Send `uci` and resolve when the engine replies with `uciok`. */
  async waitForUciOk(timeoutMs = 10000): Promise<void> {
    return this.awaitResponse("uciOkResolver", "uci", timeoutMs);
  }

  /** Send `isready` and resolve when the engine replies with `readyok`. */
  async waitForReadyOk(timeoutMs = 10000): Promise<void> {
    return this.awaitResponse("readyOkResolver", "isready", timeoutMs);
  }

  /**
   * Send the given `go ...` command and resolve with the UCI move string
   * from the subsequent `bestmove` response.
   */
  async waitForBestMove(
    goCommand: string,
    timeoutMs = 10000,
  ): Promise<string | undefined> {
    if (!this.channel) throw new Error("Engine not initialized");
    const channel = this.channel;

    return new Promise<string | undefined>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.bestMoveResolver = null;
        reject(new Error(`Engine command timeout: ${goCommand}`));
      }, timeoutMs);

      this.bestMoveResolver = {
        resolve: (move) => {
          clearTimeout(timer);
          this.bestMoveResolver = null;
          resolve(move);
        },
        reject: (reason) => {
          clearTimeout(timer);
          this.bestMoveResolver = null;
          reject(reason);
        },
        timer,
      };

      channel.send(goCommand);
    });
  }

  /**
   * Register a streaming handler for UCI `info` lines. Returns an unsubscribe
   * function; only one subscriber is supported at a time.
   */
  subscribeInfo(handler: InfoHandler): () => void {
    this.infoHandler = handler;
    return () => {
      if (this.infoHandler === handler) {
        this.infoHandler = null;
      }
    };
  }

  /** Abandon any in-flight `bestmove` resolver. */
  clearBestMoveResolver(): void {
    const pending = this.bestMoveResolver;
    if (pending) {
      clearTimeout(pending.timer);
      this.bestMoveResolver = null;
    }
  }

  /** True once the underlying channel has been torn down (fatal error or destroy). */
  isDead(): boolean {
    return this.channel === null;
  }

  destroy(): void {
    if (this.channel) {
      this.channel.terminate();
    }
    this.tearDown();
    // Clear any in-flight timers so a pending Promise does not linger past
    // destruction. Slots are nulled without rejecting because `destroy()` is
    // expected teardown, not a failure the awaiter needs to observe.
    if (this.uciOkResolver) {
      clearTimeout(this.uciOkResolver.timer);
      this.uciOkResolver = null;
    }
    if (this.readyOkResolver) {
      clearTimeout(this.readyOkResolver.timer);
      this.readyOkResolver = null;
    }
    if (this.bestMoveResolver) {
      clearTimeout(this.bestMoveResolver.timer);
      this.bestMoveResolver = null;
    }
    this.infoHandler = null;
  }

  /**
   * Channel-level fatal error: terminate the channel, tear down subscriptions,
   * and propagate to every pending awaiter. Invoked from the channel's
   * `onError` callback so callers see the actual failure instead of waiting
   * out the per-command timeout. Terminating the channel here (rather than
   * leaving it to the channel's own error path) keeps lifecycle ownership
   * unambiguous: once constructed, the transport owns the channel.
   */
  private handleFatalError(error: Error): void {
    const channel = this.channel;
    this.tearDown();
    // Terminate the channel AFTER unsubscribing our own handlers, so we never
    // re-enter `handleFatalError` from a channel that also self-fires on
    // termination.
    if (channel) {
      try {
        channel.terminate();
      } catch {
        // Terminate errors are swallowed — the channel is already in a
        // failure state; the original error is what the caller cares about.
      }
    }
    this.failPending(error);
  }

  private tearDown(): void {
    this.unsubscribeMessage?.();
    this.unsubscribeMessage = null;
    this.unsubscribeError?.();
    this.unsubscribeError = null;
    this.channel = null;
  }

  /**
   * Reject every pending awaiter with the given reason. Triggered from the
   * channel's error path so pending resolvers don't hang past the 10s timeout.
   */
  private failPending(reason: Error): void {
    const uciOk = this.uciOkResolver;
    const readyOk = this.readyOkResolver;
    const bestMove = this.bestMoveResolver;
    this.uciOkResolver = null;
    this.readyOkResolver = null;
    this.bestMoveResolver = null;
    if (uciOk) {
      clearTimeout(uciOk.timer);
      uciOk.reject(reason);
    }
    if (readyOk) {
      clearTimeout(readyOk.timer);
      readyOk.reject(reason);
    }
    if (bestMove) {
      clearTimeout(bestMove.timer);
      bestMove.reject(reason);
    }
  }

  private async awaitResponse(
    slot: "uciOkResolver" | "readyOkResolver",
    command: string,
    timeoutMs: number,
  ): Promise<void> {
    if (!this.channel) throw new Error("Engine not initialized");
    const channel = this.channel;

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this[slot] = null;
        reject(new Error(`Engine command timeout: ${command}`));
      }, timeoutMs);

      this[slot] = {
        resolve: () => {
          clearTimeout(timer);
          this[slot] = null;
          resolve();
        },
        reject: (reason) => {
          clearTimeout(timer);
          this[slot] = null;
          reject(reason);
        },
        timer,
      };

      channel.send(command);
    });
  }

  private handleMessage(message: string): void {
    // Ignore error-shaped strings from the engine here — they are non-fatal
    // prints the caller's own error channel is responsible for logging.
    if (message.startsWith("Error:") || message.startsWith("Worker Error:")) {
      console.error("Engine error:", message);
      return;
    }

    const parsed = parseUciResponse(message);
    if (!parsed) return;

    switch (parsed.type) {
      case "uciok": {
        const resolver = this.uciOkResolver;
        if (resolver) {
          resolver.resolve();
        }
        break;
      }
      case "readyok": {
        const resolver = this.readyOkResolver;
        if (resolver) {
          resolver.resolve();
        }
        break;
      }
      case "bestmove": {
        const resolver = this.bestMoveResolver;
        if (resolver) {
          resolver.resolve(parsed.move);
        }
        break;
      }
      case "info": {
        this.infoHandler?.(message);
        break;
      }
    }
  }
}
