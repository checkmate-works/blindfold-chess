import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { EngineConfig } from '@/lib/engines';
import { engineConfigToUrlParams } from '@/lib/engines';

import type { FormattedPgnMove } from './pgn-parser';

type BuildPostmortemPathArgs = {
  locale: string;
  /** Structured move pairs, used to render the PGN string the postmortem parses. */
  formattedPgn: FormattedPgnMove[];
  /** Player's color, forwarded as the postmortem `color` param ('white' | 'black'). */
  playerColor: string;
  moves: AlgebraicNotation[];
  engineConfig: EngineConfig;
  gameId: string;
  /** Custom starting position; omitted for the standard start. */
  startingFen?: string;
};

/**
 * Build the postmortem deep-link for a finished game. Shared by the result
 * screen and the finished-game view so both construct identical params (the
 * postmortem screen has no game-loading logic — it replays from the URL).
 *
 * The PGN is rendered move-pair by move-pair, including the `N..` prefix for a
 * leading black move (custom FEN starting with black to move).
 */
export function buildPostmortemPath({
  locale,
  formattedPgn,
  playerColor,
  moves,
  engineConfig,
  gameId,
  startingFen,
}: BuildPostmortemPathArgs): string {
  const pgn = formattedPgn
    .map((move) => {
      const moveNumber = `${move.moveNumber}.`;
      if (!move.whiteMove && move.blackMove) {
        return `${moveNumber}.. ${move.blackMove}`;
      }
      return move.blackMove
        ? `${moveNumber} ${move.whiteMove} ${move.blackMove}`
        : `${moveNumber} ${move.whiteMove}`;
    })
    .join(' ');

  const params = new URLSearchParams();
  params.set('pgn', pgn);
  params.set('color', playerColor);
  params.set('autoOpponent', 'true');
  if (startingFen) params.set('fen', startingFen);
  params.set('gameId', gameId);
  for (const [key, value] of Object.entries(engineConfigToUrlParams(engineConfig))) {
    params.set(key, value);
  }
  params.set('moves', JSON.stringify(moves));

  return `/${locale}/games/play/postmortem?${params.toString()}`;
}
