import { PendingRequests } from '@blindfold-chess/features/ai-game/engine';
import {
  type MaiaConfig,
  decodeMaia3Output,
  preprocessForMaia3,
} from '@blindfold-chess/features/ai-game/maia';
import { type ChessOpponent, err, ok } from '@blindfold-chess/features/ai-game/opponent';

import { DEFAULT_MAIA_MODEL_URL } from './models';
import type {
  MaiaWorkerInferRequest,
  MaiaWorkerInitRequest,
  MaiaWorkerRequest,
  MaiaWorkerResponse,
} from './worker-protocol';

export type MaiaOpponentConfig = MaiaConfig & {
  /**
   * Override the ONNX model URL. Defaults to the auth-gated route handler
   * at `/api/engines/maia/[file]`. Useful for tests or to point at a
   * mirrored CDN copy.
   */
  modelUrl?: string;
};

type MaiaInferenceLogits = {
  policyLogits: Float32Array;
  valueLogits: Float32Array;
};

/**
 * Deadline for `init` → `ready`, which covers fetching the ~46 MB ONNX model
 * and creating the onnxruntime session. Generous because the download runs
 * over whatever connection the player happens to be on, and a slow phone on
 * a train is the normal case rather than the pathological one — the deadline
 * exists to bound a worker that has stopped answering entirely, not to
 * enforce a performance budget.
 */
export const MAIA_INIT_TIMEOUT_MS = 120_000;

/**
 * Deadline for a single `infer` → `inferred` roundtrip. A Maia 3 forward pass
 * is tens of milliseconds once the session is warm, so two orders of magnitude
 * of headroom still leaves an unanswered request detectable well inside the
 * player's patience.
 */
export const MAIA_INFERENCE_TIMEOUT_MS = 20_000;

/**
 * Key for the single outstanding model-initialisation request. Unlike
 * inference, only one `init` is ever in flight (its promise is cached and
 * shared by every concurrent caller), so a constant key suffices.
 */
const INIT_REQUEST_KEY = 'init';

/**
 * Construct a fresh Maia-backed {@link ChessOpponent}.
 *
 * Each call spawns its own dedicated Web Worker that runs onnxruntime-web
 * with the Maia 3 ONNX model. Model load is **lazy**: the worker is
 * created eagerly but `init` is only fired (and the 46 MB model fetched)
 * on the first `getBestMove` call. That keeps construction cheap and
 * means we don't pay the download cost for an opponent that the user
 * abandons before making a move.
 *
 * Concurrent `getBestMove` calls are correlated by an integer `requestId`
 * stamped on the request and echoed in the response. In practice the
 * upper layer (`useAiVersus`-style hook) serialises moves itself, so the
 * registry will rarely hold more than one entry — but the protocol supports
 * concurrency cleanly.
 *
 * Every request the adapter makes of the worker is bounded, and every
 * outstanding request is failed when the worker dies, because this opponent
 * sits directly under the "it is the AI's turn" state in the UI: a promise
 * that never settles is not a slow move, it is a game the player can no
 * longer continue and cannot diagnose. Both protections come from the shared
 * {@link PendingRequests} registry, the same one the Stockfish UCI transport
 * uses.
 */
