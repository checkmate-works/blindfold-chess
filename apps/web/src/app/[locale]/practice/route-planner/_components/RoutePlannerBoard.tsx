'use client';

import { useMemo } from 'react';

import { ChessPiece, Square } from '@/app/_components';
import type { PieceSymbol } from 'chess.js';

import type { BoardTheme } from '@/lib/boardThemes';
import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/boardThemes';

type Props = {
  startSquare: string;
  targetSquare: string;
  piece: string;
  path: string[]; // sequence of squares visited, excluding start
  showCoordinates?: boolean;
  boardTheme?: BoardTheme;
  flipped?: boolean;
  highlightedSquare?: string | null;
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

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

  const isLightSquare = (fileIndex: number, rankIndex: number) => {
    return (fileIndex + rankIndex) % 2 === 0;
  };

  const getSquareName = (fileIndex: number, rankIndex: number) => {
    const file = FILES[fileIndex];
    const rank = RANKS[rankIndex];
    return `${file}${rank}`;
  };

  const displayFiles = useMemo(() => (flipped ? [...FILES].reverse() : FILES), [flipped]);
  const displayRanks = useMemo(() => (flipped ? [...RANKS].reverse() : RANKS), [flipped]);

  // Map squares to their move number in the path
  const pathMap = useMemo(() => {
    const map = new Map<string, number>();
    path.forEach((square, index) => {
      map.set(square, index + 1);
    });
    return map;
  }, [path]);

  const renderSquareContent = (square: string) => {
    // Show Start Position
    // Show Target Position (if not visited yet or implicitly handling it)
    // Actually, if the path reaches the target, it will be in `pathMap`.
    // But we might want to highlight the target specially if not reached?
    // For result display, we assume path is what user played.

    // If start square is NOT in pathMap (e.g. path doesn't include start), render it as 1 or Start?
    // But we are normalizing usage to include start in path.
    // Fallback if path is empty/excludes start:
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

    // Show Target Position (if not visited yet or implicitly handling it)
    // Actually, if the path reaches the target, it will be in `pathMap`.
    // But we might want to highlight the target specially if not reached?
    // For result display, we assume path is what user played.

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
                <ChessPiece type={piece.toLowerCase() as PieceSymbol} color="w" size={35} />
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
  };

  return (
    <div className="w-full">
      <div className="relative w-full aspect-square border border-border rounded-md shadow-lg overflow-hidden">
        {displayRanks.map((rank, rankIndex) => (
          <div key={rank} className="flex h-[12.5%]">
            {displayFiles.map((file, fileIndex) => {
              const actualFileIndex = flipped ? 7 - fileIndex : fileIndex;
              const actualRankIndex = flipped ? 7 - rankIndex : rankIndex;
              const square = getSquareName(actualFileIndex, actualRankIndex);
              const isLight = isLightSquare(actualFileIndex, actualRankIndex);

              return (
                <Square
                  key={file}
                  file={file}
                  rank={rank}
                  isLight={isLight}
                  showCoordinates={showCoordinates}
                  showRankCoordinate={fileIndex === 0}
                  showFileCoordinate={rankIndex === 7}
                  themeColors={themeColors}
                >
                  {renderSquareContent(square)}
                </Square>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
