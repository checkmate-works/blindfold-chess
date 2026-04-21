import { parseUciResponse } from '@blindfold-chess/features/ai-game';

type InfoHandler = (message: string) => void;

type PendingResolver<T> = {
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

/**
 * Low-level UCI transport.
 *
 * Wraps a Stockfish Web Worker and exposes a small, typed API for the
 * synchronous UCI flow used by `ChessEngine`:
 *
 * - `waitForUciOk` / `waitForReadyOk` — await the handshake responses
 * - `waitForBestMove`                — await the `bestmove` response
 * - `send`                           — fire-and-forget command post
 * - `subscribeInfo`                  — stream `info` lines during evaluation
 * - `destroy`                        — terminate the underlying worker
 *
 * Internally it uses typed one-shot resolvers instead of a string-keyed
 * callback map: each "await X" call atomically claims the resolver slot for
 * that response type. Each slot holds both a resolve and a reject callback
 * plus its timeout handle so that fatal Worker errors (`onerror` /
 * `onmessageerror`) can reject all pending awaiters promptly instead of
 * letting them run out the full timeout with a misleading "command timeout"
 * message.
 */
export class UciTransport {
  private worker: Worker | null = null;
  private uciOkResolver: PendingResolver<void> | null = null;
  private readyOkResolver: PendingResolver<void> | null = null;
  private bestMoveResolver: PendingResolver<string | undefined> | null = null;
  private infoHandler: InfoHandler | null = null;

  constructor(workerPath: string) {
    // NOTE: This generates a Turbopack warning "TP1001: new Worker(...) is not statically analyse-able"
    // This is expected behavior as we're loading an external Stockfish WebAssembly file from public/
    // The warning doesn't affect functionality and can be safely ignored
    this.worker = new Worker(workerPath);
    this.worker.onmessage = (event) => this.handleMessage(event.data);
    this.worker.onerror = (error) => {
      const errorMessage =
        error instanceof ErrorEvent
          ? error.message || error.error?.message || 'Unknown error'
          : String(error);
      const err = new Error(`Worker error: ${errorMessage}`);
      // Preserve observability — `onerror` is the only place the DOM
      // surfaces Worker-level failures to us.
      console.error('Worker error:', error);
      this.failPending(err);
      // The worker is effectively dead after an `onerror`; terminate it and
      // null the reference so the owning `ChessEngine` can detect the dead
      // transport and spin up a fresh one on the next call.
      this.worker?.terminate();
      this.worker = null;
    };
    this.worker.onmessageerror = (event) => {
      const err = new Error('Worker message deserialization failed');
      console.error('Worker message error:', event);
      this.failPending(err);
      this.worker?.terminate();
      this.worker = null;
    };
  }

  /** Fire-and-forget command post. */
  send(command: string): void {
    if (!this.worker) {
      throw new Error('Engine not initialized');
    }
    this.worker.postMessage(command);
  }

  /** Send `uci` and resolve when the engine replies with `uciok`. */
  async waitForUciOk(timeoutMs = 10000): Promise<void> {
    return this.awaitResponse('uciOkResolver', 'uci', timeoutMs);
  }

  /** Send `isready` and resolve when the engine replies with `readyok`. */
  async waitForReadyOk(timeoutMs = 10000): Promise<void> {
    return this.awaitResponse('readyOkResolver', 'isready', timeoutMs);
  }

  /**
   * Send the given `go ...` command and resolve with the UCI move string
   * from the subsequent `bestmove` response.
   */
  async waitForBestMove(goCommand: string, timeoutMs = 10000): Promise<string | undefined> {
    if (!this.worker) throw new Error('Engine not initialized');

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

      this.worker?.postMessage(goCommand);
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

  /** True once the underlying Worker has been torn down (fatal error or destroy). */
  isDead(): boolean {
    return this.worker === null;
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    // Clear any in-flight timers so a pending Promise does not linger past
    // destruction. We null the slot without rejecting because `destroy()` is
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
   * Reject every pending awaiter with the given reason. Invoked from the
   * Worker's `onerror` / `onmessageerror` handlers so callers see the actual
   * failure instead of waiting out the per-command timeout and reporting a
   * misleading "Engine command timeout: uci" error.
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
    slot: 'uciOkResolver' | 'readyOkResolver',
    command: string,
    timeoutMs: number
  ): Promise<void> {
    if (!this.worker) throw new Error('Engine not initialized');

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

      this.worker?.postMessage(command);
    });
  }

  private handleMessage(message: string): void {
    // Ignore error messages from the worker here — they are non-fatal strings
    // that the caller's own error channel is responsible for logging.
    if (message.startsWith('Error:') || message.startsWith('Worker Error:')) {
      console.error('Engine worker error:', message);
      return;
    }

    const parsed = parseUciResponse(message);
    if (!parsed) return;

    switch (parsed.type) {
      case 'uciok': {
        const resolver = this.uciOkResolver;
        if (resolver) {
          resolver.resolve();
        }
        break;
      }
      case 'readyok': {
        const resolver = this.readyOkResolver;
        if (resolver) {
          resolver.resolve();
        }
        break;
      }
      case 'bestmove': {
        const resolver = this.bestMoveResolver;
        if (resolver) {
          resolver.resolve(parsed.move);
        }
        break;
      }
      case 'info': {
        this.infoHandler?.(message);
        break;
      }
    }
  }
}
