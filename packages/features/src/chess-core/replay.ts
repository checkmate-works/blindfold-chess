import type { Move } from "chess.js";
import { Chess } from "chess.js";

/**
 * Start a board from an optional starting FEN; absent means the standard
 * initial position.
 */
export function boardFrom(startingFen?: string): Chess {
  return startingFen ? new Chess(startingFen) : new Chess();
}

export type SanReplay<T> = {
  /** `visit`'s result for each move that was applied, in order. */
  applied: T[];
  /** Index of the first move the board rejected, or `null` if all applied. */
  invalidIndex: number | null;
};

function tryMove(chess: Chess, san: string): Move | null {
  try {
    return chess.move(san);
  } catch {
    return null;
  }
}

/**
 * Apply SAN moves to `chess` one at a time, stopping at the first move the
 * board rejects, and collect `visit`'s result for each move that landed.
 *
 * @remarks
 * Replaying a SAN sequence is the shape almost every move helper here is
 * built on, and each one used to answer a rejected move differently: with
 * an indexed error, by silently returning the legal prefix (twice), or by
 * returning null. Reporting the rejection as a position rather than as a
 * verdict lets each caller keep its own answer while the traversal itself
 * has one definition — a sequence that gets truncated by one helper and
 * rejected outright by another is then a visible choice, not an accident.
 *
 * The tolerant contract is deliberately not universal: `getFenAfterMoves`
 * and `generatePgn` let an illegal move throw, because a caller asking for
 * "the position after these moves" or "the PGN of this game" cannot be
 * handed a silently shortened game. Both run their own loop instead
 * (`generatePgn` over a {@link boardFrom} board, `getFenAfterMoves` over one
 * it constructs from its required FEN).
 *
 * Constructing the board is the caller's job so an invalid starting FEN
 * still throws from the call site, and so a caller that needs the initial
 * position (`replayMoves`) can read it before the first move.
 */
export function replaySan<T>(
  chess: Chess,
  moves: readonly string[],
  visit: (move: Move, chess: Chess) => T,
): SanReplay<T> {
  const applied: T[] = [];

  for (let i = 0; i < moves.length; i++) {
    const move = tryMove(chess, moves[i]);
    if (!move) return { applied, invalidIndex: i };
    applied.push(visit(move, chess));
  }

  return { applied, invalidIndex: null };
}
