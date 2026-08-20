import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { EngineConfig } from '@/lib/engines';
import { engineConfigToUrlParams } from '@/lib/engines';

import type { FormattedPgnMove } from './pgn-parser';

type BuildRecallPathArgs = {
  locale: string;
  /** Structured move pairs, used to render the PGN string the recall parses. */
  formattedPgn: FormattedPgnMove[];
  /** Player's color, forwarded as the recall `color` param ('white' | 'black'). */
  playerColor: string;
  moves: AlgebraicNotation[];
  engineConfig: EngineConfig;
  gameId: string;
  /** Custom starting position; omitted for the standard start. */
  startingFen?: string;
  /**
   * Same-origin path (locale-prefixed, may carry a query) the recall summary's
   * back link should return to. Set by the mid-game recall entry so finishing
   * the review lands back on the live game instead of the result screen. The
   * recall session page re-validates it with `sanitizeNext` before use, so a
   * tampered URL degrades to the default back link rather than redirecting
   * off-origin.
   */
  returnTo?: string;
};

/**
 * Build the recall deep-link for a finished game. Shared by the result
 * screen and the finished-game view so both construct identical params (the
 * recall screen has no game-loading logic — it replays from the URL).
 *
 * The PGN is rendered move-pair by move-pair, including the `N..` prefix for a
 * leading black move (custom FEN starting with black to move). Recall
 * itself prefers the `moves` param (a plain SAN array) over this rendered
 * `pgn` string when both are present, since the `N..` form isn't safe input
 * for `pgn`'s regex-based cleaner — `pgn` is kept only as a legacy fallback.
 *
 * Recall now lives at `/practice/recall` (setup) / `/practice/recall/session`
 * (review) as a standalone module (see `apps/web/CLAUDE.md` glossary),
 * reachable both via this deep-link — which goes straight to the session,
 * bypassing setup — and directly by pasting a PGN.
 */
export function buildRecallPath({
  locale,
  formattedPgn,
  playerColor,
  moves,
  engineConfig,
  gameId,
  startingFen,
  returnTo,
}: BuildRecallPathArgs): string {
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
  if (returnTo) params.set('returnTo', returnTo);
  for (const [key, value] of Object.entries(engineConfigToUrlParams(engineConfig))) {
    params.set(key, value);
  }
  params.set('moves', JSON.stringify(moves));

  return `/${locale}/practice/recall/session?${params.toString()}`;
}
