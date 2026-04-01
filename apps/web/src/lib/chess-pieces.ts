/**
 * Shared chess piece name/code mapping constants.
 *
 * Single source of truth for converting between short piece codes (k, q, r, b, n)
 * and full piece names (king, queen, rook, bishop, knight).
 */

export const PIECE_TYPES = ['k', 'q', 'r', 'b', 'n'] as const;

export type PieceShortCode = (typeof PIECE_TYPES)[number];

/** Map from short piece code to full piece name. */
export const PIECE_SHORT_TO_NAME: Record<PieceShortCode, string> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
};

/** Piece full names used as leaderboard keys in DB. */
export type PieceFullName = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'random';

/** Map from full piece name to short piece code (includes 'random' → 'random'). */
export const PIECE_NAME_TO_SHORT: Record<PieceFullName, PieceShortCode | 'random'> = {
  king: 'k',
  queen: 'q',
  rook: 'r',
  bishop: 'b',
  knight: 'n',
  random: 'random',
};
