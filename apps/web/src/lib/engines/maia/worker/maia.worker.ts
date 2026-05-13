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

let session: ort.InferenceSession | null = null;

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function post(message: MaiaWorkerResponse, transfer: Transferable[] = []): void {
  ctx.postMessage(message, transfer);
}

ctx.addEventListener('message', async (event: MessageEvent<MaiaWorkerRequest>) => {
  const msg = event.data;
  try {
    switch (msg.type) {
      case 'init': {
        session = await ort.InferenceSession.create(msg.modelUrl);
        post({ type: 'ready' });
        break;
      }

      case 'infer': {
        if (!session) {
          post({
            type: 'error',
            requestId: msg.requestId,
            message: 'Maia worker received infer before init',
          });
          return;
        }

        const tokensTensor = new ort.Tensor('float32', msg.boardTokens, [1, 64, 12]);
        const eloSelfTensor = new ort.Tensor('float32', Float32Array.from([msg.selfElo]), [1]);
        const eloOppoTensor = new ort.Tensor('float32', Float32Array.from([msg.opponentElo]), [1]);

        const result = await session.run({
          tokens: tokensTensor,
          elo_self: eloSelfTensor,
          elo_oppo: eloOppoTensor,
        });

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
        if (session) {
          await session.release();
          session = null;
        }
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
