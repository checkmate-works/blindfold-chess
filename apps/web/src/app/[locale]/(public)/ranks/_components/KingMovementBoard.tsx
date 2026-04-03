'use client';

import { useCallback } from 'react';

import { BoardLayout, BoardSkeleton } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';
import { ChessPieceIcon } from '@blindfold-chess/icons';

import { useBoardTheme } from './useBoardTheme';

const KING_SQUARE = 'd4';
const LEGAL_MOVE_SQUARES = ['c3', 'c4', 'c5', 'd3', 'd5', 'e3', 'e4', 'e5'];

const DEFAULT_CLASS_NAME = 'mx-auto max-w-xs sm:max-w-sm';

type KingMovementBoardProps = {
  className?: string;
};

export function KingMovementBoard({ className = DEFAULT_CLASS_NAME }: KingMovementBoardProps) {
  const { themeColors, isLoaded } = useBoardTheme();

  const renderSquare = useCallback(({ square, isLight }: SquareRenderInfo) => {
    if (square === KING_SQUARE) {
      return <ChessPieceIcon type="k" color="w" size={32} />;
    }
    if (LEGAL_MOVE_SQUARES.includes(square)) {
      return (
        <span
          className={`text-lg sm:text-2xl select-none ${
            isLight ? 'text-black/30' : 'text-white/30'
          }`}
        >
          ・
        </span>
      );
    }
    return null;
  }, []);

  if (!isLoaded) {
    return (
      <div className={className}>
        <BoardSkeleton />
      </div>
    );
  }

  return (
    <div className={className}>
      <BoardLayout showCoordinates themeColors={themeColors} renderSquare={renderSquare} />
    </div>
  );
}
