import type { PieceColor } from '@blindfold-chess/types';

import type { CastlingRights } from '../_components/PositionSettings';

export function buildFenFromParts(
  boardFen: string,
  turn: PieceColor,
  castling: CastlingRights,
  enPassant: string
): string {
  const boardPart = boardFen.split(' ')[0];
  let castlingStr = '';
  if (castling.K) castlingStr += 'K';
  if (castling.Q) castlingStr += 'Q';
  if (castling.k) castlingStr += 'k';
  if (castling.q) castlingStr += 'q';
  if (!castlingStr) castlingStr = '-';
  return `${boardPart} ${turn} ${castlingStr} ${enPassant} 0 1`;
}
