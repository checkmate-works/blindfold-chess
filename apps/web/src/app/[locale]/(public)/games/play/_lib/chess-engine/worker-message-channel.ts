import type { UciMessageChannel } from '@blindfold-chess/features/ai-game/engine';

/**
 * Web-side `UciMessageChannel` implementation backed by a Stockfish Web Worker.
 *
 * The Worker runs the WASM Stockfish binary loaded from `/stockfish.js` in
 * `apps/web/public/`. This adapter is the only chunk of web-specific code
 * left in the chess-engine layer — the rest (UCI protocol state machine,
 * retry loop, orchestration) lives in
 * `@blindfold-chess/features/ai-game/engine`.
 */
export function createWorkerMessageChannel(workerPath: string): UciMessageChannel {
  // NOTE: This generates a Turbopack warning "TP1001: new Worker(...) is not
  // statically analyse-able" — expected because we're loading the external
  // Stockfish WebAssembly binary from `public/`. The warning is benign.
  let worker: Worker | null = new Worker(workerPath);
  const messageHandlers = new Set<(message: string) => void>();
  const errorHandlers = new Set<(error: Error) => void>();

  const dispatchError = (error: Error) => {
    // Preserve observability — `onerror` is the only place the DOM surfaces
    // Worker-level failures to us.
    console.error('Worker error:', error);
    for (const h of errorHandlers) h(error);
  };

  worker.onmessage = (event: MessageEvent) => {
    const message = event.data as string;
    for (const h of messageHandlers) h(message);
  };
  worker.onerror = (event: ErrorEvent | Event) => {
    const message =
      event instanceof ErrorEvent
        ? event.message || event.error?.message || 'Unknown error'
        : String(event);
    dispatchError(new Error(`Worker error: ${message}`));
  };
  worker.onmessageerror = () => {
    dispatchError(new Error('Worker message deserialization failed'));
  };

  return {
    send(command) {
      if (!worker) throw new Error('channel already terminated');
      worker.postMessage(command);
    },
    onMessage(handler) {
      messageHandlers.add(handler);
      return () => {
        messageHandlers.delete(handler);
      };
    },
    onError(handler) {
      errorHandlers.add(handler);
      return () => {
        errorHandlers.delete(handler);
      };
    },
    terminate() {
      if (worker) {
        worker.terminate();
        worker = null;
      }
      messageHandlers.clear();
      errorHandlers.clear();
    },
  };
}
