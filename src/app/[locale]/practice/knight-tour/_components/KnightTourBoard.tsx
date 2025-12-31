'use client';

import { useMemo } from 'react';

import { ChessPiece, Square } from '@/app/_components';

import type { BoardTheme } from '@/lib/boardThemes';
import { getBoardThemeColors } from '@/lib/boardThemes';

type Props = {
  currentSquare: string;
  visitedSquares: Map<string, number>; // square -> move number
  availableMoves: string[];
  onSquareClick?: (square: string) => void;
  showCoordinates?: boolean;
  boardTheme?: BoardTheme;
  flipped?: boolean;
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export function KnightTourBoard({
  currentSquare,
  visitedSquares,
  availableMoves,
  onSquareClick,
  showCoordinates = true,
  boardTheme = 'default',
  flipped = false,
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

  const renderSquareContent = (square: string) => {
    // Show knight on current square
    if (square === currentSquare) {
      return (
        <div className="w-[80%] h-[80%] flex items-center justify-center">
          <ChessPiece type="n" color="w" size={45} />
        </div>
      );
    }

    // Show move number on visited squares
    const moveNumber = visitedSquares.get(square);
    if (moveNumber !== undefined) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xs sm:text-sm font-bold text-white bg-blue-600 rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center shadow-md">
            {moveNumber}
          </span>
        </div>
      );
    }

    // Show X mark on available moves
    if (availableMoves.includes(square)) {
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
              const isAvailable = availableMoves.includes(square);

              return (
                <Square
                  key={file}
                  file={file}
                  rank={rank}
                  isLight={isLight}
                  showCoordinates={showCoordinates}
                  showRankCoordinate={fileIndex === 0}
                  showFileCoordinate={rankIndex === 7}
                  onClick={isAvailable && onSquareClick ? () => onSquareClick(square) : undefined}
                  highlightType={isAvailable ? 'selectable' : 'none'}
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
