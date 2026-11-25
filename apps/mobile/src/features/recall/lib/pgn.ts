import {
  fullmoveNumberFromFen,
  getStartingFen,
  isBlackToMoveFromFen,
  parsePgnWithFen,
} from "@blindfold-chess/features/chess-core";
import type { AlgebraicNotation, Side } from "@blindfold-chess/types";

export type RecallGame = {
  moves: AlgebraicNotation[];
  /** The position the moves start from (the standard start when the PGN has no FEN). */
  startingFen: string;
  /** Whether the PGN carried its own FEN header. */
  hasFen: boolean;
  firstMover: Side;
  startMoveNumber: number;
};

/**
 * Reads a pasted PGN for the recall. Null when it does not parse or has no
 * move to recall, which is when the web's setup keeps its start button off.
 */
export function readRecallPgn(pgn: string): RecallGame | null {
  if (pgn.trim() === "") return null;
  const parsed = parsePgnWithFen(pgn);
  if (!parsed.ok || parsed.value.moves.length === 0) return null;
  const startingFen = parsed.value.startingFen ?? getStartingFen();
  return {
    moves: parsed.value.moves,
    startingFen,
    hasFen: parsed.value.startingFen !== undefined,
    firstMover: isBlackToMoveFromFen(startingFen) ? "black" : "white",
    startMoveNumber: fullmoveNumberFromFen(startingFen),
  };
}

/**
 * The side the web's setup picks for a freshly pasted PGN: the side to move
 * after its last move — the one that would play on, as when a PGN starts a
 * game on the web. The player can still change it.
 */
export function defaultSideFor(game: RecallGame): Side {
  const lastIsFirstMover = game.moves.length % 2 === 1;
  const lastMover = lastIsFirstMover
    ? game.firstMover
    : game.firstMover === "white"
      ? "black"
      : "white";
  return lastMover === "white" ? "black" : "white";
}
