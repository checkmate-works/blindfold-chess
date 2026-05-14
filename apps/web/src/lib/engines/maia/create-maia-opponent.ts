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

type PendingInference = {
  resolve: (logits: { policyLogits: Float32Array; valueLogits: Float32Array }) => void;
  reject: (error: Error) => void;
};

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
 * map will rarely hold more than one entry — but the protocol supports
 * concurrency cleanly.
 */
export function createMaiaOpponent(config: MaiaOpponentConfig): ChessOpponent {
  const modelUrl = config.modelUrl ?? DEFAULT_MAIA_MODEL_URL;
  const worker = new Worker(new URL('./worker/maia.worker.ts', import.meta.url), {
    type: 'module',
  });

  const pending = new Map<number, PendingInference>();
  let nextRequestId = 0;
  let initPromise: Promise<void> | null = null;
  let destroyed = false;

  worker.addEventListener('message', (event: MessageEvent<MaiaWorkerResponse>) => {
    const msg = event.data;
    if (msg.type === 'inferred') {
      const handler = pending.get(msg.requestId);
      if (!handler) return;
      pending.delete(msg.requestId);
      handler.resolve({
        policyLogits: msg.policyLogits,
        valueLogits: msg.valueLogits,
      });
      return;
    }
    if (msg.type === 'error' && msg.requestId !== undefined) {
      const handler = pending.get(msg.requestId);
      if (!handler) return;
      pending.delete(msg.requestId);
      handler.reject(new Error(msg.message));
    }
    // `ready` and init-time errors are consumed by the init promise's
    // own one-shot listener registered inside `ensureInitialized`.
  });

  worker.addEventListener('error', (event: ErrorEvent) => {
    const message = event.message || 'Maia worker crashed';
    // Reject every in-flight inference — the worker is gone.
    for (const [, p] of pending) {
      p.reject(new Error(message));
    }
    pending.clear();
  });

  const ensureInitialized = (): Promise<void> => {
    if (initPromise) return initPromise;
    initPromise = new Promise<void>((resolve, reject) => {
      const handler = (event: MessageEvent<MaiaWorkerResponse>) => {
        const msg = event.data;
        if (msg.type === 'ready') {
          worker.removeEventListener('message', handler);
          resolve();
          return;
        }
        if (msg.type === 'error' && msg.requestId === undefined) {
          worker.removeEventListener('message', handler);
          reject(new Error(msg.message));
        }
      };
      worker.addEventListener('message', handler);

      const initMsg: MaiaWorkerInitRequest = { type: 'init', modelUrl };
      worker.postMessage(initMsg satisfies MaiaWorkerRequest);
    });
    return initPromise;
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

        const { policyLogits, valueLogits } = await new Promise<{
          policyLogits: Float32Array;
          valueLogits: Float32Array;
        }>((resolve, reject) => {
          pending.set(requestId, { resolve, reject });
          // Transfer the boardTokens buffer to the worker — it is not
          // used again on the main thread after the postMessage call.
          worker.postMessage(inferMsg satisfies MaiaWorkerRequest, [input.boardTokens.buffer]);
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
      for (const [, p] of pending) p.reject(teardownError);
      pending.clear();
    },
  };
}
