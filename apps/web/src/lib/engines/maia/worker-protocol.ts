/**
 * Typed message protocol between the main thread and the Maia 3
 * inference Worker.
 *
 * Both sides own this file, so unlike the Stockfish UCI text protocol
 * we model messages as discriminated-union objects. Heavy `Float32Array`
 * payloads (board tokens, logits) are transferred (not copied) by passing
 * their underlying `ArrayBuffer`s in the `postMessage` transfer list.
 */

/* ── Requests: main thread → worker ───────────────────────────────── */

export type MaiaWorkerInitRequest = {
  readonly type: 'init';
  readonly modelUrl: string;
};

export type MaiaWorkerInferRequest = {
  readonly type: 'infer';
  /**
   * Caller-supplied correlation id. The worker echoes it back in the
   * matching `inferred` or `error` response, letting the adapter map
   * concurrent requests to their callers.
   */
  readonly requestId: number;
  readonly boardTokens: Float32Array;
  readonly selfElo: number;
  readonly opponentElo: number;
};

export type MaiaWorkerDestroyRequest = {
  readonly type: 'destroy';
};

export type MaiaWorkerRequest =
  | MaiaWorkerInitRequest
  | MaiaWorkerInferRequest
  | MaiaWorkerDestroyRequest;

/* ── Responses: worker → main thread ──────────────────────────────── */

export type MaiaWorkerReadyResponse = {
  readonly type: 'ready';
};

export type MaiaWorkerInferredResponse = {
  readonly type: 'inferred';
  readonly requestId: number;
  readonly policyLogits: Float32Array;
  readonly valueLogits: Float32Array;
};

/**
 * Error response. `requestId` is present when the failure is tied to a
 * specific in-flight `infer` call (so the adapter can reject the
 * matching promise); absent when the failure is global (e.g. model
 * initialisation failed, before any inference was requested).
 */
export type MaiaWorkerErrorResponse = {
  readonly type: 'error';
  readonly requestId?: number;
  readonly message: string;
};

export type MaiaWorkerResponse =
  | MaiaWorkerReadyResponse
  | MaiaWorkerInferredResponse
  | MaiaWorkerErrorResponse;
