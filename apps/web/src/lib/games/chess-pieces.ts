import type { DisplayPieceType } from '@blindfold-chess/features/common';

/**
 * Shared chess piece name/code mapping constants.
 *
 * Single source of truth for converting between short piece codes (k, q, r, b, n)
 * and full piece names (king, queen, rook, bishop, knight).
 */

/**
 * The pieces a drill can be about: every piece but the pawn. The same set
 * `@blindfold-chess/features` names `DisplayPieceType`, so a piece added or
 * removed there is a type error here rather than a silent fork.
 */
export type PieceShortCode = DisplayPieceType;

/**
 * {@link PieceShortCode} as the selector offers it, strongest first. The
 * order is this app's own (the features package lists the same set in glyph
 * order), so the array stays local and is only checked against the type.
 */
export const PIECE_TYPES = ['k', 'q', 'r', 'b', 'n'] as const satisfies readonly PieceShortCode[];

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
