import type { Color, PieceSymbol } from '@blindfold-chess/features/chess-core';
import { ChessPieceIcon, type PieceType } from '@blindfold-chess/icons';

type Props = {
  type: PieceSymbol;
  color: Color;
  size?: number;
};

export const ChessPiece = ({ type, color, size = 45 }: Props) => {
  return <ChessPieceIcon type={type as PieceType} color={color} size={size} />;
};
