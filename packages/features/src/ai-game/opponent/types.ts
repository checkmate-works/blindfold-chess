import type { AlgebraicNotation, Fen, UciMove } from "@blindfold-chess/types";

import type { Result } from "./result";

/**
 * Input for a "give me your best move from this position" request.
 *
 * `history` carries the moves that led to `fen` *from the starting position
 * of the game* (which is `startingFen` when set, otherwise the standard
 * initial position). Opponents that internally need the move list — e.g.
 * UCI engines using the `position startpos moves ...` form — consume
 * `history` directly. Opponents that work from `fen` alone (such as
 * neural-network policy heads) may ignore `history` entirely.
 */
export type MoveRequest = Readonly<{
  fen: Fen;
  history: ReadonlyArray<AlgebraicNotation>;
  startingFen?: string;
}>;

/**
 * The move plus any opponent-specific metadata that the consumer may find
 * useful. `metadata` is intentionally an open record so each opponent
 * implementation can carry its own auxiliary signal (centipawn score for
 * search-based engines, policy probability for NN engines, ...) without
 * forcing every other implementation to fabricate values for fields it
 * does not produce.
 */
export type MoveResult = Readonly<{
  move: UciMove;
  metadata?: Readonly<Record<string, unknown>>;
}>;

/**
 * Domain-level failure modes for {@link ChessOpponent}.
 *
 * Distinguishing kinds at the type level lets the calling layer decide
 * whether to retry, surface a user-facing error, or escalate. The
 * `cause` field carries the original thrown value for diagnostics — it
 * is intentionally `unknown` because the lowest-level driver (Worker,
 * onnxruntime, UCI parser) may throw anything.
 */
export type OpponentError =
  | { readonly kind: "initialization-failed"; readonly cause: unknown }
  | { readonly kind: "move-generation-failed"; readonly cause: unknown }
  | { readonly kind: "opponent-destroyed" }
  /**
   * The underlying engine is still serving a previous request. Transient by
   * nature: the caller may wait briefly and retry the same request. Kept as
   * its own kind (not folded into `move-generation-failed`) precisely so the
   * retry decision is a type-level branch, not a message-text match.
   */
  | { readonly kind: "busy" };

/**
 * Port for any "thing that produces a move" in the AI-vs-human flow.
 *
 * Implementations may be Stockfish over UCI, Maia over ONNX, an opening
 * book, a static evaluation, or a remote service — all the orchestration
 * code above this port cares about is the request/response shape.
 *
 * Implementations are owned by their factory (`createStockfishOpponent`,
 * `createMaiaOpponent`, ...). Each factory call yields a fresh, isolated
 * opponent with its own underlying resources (Worker, model, etc.); the
 * port itself has no notion of a global singleton. Consumers are
 * expected to call {@link destroy} when they no longer need the opponent.
 */
export type ChessOpponent = Readonly<{
  getBestMove: (
    request: MoveRequest,
  ) => Promise<Result<MoveResult, OpponentError>>;
  destroy: () => Promise<void>;
}>;
