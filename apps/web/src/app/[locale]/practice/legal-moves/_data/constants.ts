import { PieceSymbol } from 'chess.js';

import type { PieceType } from '../_lib/types';

// Map piece types to chess.js piece symbols
export const pieceSymbolMap: Record<PieceType, PieceSymbol> = {
  bishop: 'b',
  knight: 'n',
  rook: 'r',
  queen: 'q',
  king: 'k',
};

// Get piece display symbol
export const pieceDisplayMap: Record<PieceType, string> = {
  bishop: '♗',
  knight: '♘',
  rook: '♖',
  queen: '♕',
  king: '♔',
};
