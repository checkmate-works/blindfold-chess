import type { AlgebraicNotation, Side } from "@blindfold-chess/types";

import { fullmoveNumberFromFen, isBlackToMoveFromFen } from "./fen-pure";
import { computeMoveNumber, formatMoveAnchor } from "./move-numbering";

/**
 * Format the last move(s) for display in game list based on player color
 *
 * For white player:
 * - Last move is white: "4. Ng5" (white's move only)
 * - Last move is black: "3. Bc4 Nf6" (white-black pair)
 *
 * For black player:
 * - Last move is black: "3...Nf6" (black's move only)
 * - Last move is white: "3...Nf6 4. Ng5" (black's move + next white move)
 *
 * @param moves - Array of all moves in the game, counted from `startingFen`
 * @param playerColor - The color the player is playing as
 * @param startingFen - The position `moves` are counted from; `undefined` for
 *   the standard start. Required rather than optional on purpose: this row
 *   numbered every game from "1. white" for as long as the parameter did not
 *   exist, so a game begun from a mid-game FEN showed numbers that matched
 *   nothing else on screen. A default here would hide the same bug at any
 *   call site that forgot to pass the field, and the callers all have it.
 * @returns Formatted string of the last move(s)
 */
export function formatLastMove(
  moves: AlgebraicNotation[],
  playerColor: Side,
  startingFen: string | undefined,
): string {
  if (moves.length === 0) {
    return "-";
  }

  const startsAsBlack = startingFen ? isBlackToMoveFromFen(startingFen) : false;
  const startMoveNumber = startingFen ? fullmoveNumberFromFen(startingFen) : 1;

  /** One half-move as "4. Ng5" / "3...Nf6", numbered from the starting FEN. */
  const label = (index: number): string => {
    const { moveNumber, isWhiteMove } = computeMoveNumber(
      index,
      startsAsBlack,
      startMoveNumber,
    );
    const anchor = formatMoveAnchor(moveNumber, isWhiteMove);
    // "4." is separated from its SAN, "3..." runs straight into it — the
    // spacing convention PGN readers expect, and what this row already showed.
    return isWhiteMove
      ? `${anchor} ${moves[index]}`
      : `${anchor}${moves[index]}`;
  };

  const lastIndex = moves.length - 1;
  const { isWhiteMove: lastMoveIsWhite } = computeMoveNumber(
    lastIndex,
    startsAsBlack,
    startMoveNumber,
  );

  // Whether the half-move before the last one exists. It does not for the very
  // first move of the game, which is Black's when the starting FEN says so —
  // the case that used to read `moves[-1]`.
  const hasPrevious = lastIndex > 0;

  if (playerColor === "white") {
    if (lastMoveIsWhite || !hasPrevious) {
      return label(lastIndex);
    }
    // Last move is black's: show the pair under White's number, so the black
    // SAN trails its own white move without repeating the number.
    return `${label(lastIndex - 1)} ${moves[lastIndex]}`;
  }

  if (!lastMoveIsWhite || !hasPrevious) {
    return label(lastIndex);
  }
  // Last move is white's: lead with the black move it answers, so the player's
  // own last move is always the one on the left.
  return `${label(lastIndex - 1)} ${label(lastIndex)}`;
}
