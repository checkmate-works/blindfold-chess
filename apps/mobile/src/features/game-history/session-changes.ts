/**
 * Whether an AI-game session has anything of its own to write to the
 * device.
 *
 * @description
 * A session starts either from nothing (a new game) or from a saved game
 * (resumed from the history). A resumed game is already on the device as it
 * was loaded, so writing it again on open would only move its "last played"
 * time (`finishedAt`) to now — lifting a game the player merely looked at to
 * the top of the history — and closing it would announce "Game saved" for a
 * save that changed nothing.
 *
 * So a session writes, and says it did, only once the game differs from
 * where it started:
 *
 * - the moves differ (a move played, or one taken back — compared move by
 *   move, since undoing one and playing another leaves the count alone);
 * - for a resumed game, also a result (a resignation ends it without a
 *   move) or the game's preferences changed from the session's gear.
 *
 * A new game keeps its old rule: nothing is written before its first move,
 * so a game resigned or re-configured before any move leaves no row.
 *
 * Once a session has written, it keeps writing even if the game returns to
 * where it started (every move undone): the device now holds the
 * in-between state, which must be overwritten. That stickiness is the
 * caller's: it keeps the answer once it is true.
 */
export type SessionState = {
  readonly moves: readonly string[];
  /** The game's result, absent while in progress. */
  readonly result?: string | null;
  /** The game's preferences, serialised so that two snapshots compare. */
  readonly prefsKey: string;
};

export function differsFromStart(
  start: SessionState,
  current: SessionState,
): boolean {
  if (!sameMoves(start.moves, current.moves)) return true;
  const resumed = start.moves.length > 0;
  if (!resumed) return false;
  return Boolean(current.result) || current.prefsKey !== start.prefsKey;
}

function sameMoves(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((move, i) => move === b[i]);
}
