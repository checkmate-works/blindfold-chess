import { fenToLichessUrl, movesToLichessUrl } from '@blindfold-chess/features/chess-core/fen';

/** The two ways a moves panel can hand the game to Lichess's analysis board. */
export type LichessAnalysisUrls = {
  /** Just the shown position, with no history — for analysing it in isolation. */
  position: string;
  /** The moves so far, opened at the shown position — for stepping through the game. */
  game: string;
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

  return {
    position: fenToLichessUrl(shownFen),
    game: movesToLichessUrl(moves, { startingFen, plies }),
  };
}
