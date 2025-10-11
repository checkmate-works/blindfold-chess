// Chess board basic elements
export const ALL_FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export type File = (typeof ALL_FILES)[number];

export const ALL_RANKS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type Rank = (typeof ALL_RANKS)[number];

export const PIECES = ['K', 'Q', 'R', 'B', 'N'] as const;
export type PieceSymbol = (typeof PIECES)[number];

// Promotion
export type Promotion = `=${'Q' | 'R' | 'B' | 'N'}`;
// Check/Checkmate
export type CheckSuffix = '' | '+' | '#';

export type CastlingMove = 'O-O' | 'O-O-O';

// Pawn moves: e4, e8=Q, e8=Q+, e8=Q#
export type PawnMove = `${File}${Rank}${Promotion | ''}${CheckSuffix}`;

// Pawn captures: exd5, exd8=Q, exd8=Q+, exd8=Q#
export type PawnCapture = `${File}x${File}${Rank}${Promotion | ''}${CheckSuffix}`;

// En passant: exd6 (rank 3 or 6 only, but not type-restricted)
export type EnPassant = `${File}x${File}${3 | 6}${CheckSuffix}`;

// Piece moves - with disambiguation patterns
export type PieceMove =
  | `${PieceSymbol}${File}${Rank}${CheckSuffix}` // Nf3 (basic)
  | `${PieceSymbol}${File}${File}${Rank}${CheckSuffix}` // Nbd2 (file disambiguation)
  | `${PieceSymbol}${Rank}${File}${Rank}${CheckSuffix}` // N1d2 (rank disambiguation)
  | `${PieceSymbol}${File}${Rank}${File}${Rank}${CheckSuffix}`; // Nb1d2 (full specification)

// Piece captures - with disambiguation patterns
export type PieceCapture =
  | `${PieceSymbol}x${File}${Rank}${CheckSuffix}` // Nxe5 (basic)
  | `${PieceSymbol}${File}x${File}${Rank}${CheckSuffix}` // Nfxe5 (file disambiguation)
  | `${PieceSymbol}${Rank}x${File}${Rank}${CheckSuffix}` // N1xe5 (rank disambiguation)
  | `${PieceSymbol}${File}${Rank}x${File}${Rank}${CheckSuffix}`; // Nb1xe5 (full specification)

export type AlgebraicNotation =
  | CastlingMove
  | PawnMove
  | PawnCapture
  | EnPassant
  | PieceMove
  | PieceCapture;

export type Side = 'white' | 'black';
export type PlayerColor = Side;

export type UciMove = `${string}${number}${string}${number}`;
export type Fen = string;