export function createMaiaOpponent(config: MaiaOpponentConfig): ChessOpponent {
  const modelUrl = config.modelUrl ?? DEFAULT_MAIA_MODEL_URL;
  const worker = new Worker(new URL('./worker/maia.worker.ts', import.meta.url), {
    type: 'module',
  });

  const initialization = new PendingRequests<void>();
  const inferences = new PendingRequests<MaiaInferenceLogits>();
  let nextRequestId = 0;
  let initPromise: Promise<void> | null = null;
  /**
   * Set when the Worker itself fails (`error` event) rather than reporting a
   * failure over the protocol. The worker is unrecoverable at that point —
   * nothing we post to it will ever be answered — so the error is latched and
   * replayed to later callers instead of letting them wait out a fresh
   * initialisation deadline against a corpse.
   */
  let fatalWorkerError: Error | null = null;
  let destroyed = false;

  worker.addEventListener('message', (event: MessageEvent<MaiaWorkerResponse>) => {
    const msg = event.data;
    if (msg.type === 'ready') {
      initialization.settle(INIT_REQUEST_KEY, undefined);
      return;
    }
    if (msg.type === 'inferred') {
      inferences.settle(msg.requestId, {
        policyLogits: msg.policyLogits,
        valueLogits: msg.valueLogits,
      });
      return;
    }
    if (msg.type === 'error') {
      // A `requestId` ties the failure to one inference; its absence means the
      // worker failed globally, which can only be the model load.
      if (msg.requestId === undefined) {
        initialization.fail(INIT_REQUEST_KEY, new Error(msg.message));
      } else {
        inferences.fail(msg.requestId, new Error(msg.message));
      }
    }
  });

  worker.addEventListener('error', (event: ErrorEvent) => {
    const error = new Error(event.message || 'Maia worker crashed');
    fatalWorkerError = error;
    // Fail everything in flight — including a model load, which is awaited
    // through the same registry precisely so that a worker dying mid-download
    // rejects the initialisation instead of leaving it pending forever.
    initialization.failAll(error);
    inferences.failAll(error);
  });

  const ensureInitialized = (): Promise<void> => {
    if (fatalWorkerError) return Promise.reject(fatalWorkerError);
    if (initPromise) return initPromise;

    const attempt = initialization
      .request(INIT_REQUEST_KEY, {
        timeoutMs: MAIA_INIT_TIMEOUT_MS,
        timeoutMessage: 'Maia model initialization timed out',
        dispatch: () => {
          const initMsg: MaiaWorkerInitRequest = { type: 'init', modelUrl };
          worker.postMessage(initMsg satisfies MaiaWorkerRequest);
        },
      })
      .catch((error: unknown) => {
        // Uncache the failed attempt so the next `getBestMove` starts a fresh
        // one. Model load fails for transient reasons — a dropped connection,
        // a 5xx from the model route — and caching the rejected promise would
        // turn one of those into an opponent that refuses to play for the rest
        // of the session. Guarded on identity so a retry already started by
        // another caller is not dropped along with this one.
        if (initPromise === attempt) initPromise = null;
        throw error;
      });

    initPromise = attempt;
    return attempt;
  };

  return {
    async getBestMove({ fen }) {
      if (destroyed) {
        return err({ kind: 'opponent-destroyed' });
      }

      try {
        await ensureInitialized();
      } catch (cause) {
        return err({ kind: 'initialization-failed', cause });
      }

      try {
        const input = preprocessForMaia3(fen, {
          selfElo: config.selfElo,
          opponentElo: config.opponentElo,
        });
        const requestId = nextRequestId++;

        const inferMsg: MaiaWorkerInferRequest = {
          type: 'infer',
          requestId,
          boardTokens: input.boardTokens,
          selfElo: input.selfElo,
          opponentElo: input.opponentElo,
        };

        const { policyLogits, valueLogits } = await inferences.request(requestId, {
          timeoutMs: MAIA_INFERENCE_TIMEOUT_MS,
          timeoutMessage: `Maia inference timed out after ${MAIA_INFERENCE_TIMEOUT_MS}ms`,
          // Transfer the boardTokens buffer to the worker — it is not
          // used again on the main thread after the postMessage call.
          dispatch: () =>
            worker.postMessage(inferMsg satisfies MaiaWorkerRequest, [input.boardTokens.buffer]),
        });

        const decoded = decodeMaia3Output({ policyLogits, valueLogits }, input);
        if (decoded.rankedMoves.length === 0) {
          return err({
            kind: 'move-generation-failed',
            cause: new Error('Maia policy yielded no legal moves'),
          });
        }
        const top = decoded.rankedMoves[0];
        return ok({
          move: top.move,
          metadata: {
            policyProbability: top.probability,
            winProbability: decoded.winProbability,
          },
        });
      } catch (cause) {
        return err({ kind: 'move-generation-failed', cause });
      }
    },

    async destroy() {
      if (destroyed) return;
      destroyed = true;

      try {
        const destroyMsg: MaiaWorkerRequest = { type: 'destroy' };
        worker.postMessage(destroyMsg);
      } catch {
        // Worker may already be dead; nothing to do.
      }
      worker.terminate();

      const teardownError = new Error('Maia opponent destroyed');
      initialization.failAll(teardownError);
      inferences.failAll(teardownError);
    },
  };
}
