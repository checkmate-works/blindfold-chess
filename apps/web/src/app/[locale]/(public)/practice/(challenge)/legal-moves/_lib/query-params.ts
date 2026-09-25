import {
  PIECE_NAME_TO_SHORT,
  PIECE_SHORT_TO_NAME,
  PIECE_TYPES,
  type PieceFullName,
} from '@/lib/games/chess-pieces';

import type { PieceType } from './types';

/** Map from short piece code to full piece name (alias for PIECE_SHORT_TO_NAME). */
export const PIECE_TYPE_TO_NAME: Record<string, string> = PIECE_SHORT_TO_NAME;

/** Map from full piece name to short piece code. */
export const PIECE_NAME_TO_TYPE: Record<string, PieceType> = {
  king: PIECE_NAME_TO_SHORT.king as PieceType,
  queen: PIECE_NAME_TO_SHORT.queen as PieceType,
  rook: PIECE_NAME_TO_SHORT.rook as PieceType,
  bishop: PIECE_NAME_TO_SHORT.bishop as PieceType,
  knight: PIECE_NAME_TO_SHORT.knight as PieceType,
};

/**
 * Valid `piece` query-parameter values accepted by legal-moves challenge/training
 * pages. `random` triggers a mixed-piece session.
 */
export const VALID_PIECE_NAMES = [
  'king',
  'queen',
  'rook',
  'bishop',
  'knight',
  'random',
] as const satisfies readonly PieceFullName[];

/**
 * Resolve the `piece` query parameter the challenge and training pages both
 * read. A missing or unknown value falls back to `random`, which drills every
 * piece; a named piece narrows the session to that one piece.
 */
export function parsePieceParam(raw: string | undefined): {
  selectedPiece: string;
  selectedPieces: PieceType[];
} {
  const selectedPiece =
    raw && (VALID_PIECE_NAMES as readonly string[]).includes(raw) ? raw : 'random';
  const selectedPieces: PieceType[] =
    selectedPiece === 'random' ? [...PIECE_TYPES] : [PIECE_NAME_TO_TYPE[selectedPiece]];
  return { selectedPiece, selectedPieces };
}
