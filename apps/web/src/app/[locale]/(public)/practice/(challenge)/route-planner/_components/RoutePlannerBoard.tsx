'use client';

import { useCallback, useMemo } from 'react';

import { BoardLayout, ChessPiece } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';
import type { RoutePlannerPieceType } from '@blindfold-chess/features/route-planner';

import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/games/board-themes';

type Props = {
  startSquare: string;
  targetSquare: string;
  piece: RoutePlannerPieceType;
  path: string[]; // sequence of squares visited, excluding start
  showCoordinates?: boolean;
  boardTheme?: BoardTheme;
  flipped?: boolean;
  highlightedSquare?: string | null;
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
}: Props) {
  const themeColors = getBoardThemeColors(boardTheme);

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
      if (square === startSquare && !pathMap.has(square)) {
        return (
          <div className="w-full h-full flex items-center justify-center relative">
            <div className="absolute inset-0 bg-blue-500/30"></div>
            <span className="relative font-bold text-xs sm:text-sm text-white bg-black/60 rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center shadow-md backdrop-blur-[1px] z-10">
              1
            </span>
          </div>
        );
      }

      const moveNumber = pathMap.get(square);

      if (moveNumber !== undefined) {
        return (
          <div className="w-full h-full flex items-center justify-center relative">
            {/* Highlight target specifically if it is this square */}
            {square === targetSquare && <div className="absolute inset-0 bg-green-500/20"></div>}
            <div className="relative z-10 flex flex-col items-center justify-center">
              {/* Show Piece on the last move */}
              {moveNumber === path.length && (
                <div className="opacity-80 absolute inset-0 flex items-center justify-center">
                  <ChessPiece type={piece} color="w" size={35} />
                </div>
              )}
              <span
                className={`text-xs sm:text-sm font-bold text-white bg-black/60 rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center shadow-md backdrop-blur-[1px] ${moveNumber === path.length ? 'ring-2 ring-white scale-110' : ''}`}
              >
                {moveNumber}
              </span>
            </div>
          </div>
        );
      }

      // Show Target ghost if not visited
      if (square === targetSquare) {
        return (
          <div className="w-full h-full flex items-center justify-center bg-red-500/20">
            <span className="font-bold text-xs sm:text-sm text-red-600">Goal</span>
          </div>
        );
      }

      // Show highlighted square (from interaction)
      if (square === highlightedSquare) {
        return <div className="absolute inset-0 bg-yellow-400/50 z-20 pointer-events-none"></div>;
      }

      return null;
    },
    [startSquare, targetSquare, piece, path, pathMap, highlightedSquare]
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
