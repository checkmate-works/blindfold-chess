'use client';

import { useTranslations } from 'next-intl';

import type { BoardTheme } from '@/lib/boardThemes';
import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/boardThemes';

import { pieceDisplayMap } from '../_data/constants';
import type { PieceType } from '../_lib/types';

type Props = {
  selectedPieces: Record<PieceType, boolean>;
  onPieceToggle: (piece: PieceType) => void;
  boardTheme?: BoardTheme;
};

export function PieceSelector({
  selectedPieces,
  onPieceToggle,
  boardTheme = DEFAULT_BOARD_THEME,
}: Props) {
  const t = useTranslations('practice.legalMoves');
  const pieces: PieceType[] = ['king', 'queen', 'rook', 'bishop', 'knight'];
  const themeColors = getBoardThemeColors(boardTheme);

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {pieces.map((piece) => (
        <button
          key={piece}
          onClick={() => onPieceToggle(piece)}
          className={`flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-md transition-all ${
            selectedPieces[piece]
              ? `${themeColors.dark} ${themeColors.darkCoordinates} shadow-lg scale-105`
              : `${themeColors.light} ${themeColors.lightCoordinates} hover:opacity-80 border border-border`
          }`}
          aria-label={t(`pieces.${piece}`)}
          title={t(`pieces.${piece}`)}
        >
          <span className="text-2xl sm:text-3xl">{pieceDisplayMap[piece]}</span>
          <span className="text-[10px] sm:text-xs mt-1 font-medium">{t(`pieces.${piece}`)}</span>
        </button>
      ))}
    </div>
  );
}
