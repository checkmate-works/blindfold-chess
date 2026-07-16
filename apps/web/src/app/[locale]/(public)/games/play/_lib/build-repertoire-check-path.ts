import type { AlgebraicNotation } from '@blindfold-chess/types';

import {
  REPERTOIRE_CHECK_PATH,
  buildRepertoireCheckQuery,
} from '@/app/[locale]/(public)/games/play/repertoire/_lib/check-url';

type BuildRepertoireCheckPathArgs = {
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
export function buildRepertoireCheckPath({
  locale,
  moves,
  playerColor,
  gameId,
  startingFen,
}: BuildRepertoireCheckPathArgs): string {
  return `/${locale}${REPERTOIRE_CHECK_PATH}?${buildRepertoireCheckQuery({ moves, playerColor, gameId, startingFen })}`;
}
