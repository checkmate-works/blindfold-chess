import { ChessEngine } from '@blindfold-chess/features/ai-game/engine';

import { createWorkerMessageChannel } from './worker-message-channel';

export { ChessEngine };

/**
 * Web-app-local singleton + lifecycle helpers for the shared `ChessEngine`.
 *
 * The engine class itself is framework-agnostic and lives in
 * `@blindfold-chess/features/ai-game/engine`; all that remains here is:
 * - choosing the `/stockfish.js` worker path (a `apps/web/public/` asset),
 * - constructing a Worker-backed `UciMessageChannel` per init attempt,
 * - caching ONE engine instance per browser tab.
 *
 * Singleton management is intentionally web-local because `/stockfish.js` is
 * a web-public-folder path; mobile (Phase 2) will plug its own adapter.
 */

const WORKER_PATH = '/stockfish.js';

let engineInstance: ChessEngine | null = null;

export function getChessEngine(): ChessEngine {
  // Only create instance in browser environment.
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    throw new Error('Chess engine can only be created in browser environment');
  }

  if (!engineInstance) {
    engineInstance = new ChessEngine(() => createWorkerMessageChannel(WORKER_PATH));
  }
  return engineInstance;
}

/**
 * Tears down the current singleton and forces the next `getChessEngine()`
 * call to construct a fresh one. Used by the UI "Retry" affordance to
 * recover from a dead Worker after a fatal engine error.
 *
 * `useAiVersus` re-acquires the singleton on every engine invocation, so the
 * next call after a reset will observe the newly-constructed instance.
 * Callers that cache the result of `getChessEngine()` across resets would
 * continue to hold the torn-down reference and defeat this recovery path —
 * don't do that.
 *
 * `ChessEngine#destroy()` alone resets per-instance state but not the
 * module-level singleton, which would otherwise keep handing callers the
 * broken instance.
 */
export async function resetChessEngine(): Promise<void> {
  if (engineInstance) {
    await engineInstance.destroy();
    engineInstance = null;
  }
}
