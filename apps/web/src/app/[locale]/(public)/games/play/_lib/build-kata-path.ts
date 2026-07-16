import type { AlgebraicNotation } from '@blindfold-chess/types';

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
  const params = new URLSearchParams();
  params.set('moves', JSON.stringify(moves));
  params.set('color', playerColor);
  if (startingFen) params.set('fen', startingFen);
  params.set('gameId', gameId);

  return `/${locale}/games/play/repertoire?${params.toString()}`;
}
