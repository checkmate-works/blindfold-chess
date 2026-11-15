import {
  fenToLichessUrl,
  fullmoveNumberFromFen,
  isBlackToMoveFromFen,
  movesToLichessUrl,
} from '@blindfold-chess/features/chess-core/fen';
import type { LichessGameUrl } from '@blindfold-chess/features/chess-core/fen';
import {
  computeMoveNumber,
  formatMoveAnchor,
} from '@blindfold-chess/features/chess-core/move-numbering';

/** The two ways a moves panel can hand the game to Lichess's analysis board. */
export type LichessAnalysisUrls = {
  /** Just the shown position, with no history — for analysing it in isolation. */
  position: string;
  /** The moves so far, opened at the shown position — for stepping through the game. */
  game: LichessGameUrl & {
    totalMoves: number;
    /**
     * The last move the game URL carries, as "42. Kf2" / "42...Kf7" — set
     * only when the game was too long and got cut, to tell the viewer where.
     */
    lastIncludedMove: string | null;
  };
};

/**
 * Both Lichess analysis URLs for the position a moves panel is showing.
 *
 * `currentPosition` is the move-navigation index shared by the play, review
 * and recall screens: `-1` is the latest position, `-2` the starting
 * position, and `i >= 0` the position after `moves[i]`. While at the latest
 * position the navigation keeps `displayFen` null, so `latestFen` is used.
 *
 * `moves` must be only the moves the viewer may see — on the recall screen,
 * the ones entered so far, never the full game being recalled — because the
 * game URL carries every one of them.
 */
export function buildLichessAnalysisUrls({
  moves,
  startingFen,
  currentPosition,
  latestFen,
  displayFen,
}: {
  moves: readonly string[];
  startingFen?: string;
  currentPosition: number;
  latestFen: string;
  displayFen: string | null;
}): LichessAnalysisUrls {
  const plies =
    currentPosition >= 0 ? currentPosition + 1 : currentPosition === -2 ? 0 : moves.length;
  const shownFen = currentPosition === -1 || displayFen === null ? latestFen : displayFen;
  const game = movesToLichessUrl(moves, { startingFen, plies });

  let lastIncludedMove: string | null = null;
  if (game.truncated && game.includedMoves > 0) {
    const index = game.includedMoves - 1;
    const { moveNumber, isWhiteMove } = computeMoveNumber(
      index,
      startingFen ? isBlackToMoveFromFen(startingFen) : false,
      startingFen ? fullmoveNumberFromFen(startingFen) : 1
    );
    const anchor = formatMoveAnchor(moveNumber, isWhiteMove);
    lastIncludedMove = `${anchor}${isWhiteMove ? ' ' : ''}${moves[index]}`;
  }

  return {
    position: fenToLichessUrl(shownFen),
    game: { ...game, totalMoves: moves.length, lastIncludedMove },
  };
}
