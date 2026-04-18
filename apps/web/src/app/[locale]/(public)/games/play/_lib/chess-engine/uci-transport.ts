import { parseUciResponse } from '@blindfold-chess/features/ai-game';

type InfoHandler = (message: string) => void;

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
 * that response type.
 */
export class UciTransport {
  private worker: Worker | null = null;
  private uciOkResolver: (() => void) | null = null;
  private readyOkResolver: (() => void) | null = null;
  private bestMoveResolver: ((move: string | undefined) => void) | null = null;
  private infoHandler: InfoHandler | null = null;

  constructor(workerPath: string) {
    // NOTE: This generates a Turbopack warning "TP1001: new Worker(...) is not statically analyse-able"
    // This is expected behavior as we're loading an external Stockfish WebAssembly file from public/
    // The warning doesn't affect functionality and can be safely ignored
    this.worker = new Worker(workerPath);
    this.worker.onmessage = (event) => this.handleMessage(event.data);
    this.worker.onerror = (error) => {
      console.error('Worker error:', error);
      const errorMessage =
        error instanceof ErrorEvent
          ? error.message || error.error?.message || 'Unknown error'
          : String(error);
      throw new Error(`Worker error: ${errorMessage}`);
    };
  }

  /** Fire-and-forget command post. */
  send(command: string): void {
    this.worker?.postMessage(command);
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

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.bestMoveResolver = null;
        reject(new Error(`Engine command timeout: ${goCommand}`));
      }, timeoutMs);

      this.bestMoveResolver = (move) => {
        clearTimeout(timeoutId);
        resolve(move);
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
    this.bestMoveResolver = null;
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.uciOkResolver = null;
    this.readyOkResolver = null;
    this.bestMoveResolver = null;
    this.infoHandler = null;
  }

  private async awaitResponse(
    slot: 'uciOkResolver' | 'readyOkResolver',
    command: string,
    timeoutMs: number
  ): Promise<void> {
    if (!this.worker) throw new Error('Engine not initialized');

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this[slot] = null;
        reject(new Error(`Engine command timeout: ${command}`));
      }, timeoutMs);

      this[slot] = () => {
        clearTimeout(timeoutId);
        resolve();
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
          this.uciOkResolver = null;
          resolver();
        }
        break;
      }
      case 'readyok': {
        const resolver = this.readyOkResolver;
        if (resolver) {
          this.readyOkResolver = null;
          resolver();
        }
        break;
      }
      case 'bestmove': {
        const resolver = this.bestMoveResolver;
        if (resolver) {
          this.bestMoveResolver = null;
          resolver(parsed.move);
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
