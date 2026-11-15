import { fenToLichessUrl, movesToLichessUrl } from '@blindfold-chess/features/chess-core/fen';
import type { LichessGameUrl } from '@blindfold-chess/features/chess-core/fen';
import { appliedPliesAt, labelMoveAt } from '@blindfold-chess/features/game-play';

/** The two ways a moves panel can hand the game to Lichess's analysis board. */
export type LichessAnalysisUrls = {
  /** Just the shown position, with no history — for analysing it in isolation. */
  position: string;
  /** The moves so far, opened at the shown position — for stepping through the game. */
  game: LichessGameUrl & {
    /**
     * Set only when the game was too long and got cut: the last move the
     * URL carries and the game's final move, each as "42. Kf2" / "42...Kf7",
     * so the viewer is told where the link stops in the numbering they see
     * in the move list.
     */
    cut: { lastIncludedMove: string; lastMove: string } | null;
  };
};

/**
 * Both Lichess analysis URLs for a move sequence opened `plies` moves in,
 * where `shownFen` is the position after those moves — for surfaces with no
 * move-navigation cursor (the puzzle result opens its solution at the
 * puzzle's start). The moves panels go through
 * {@link buildLichessAnalysisUrls}, which derives both from their cursor.
 *
 * `moves` must be only the moves the viewer may see, because the game URL
 * carries every one of them.
 */
export function lichessAnalysisUrlsAt({
  moves,
  startingFen,
  plies,
  shownFen,
}: {
  moves: readonly string[];
  startingFen?: string;
  plies: number;
  shownFen: string;
}): LichessAnalysisUrls {
  const game = movesToLichessUrl(moves, { startingFen, plies });

  const label = (index: number) => {
    const anchor = labelMoveAt(index, startingFen);
    // "42. Kf2" but "42...Kf7": the dots already separate a Black move's SAN.
    return `${anchor}${anchor.endsWith('...') ? '' : ' '}${moves[index]}`;
  };
  const cut =
    game.truncated && game.includedMoves > 0
      ? { lastIncludedMove: label(game.includedMoves - 1), lastMove: label(moves.length - 1) }
      : null;

  return { position: fenToLichessUrl(shownFen), game: { ...game, cut } };
}

/**
 * Both Lichess analysis URLs for the position a moves panel is showing.
 *
 * `currentPosition` is the move-navigation cursor shared by the play, review
 * and recall screens (see `appliedPliesAt`). While at the latest position
 * the navigation keeps `displayFen` null, so `latestFen` is used.
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
  return lichessAnalysisUrlsAt({
    moves,
    startingFen,
    plies: appliedPliesAt(currentPosition, moves.length),
    shownFen: currentPosition === -1 || displayFen === null ? latestFen : displayFen,
  });
}
