import {
  EngineBusyError,
  EngineNoMoveError,
  UciConversionError,
} from "@blindfold-chess/features/ai-game/engine";

/**
 * Why the on-device engine could not produce a move.
 *
 * Mirrors the web port's `OpponentError` (`@blindfold-chess/features/ai-game/
 * opponent`): the kinds exist so a caller can tell "wait and retry" from
 * "this attempt is over". All four cases used to be bare `Error`s and were
 * recovered identically — one toast reading "AI move failed. Please try
 * again." — so "the engine is still booting" and "the WebView is gone" looked
 * the same to the player.
 */
export type EngineError =
  /** The WebView has not finished booting Stockfish yet; retriable by waiting. */
  | { kind: "not-ready"; state: string }
  /** A previous request is still in flight; retriable shortly. */
  | { kind: "busy" }
  /** The engine did not answer in time, or the bridge died mid-request. */
  | { kind: "timeout"; cause: unknown }
  /** The engine answered, but with no move to play. */
  | { kind: "no-move" }
  /**
   * The engine answered with a move that cannot be played in the position it
   * was asked about — a string that does not decode into squares, a move that
   * is illegal there, or a FEN chess.js could not parse.
   *
   * Split out of `timeout` because the two call for opposite responses and
   * were previously indistinguishable to the caller: a missed deadline is
   * transient and asking again may well work, whereas an unplayable move is
   * deterministic and a retry against the same position reproduces it
   * exactly. Carries the move and position so a report says which move was
   * refused rather than only that one was.
   */
  | { kind: "unplayable-move"; uciMove: string; fen: string; cause: unknown };

/**
 * Whether waiting and asking again could plausibly succeed.
 *
 * A `switch` rather than a disjunction of the two retriable kinds so that the
 * `never` assignment below stops compiling when a kind is added: classifying
 * a new failure as retriable or not is a decision, and silently defaulting it
 * to "give up" is how `unplayable-move` spent its first life hidden inside
 * `timeout`.
 */
export function isRetryableEngineError(error: EngineError): boolean {
  switch (error.kind) {
    case "not-ready":
    case "busy":
      return true;
    case "timeout":
    case "no-move":
    case "unplayable-move":
      return false;
    default: {
      const exhaustive: never = error;
      return exhaustive;
    }
  }
}

/**
 * Classify a value thrown by the shared `ChessEngine` into an
 * {@link EngineError}.
 *
 * Separate from the hook that calls it so the classification can be tested
 * without a WebView: every branch here is reached only by an engine failing
 * on a real device, which is precisely the situation no test can stage. The
 * one regression this guards against is silent — folding a thrown value into
 * the wrong kind still compiles, still returns a `Result`, and still shows
 * the player the same toast.
 *
 * Anything unrecognised becomes `timeout`. That is the honest default for
 * this bridge: a command that missed its deadline and a WebView that died
 * mid-request both arrive as values the engine never classified, and both
 * mean the request is over rather than that the move was bad.
 */
export function toEngineError(cause: unknown): EngineError {
  if (cause instanceof EngineBusyError) {
    return { kind: "busy" };
  }
  if (cause instanceof EngineNoMoveError) {
    return { kind: "no-move" };
  }
  if (cause instanceof UciConversionError) {
    // The engine answered, but with a move that cannot be played here.
    // Retrying reproduces it, so this must not reach the caller wearing the
    // `timeout` kind, which invites exactly that.
    return {
      kind: "unplayable-move",
      uciMove: cause.uciMove,
      fen: cause.fen,
      cause: cause.cause,
    };
  }
  return { kind: "timeout", cause };
}
