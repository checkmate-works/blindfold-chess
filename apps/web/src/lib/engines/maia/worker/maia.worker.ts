/// <reference lib="webworker" />
/**
 * Maia 3 inference Web Worker.
 *
 * Runs onnxruntime-web in a dedicated thread so the main thread stays
 * responsive during the (~tens of ms) inference call. Each `infer`
 * request is independent — there's no batching, no history, no
 * cross-request state. Re-use of the loaded session across requests
 * is the only state the worker carries.
 *
 * Input ONNX tensor names (`tokens`, `elo_self`, `elo_oppo`) and output
 * names (`logits_move`, `logits_value`) are dictated by the Maia 3
 * "simplified" ONNX model exported by CSSLab — see
 * https://github.com/CSSLab/maia-platform-frontend/blob/main/public/maia-worker.js
 * for the reference implementation this is patterned after.
 */
import * as ort from 'onnxruntime-web';

import type { MaiaWorkerRequest, MaiaWorkerResponse } from '../worker-protocol';

/**
 * The loaded session, held as the promise `init` creates rather than as the
 * resolved value.
 *
 * `destroy` used to test `if (session)` — which is still null while `init`'s
 * `await` is in flight — so a `destroy` arriving during startup was a no-op
 * and `init` then assigned a live session that nobody ever released.
 * Assigning the promise synchronously means `destroy` can always await
 * whatever `init` produced and release it.
 */
let sessionPromise: Promise<ort.InferenceSession> | null = null;

/**
 * Inference calls that have not settled yet. `destroy` waits for them before
 * releasing: releasing a session out from under a running `run()` is the
 * mirror image of the startup race above.
 */
const inFlightRuns = new Set<Promise<unknown>>();

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function post(message: MaiaWorkerResponse, transfer: Transferable[] = []): void {
  ctx.postMessage(message, transfer);
}

ctx.addEventListener('message', async (event: MessageEvent<MaiaWorkerRequest>) => {
  const msg = event.data;
  try {
    switch (msg.type) {
      case 'init': {
        // Assign before awaiting: a `destroy` that lands during startup must
        // be able to find (and release) this session.
        sessionPromise = ort.InferenceSession.create(msg.modelUrl);
        await sessionPromise;
        post({ type: 'ready' });
        break;
      }

      case 'infer': {
        if (!sessionPromise) {
          post({
            type: 'error',
            requestId: msg.requestId,
            message: 'Maia worker received infer before init',
          });
          return;
        }
        const session = await sessionPromise;

        const tokensTensor = new ort.Tensor('float32', msg.boardTokens, [1, 64, 12]);
        const eloSelfTensor = new ort.Tensor('float32', Float32Array.from([msg.selfElo]), [1]);
        const eloOppoTensor = new ort.Tensor('float32', Float32Array.from([msg.opponentElo]), [1]);

        const run = session.run({
          tokens: tokensTensor,
          elo_self: eloSelfTensor,
          elo_oppo: eloOppoTensor,
        });
        inFlightRuns.add(run);

        let result;
        try {
          result = await run;
        } finally {
          inFlightRuns.delete(run);
        }

        // ONNX runtime returns tensors whose `.data` may share an
        // underlying buffer with the session's internal arenas; copy
        // them out so the transfer below cannot disturb session state.
        const policyLogits = new Float32Array(result.logits_move.data as Float32Array);
        const valueLogits = new Float32Array(result.logits_value.data as Float32Array);

        post(
          {
            type: 'inferred',
            requestId: msg.requestId,
            policyLogits,
            valueLogits,
          },
          [policyLogits.buffer, valueLogits.buffer]
        );
        break;
      }

      case 'destroy': {
        const pending = sessionPromise;
        sessionPromise = null;
        if (!pending) break;
        // Let any running inference finish before pulling the session out
        // from under it, then release whatever `init` produced — including a
        // session whose `create` was still in flight when this arrived.
        await Promise.allSettled([...inFlightRuns]);
        const created = await pending.catch(() => null);
        await created?.release();
        break;
      }
    }
  } catch (error) {
    const requestId = msg.type === 'infer' ? msg.requestId : undefined;
    post({
      type: 'error',
      ...(requestId !== undefined ? { requestId } : {}),
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
