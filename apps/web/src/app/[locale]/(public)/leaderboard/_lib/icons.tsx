import type { ReactNode } from 'react';

import { ChessPieceIcon } from '@blindfold-chess/icons';
import type { PieceType } from '@blindfold-chess/types';
import { FaQuestion } from 'react-icons/fa';

import { PRACTICE_EMOJIS } from '@/app/[locale]/(public)/practice/_lib/practice-emojis';

import type { LeaderboardModule } from './types';

export type IconSize = 'sm' | 'lg';

const PIECE_ICON_SIZES: Record<IconSize, number> = {
  sm: 24,
  lg: 48,
};

const QUESTION_CLASSES: Record<IconSize, string> = {
  sm: 'w-5 h-5',
  lg: 'w-10 h-10',
};

const EMOJI_CLASSES: Record<IconSize, string> = {
  sm: 'text-2xl leading-none',
  lg: 'text-3xl sm:text-4xl leading-none',
};

const PIECE_KEYS: Record<string, PieceType> = {
  king: 'k',
  queen: 'q',
  rook: 'r',
  bishop: 'b',
  knight: 'n',
};

export function getLeaderboardIcon(
  module: LeaderboardModule,
  settingKey: string,
  size: IconSize = 'sm'
): ReactNode {
  if (settingKey === 'random') {
    return <FaQuestion className={QUESTION_CLASSES[size]} />;
  }

  const pieceType = PIECE_KEYS[settingKey];
  if (pieceType) {
    return <ChessPieceIcon type={pieceType} color="w" size={PIECE_ICON_SIZES[size]} />;
  }

  return <span className={EMOJI_CLASSES[size]}>{PRACTICE_EMOJIS[module]}</span>;
}
