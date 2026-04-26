/**
 * Platform-specific byte-level transport that `UciTransport` speaks over.
 *
 * Apps implement this interface once per platform:
 * - Web wraps a Stockfish Web Worker (`new Worker(workerPath)`).
 * - Mobile will wrap a WebView bridge (Phase 2).
 *
 * The interface intentionally has no chess / UCI semantics — it just moves
 * UTF-8 strings between the app and the engine process. `UciTransport`
 * layers the UCI protocol (handshake, `bestmove`, `info`, timeouts) on top.
 *
 * Expected contract:
 * - `send(command)` — fire-and-forget post to the engine. Must throw synchronously
 *   if the underlying transport has been terminated.
 * - `onMessage(handler)` — register a string-receiving handler. Returns an
 *   unsubscribe function. Multiple handlers MAY be registered simultaneously;
 *   implementations are expected to call every registered handler.
 * - `onError(handler)` — register a handler for fatal transport errors. The
 *   channel is considered dead after any registered `onError` handler is
 *   invoked; subsequent `send()` calls must throw.
 * - `terminate()` — tear down the underlying worker / bridge. Idempotent.
 */
export interface UciMessageChannel {
  send(command: string): void;
  onMessage(handler: (message: string) => void): () => void;
  onError(handler: (error: Error) => void): () => void;
  terminate(): void;
}
