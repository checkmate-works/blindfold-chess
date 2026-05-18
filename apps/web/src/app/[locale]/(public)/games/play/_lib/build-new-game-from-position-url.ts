import { type EngineConfig, engineConfigToUrlParams } from '@/lib/engines';

type BuildNewGameUrlParams = {
  locale: string;
  /** Full move list of the current game. */
  moves: string[];
  /** Index of the last move to keep; moves after it are dropped. */
  position: number;
  /** Player's color, passed through as the `color` query param. */
  playerSide: string;
  /** Engine + difficulty, serialized into engine-specific query params. */
  engineConfig: EngineConfig;
  /** Custom starting FEN, omitted from the URL when the game began standard. */
  startingFen?: string;
};

/**
 * Build the `/games/new/pgn` URL that re-opens the current game truncated to
 * `position` as a brand-new game (same engine + color, fresh game id).
 *
 * Pure string assembly — extracted from `useGameSession` so the routing
 * concern is testable on its own and the hook keeps only the `router.push`.
 */
export function buildNewGameFromPositionUrl({
  locale,
  moves,
  position,
  playerSide,
  engineConfig,
  startingFen,
}: BuildNewGameUrlParams): string {
  const movesToKeep = moves.slice(0, position + 1);
  const params = new URLSearchParams();
  params.set('moves', JSON.stringify(movesToKeep));
  params.set('color', playerSide);
  for (const [key, value] of Object.entries(engineConfigToUrlParams(engineConfig))) {
    params.set(key, value);
  }
  if (startingFen) {
    params.set('fen', startingFen);
  }
  return `/${locale}/games/new/pgn?${params.toString()}`;
}
