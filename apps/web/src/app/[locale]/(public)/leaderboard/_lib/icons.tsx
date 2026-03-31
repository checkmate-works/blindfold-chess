import type { ReactNode } from 'react';

import { ChessPieceIcon } from '@blindfold-chess/icons';
import type { PieceType } from '@blindfold-chess/types';
import { FaQuestion } from 'react-icons/fa';

import type { LeaderboardModule } from './types';

const MODULE_EMOJIS: Record<LeaderboardModule, string> = {
  coordinate_quiz: '🎯',
  legal_moves: '♟️',
  square_colors: '🎨',
  diagonal_quiz: '♗',
};

const PIECE_ICON_SIZE = 24;

const PIECE_KEYS: Record<string, PieceType> = {
  king: 'k',
  queen: 'q',
  rook: 'r',
  bishop: 'b',
  knight: 'n',
};

export function getLeaderboardIcon(module: LeaderboardModule, settingKey: string): ReactNode {
  if (settingKey === 'random') {
    return <FaQuestion className="w-5 h-5" />;
  }

  const pieceType = PIECE_KEYS[settingKey];
  if (pieceType) {
    return <ChessPieceIcon type={pieceType} color="w" size={PIECE_ICON_SIZE} />;
  }

  return <span className="text-2xl leading-none">{MODULE_EMOJIS[module]}</span>;
}
