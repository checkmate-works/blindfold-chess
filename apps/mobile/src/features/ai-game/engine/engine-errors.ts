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
  /** The engine did not answer in time, or answered unusably. */
  | { kind: "timeout"; cause: unknown }
  /** The engine answered, but with no move to play. */
  | { kind: "no-move" };

/** Whether waiting and asking again could plausibly succeed. */
export function isRetryableEngineError(error: EngineError): boolean {
  return error.kind === "not-ready" || error.kind === "busy";
}
