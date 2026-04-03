'use client';

import { useCallback } from 'react';

import { BoardLayout, BoardSkeleton } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';
import { ChessPieceIcon } from '@blindfold-chess/icons';

import { useBoardTheme } from './useBoardTheme';

const QUEEN_SQUARE = 'd4';
const LEGAL_MOVE_SQUARES = [
  // Same rank
  'a4',
  'b4',
  'c4',
  'e4',
  'f4',
  'g4',
  'h4',
  // Same file
  'd1',
  'd2',
  'd3',
  'd5',
  'd6',
  'd7',
  'd8',
  // Diagonals
  'a1',
  'b2',
  'c3',
  'e5',
  'f6',
  'g7',
  'h8',
  'a7',
  'b6',
  'c5',
  'e3',
  'f2',
  'g1',
];

const DEFAULT_CLASS_NAME = 'mx-auto max-w-xs sm:max-w-sm';

type QueenMovementBoardProps = {
  className?: string;
};

export function QueenMovementBoard({ className = DEFAULT_CLASS_NAME }: QueenMovementBoardProps) {
  const { themeColors, isLoaded } = useBoardTheme();

  const renderSquare = useCallback(({ square, isLight }: SquareRenderInfo) => {
    if (square === QUEEN_SQUARE) {
      return <ChessPieceIcon type="q" color="w" size={32} />;
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
