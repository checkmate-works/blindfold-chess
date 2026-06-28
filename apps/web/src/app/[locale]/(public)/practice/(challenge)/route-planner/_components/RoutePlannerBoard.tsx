'use client';

import { useCallback, useMemo } from 'react';

import { BoardLayout, ChessPiece } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';
import type { RoutePlannerPieceType } from '@blindfold-chess/features/route-planner';

import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/games/board-themes';

const EMPTY_WRONG_SQUARES: readonly string[] = [];

type Props = {
  startSquare: string;
  targetSquare: string;
  piece: RoutePlannerPieceType;
  path: string[]; // sequence of squares visited, excluding start
  showCoordinates?: boolean;
  boardTheme?: BoardTheme;
  flipped?: boolean;
  highlightedSquare?: string | null;
  wrongSquares?: readonly string[];
};

export function RoutePlannerBoard({
  startSquare,
  targetSquare,
  piece,
  path,
  showCoordinates = true,
  boardTheme = DEFAULT_BOARD_THEME,
  flipped = false,
  highlightedSquare,
  wrongSquares = EMPTY_WRONG_SQUARES,
}: Props) {
  const themeColors = getBoardThemeColors(boardTheme);

  const wrongSet = useMemo(() => new Set(wrongSquares), [wrongSquares]);

  // Map squares to their move number in the path
  const pathMap = useMemo(() => {
    const map = new Map<string, number>();
    path.forEach((square, index) => {
      map.set(square, index + 1);
    });
    return map;
  }, [path]);

  const renderSquare = useCallback(
    ({ square }: SquareRenderInfo) => {
      const isStart = square === startSquare;
      const isTarget = square === targetSquare;
      const moveNumber = pathMap.get(square);
      const inPath = moveNumber !== undefined;
      const isLastMove = moveNumber === path.length;

      if (isStart && !inPath) {
        return (
          <div className="w-full h-full flex items-center justify-center relative">
            <div className="absolute inset-0 bg-blue-500/30" />
            <span className="relative font-bold text-xs sm:text-sm text-white bg-black/60 rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center backdrop-blur-[1px] z-10">
              1
            </span>
          </div>
        );
      }

      if (isTarget) {
        return (
          <div className="w-full h-full flex items-center justify-center relative">
            <div className="absolute inset-0 bg-success" />
            <span className="relative z-10 font-bold text-xs sm:text-sm text-success-foreground">
              Goal
            </span>
          </div>
        );
      }

      if (inPath) {
        const isWrong = wrongSet.has(square);
        return (
          <div className="w-full h-full flex items-center justify-center relative">
            {isWrong && <div className="absolute inset-0 bg-red-500/40" />}
            <div className="relative z-10 flex flex-col items-center justify-center">
              {isLastMove && (
                <div className="opacity-80 absolute inset-0 flex items-center justify-center">
                  <ChessPiece type={piece} color="w" size={35} />
                </div>
              )}
              <span
                className={`text-xs sm:text-sm font-bold text-white bg-black/60 rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center backdrop-blur-[1px] ${isLastMove ? 'ring-2 ring-white scale-110' : ''}`}
              >
                {moveNumber}
              </span>
            </div>
          </div>
        );
      }

      // Show highlighted square (from interaction)
      if (square === highlightedSquare) {
        return <div className="absolute inset-0 bg-yellow-400/50 z-20 pointer-events-none" />;
      }

      return null;
    },
    [startSquare, targetSquare, piece, path, pathMap, highlightedSquare, wrongSet]
  );

  return (
    <BoardLayout
      flipped={flipped}
      showCoordinates={showCoordinates}
      themeColors={themeColors}
      renderSquare={renderSquare}
    />
  );
}
