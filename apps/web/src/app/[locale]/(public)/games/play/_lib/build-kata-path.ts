import type { AlgebraicNotation } from '@blindfold-chess/types';

import {
  KATA_CHECK_PATH,
  buildKataCheckQuery,
} from '@/app/[locale]/(public)/games/play/repertoire/_lib/kata-url';

type BuildKataPathArgs = {
  locale: string;
  moves: AlgebraicNotation[];
  /** Player's colour, forwarded as the `color` param ('white' | 'black'). */
  playerColor: string;
  gameId: string;
  /** Custom starting position; omitted for the standard start. */
  startingFen?: string;
};

/**
 * Build the kata-check deep-link for a finished game. Same shape as the
 * Recall deep-link (`buildRecallPath`): the kata page has no game-loading
 * logic and matches the SAN moves straight from the URL, so it also works for
 * a game that was never persisted. "Kata" is the UI-facing name only; the URL
 * speaks the repertoire vocabulary, like the rest of the feature's routes.
 */
export function buildKataPath({
  locale,
  moves,
  playerColor,
  gameId,
  startingFen,
}: BuildKataPathArgs): string {
  return `/${locale}${KATA_CHECK_PATH}?${buildKataCheckQuery({ moves, playerColor, gameId, startingFen })}`;
}
