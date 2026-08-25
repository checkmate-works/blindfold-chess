import { parseUciResponse } from "../uci-protocol";

import type { UciMessageChannel } from "./message-channel";
import { PendingRequests } from "./pending-requests";

type InfoHandler = (message: string) => void;

/**
 * Keys under which the handshake responses are awaited. UCI allows only one
 * `uci` / `isready` roundtrip to be outstanding at a time, so a constant key
 * per response type is the whole correlation scheme this protocol needs.
 */
const UCI_OK = "uciok";
const READY_OK = "readyok";
const BEST_MOVE = "bestmove";

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
 * Request bookkeeping — the resolver slots, their per-command deadlines, and
 * rejecting every awaiter when the channel dies — lives in
 * {@link PendingRequests}. Two registries rather than one because the awaited
 * values differ: the handshake responses carry nothing, `bestmove` carries the
 * move string. Fatal channel errors (`onError`) reject all awaiters in both,
 * promptly, instead of letting them run out the full timeout and report a
 * misleading "command timeout".
 */
export class UciTransport {
  private channel: UciMessageChannel | null = null;
  private unsubscribeMessage: (() => void) | null = null;
  private unsubscribeError: (() => void) | null = null;
  private handshakeRequests = new PendingRequests<void>();
  private bestMoveRequests = new PendingRequests<string | undefined>();
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
    return this.awaitHandshake(UCI_OK, "uci", timeoutMs);
  }

  /** Send `isready` and resolve when the engine replies with `readyok`. */
  async waitForReadyOk(timeoutMs = 10000): Promise<void> {
    return this.awaitHandshake(READY_OK, "isready", timeoutMs);
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

    return this.bestMoveRequests.request(BEST_MOVE, {
      timeoutMs,
      timeoutMessage: `Engine command timeout: ${goCommand}`,
      dispatch: () => channel.send(goCommand),
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
    this.bestMoveRequests.abandonAll();
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
    // destruction. Slots are dropped without rejecting because `destroy()` is
    // expected teardown, not a failure the awaiter needs to observe.
    this.handshakeRequests.abandonAll();
    this.bestMoveRequests.abandonAll();
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
    this.handshakeRequests.failAll(error);
    this.bestMoveRequests.failAll(error);
  }

  private tearDown(): void {
    this.unsubscribeMessage?.();
    this.unsubscribeMessage = null;
    this.unsubscribeError?.();
    this.unsubscribeError = null;
    this.channel = null;
  }

  private async awaitHandshake(
    key: typeof UCI_OK | typeof READY_OK,
    command: string,
    timeoutMs: number,
  ): Promise<void> {
    if (!this.channel) throw new Error("Engine not initialized");
    const channel = this.channel;

    return this.handshakeRequests.request(key, {
      timeoutMs,
      timeoutMessage: `Engine command timeout: ${command}`,
      dispatch: () => channel.send(command),
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
        this.handshakeRequests.settle(UCI_OK, undefined);
        break;
      }
      case "readyok": {
        this.handshakeRequests.settle(READY_OK, undefined);
        break;
      }
      case "bestmove": {
        this.bestMoveRequests.settle(BEST_MOVE, parsed.move);
        break;
      }
      case "info": {
        this.infoHandler?.(message);
        break;
      }
    }
  }
}
