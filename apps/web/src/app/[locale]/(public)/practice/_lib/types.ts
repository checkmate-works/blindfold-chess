/**
 * Common game state for practice modules
 */
export type GameState = 'setup' | 'playing' | 'finished';

/**
 * FEN + side-to-move for position-based practice (position-memory, FEN
 * problem). Kept web-local because it's a session-setup shape; the
 * accuracy helpers that consume FENs live in @blindfold-chess/features.
 */
export type PositionData = {
  fen: string;
  isBlackToMove: boolean;
};
