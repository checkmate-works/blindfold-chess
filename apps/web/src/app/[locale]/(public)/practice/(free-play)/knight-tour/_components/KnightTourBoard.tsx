'use client';

import { useCallback } from 'react';

import { BoardLayout, ChessPiece } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';

import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/games/board-themes';

type Props = {
  currentSquare: string;
  visitedSquares: Map<string, number>; // square -> move number
  availableMoves: string[];
  onSquareClick?: (square: string) => void;
  showCoordinates?: boolean;
  showMoveNumbers?: boolean; // Show move numbers on visited squares (for result screen)
  boardTheme?: BoardTheme;
  flipped?: boolean;
};

export function KnightTourBoard({
  currentSquare,
  visitedSquares,
  availableMoves,
  onSquareClick,
  showCoordinates = true,
  showMoveNumbers = false,
  boardTheme = DEFAULT_BOARD_THEME,
  flipped = false,
}: Props) {
  const themeColors = getBoardThemeColors(boardTheme);

  const renderSquare = useCallback(
    ({ square }: SquareRenderInfo) => {
      // Show knight on current square
      if (square === currentSquare) {
        return (
          <div className="w-[80%] h-[80%] flex items-center justify-center">
            <ChessPiece type="n" color="w" size={45} />
          </div>
        );
      }

      // Show marker on visited squares
      const moveNumber = visitedSquares.get(square);
      if (moveNumber !== undefined) {
        if (showMoveNumbers) {
          // Show move number (for result screen)
          return (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xs sm:text-sm font-bold text-white bg-black/50 rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center shadow-md">
                {moveNumber}
              </span>
            </div>
          );
        }
        // Show X mark (during play)
        return (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 text-foreground/50"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            >
              <path d="M6 6L18 18M6 18L18 6" />
            </svg>
          </div>
        );
      }

      return null;
    },
    [currentSquare, visitedSquares, showMoveNumbers]
  );

  const squareProps = useCallback(
    ({ square }: SquareRenderInfo) => {
      const isAvailable = availableMoves.includes(square);
      return {
        onClick: isAvailable && onSquareClick ? () => onSquareClick(square) : undefined,
      };
    },
    [availableMoves, onSquareClick]
  );

  return (
    <BoardLayout
      flipped={flipped}
      showCoordinates={showCoordinates}
      themeColors={themeColors}
      renderSquare={renderSquare}
      squareProps={squareProps}
    />
  );
}
