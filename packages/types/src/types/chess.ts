export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
export type File = (typeof FILES)[number];

export const NUMERIC_RANKS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type Rank = (typeof NUMERIC_RANKS)[number];

export const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

export const DISPLAY_RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"] as const;

export const ALL_PIECE_TYPES = ["p", "n", "b", "r", "q", "k"] as const;
export type PieceType = (typeof ALL_PIECE_TYPES)[number];

export const ALL_PIECE_SYMBOLS = ["K", "Q", "R", "B", "N"] as const;
export type PieceSymbol = (typeof ALL_PIECE_SYMBOLS)[number];

export type Promotion = `=${"Q" | "R" | "B" | "N"}`;
export type CheckSuffix = "" | "+" | "#";

export type CastlingMove = "O-O" | "O-O-O";

type NonPromotionRank = 2 | 3 | 4 | 5 | 6 | 7;
type PromotionRank = 1 | 8;

// Pawn moves (e.g., e4, e8=Q): non-promotion on rank 2-7, promotion required on rank 1/8
type PawnMoveNonPromotion = `${File}${NonPromotionRank}${CheckSuffix}`;
type PawnMovePromotion = `${File}${PromotionRank}${Promotion}${CheckSuffix}`;
export type PawnMove = PawnMoveNonPromotion | PawnMovePromotion;

// Pawn captures (e.g., exd5, exd8=Q): non-promotion on rank 2-7, promotion required on rank 1/8
type PawnCaptureNonPromotion =
  `${File}x${File}${NonPromotionRank}${CheckSuffix}`;
type PawnCapturePromotion =
  `${File}x${File}${PromotionRank}${Promotion}${CheckSuffix}`;
export type PawnCapture = PawnCaptureNonPromotion | PawnCapturePromotion;

// Note: "e.p." suffix (e.g., "exd6 e.p.") is intentionally not supported; normalize at parse time if needed
export type EnPassant = `${File}x${File}${3 | 6}${CheckSuffix}`;

// Piece moves - with disambiguation patterns
export type PieceMove =
  | `${PieceSymbol}${File}${Rank}${CheckSuffix}` // e.g., Nf3 (basic)
  | `${PieceSymbol}${File}${File}${Rank}${CheckSuffix}` // e.g., Nbd2 (file disambiguation)
  | `${PieceSymbol}${Rank}${File}${Rank}${CheckSuffix}` // e.g., N1d2 (rank disambiguation)
  | `${PieceSymbol}${File}${Rank}${File}${Rank}${CheckSuffix}`; // e.g., Nb1d2 (full specification)

// Piece captures - with disambiguation patterns
export type PieceCapture =
  | `${PieceSymbol}x${File}${Rank}${CheckSuffix}` // e.g., Nxe5 (basic)
  | `${PieceSymbol}${File}x${File}${Rank}${CheckSuffix}` // e.g., Nfxe5 (file disambiguation)
  | `${PieceSymbol}${Rank}x${File}${Rank}${CheckSuffix}` // e.g., N1xe5 (rank disambiguation)
  | `${PieceSymbol}${File}${Rank}x${File}${Rank}${CheckSuffix}`; // e.g., Nb1xe5 (full specification)

export type AlgebraicNotation =
  | CastlingMove
  | PawnMove
  | PawnCapture
  | EnPassant
  | PieceMove
  | PieceCapture;

export type Square = `${File}${Rank}`;

export type Side = "white" | "black";

export type UciMove =
  | `${File}${Rank}${File}${Rank}`
  | `${File}${Rank}${File}${Rank}${"q" | "r" | "b" | "n"}`;

/** Semantic alias for a FEN string. Validated by chess.js at the chess-core boundary. */
export type Fen = string;
