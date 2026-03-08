import type { Color } from '@blindfold-chess/features/chess-core';
import { ChessPieceIcon } from '@blindfold-chess/icons';
import type { PieceType } from '@blindfold-chess/types';

type Props = {
  type: PieceType;
  color: Color;
  size?: number;
};

export const ChessPiece = ({ type, color, size = 45 }: Props) => {
  return <ChessPieceIcon type={type} color={color} size={size} />;
};
