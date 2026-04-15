import { useMemo } from 'react';
import type { ReactNode } from 'react';

import { DISPLAY_RANKS, FILES, isLightSquare } from '@blindfold-chess/features/common';

import type { TailwindThemeClasses } from '@/lib/games/board-themes';

import { Square } from './Square';

export type SquareRenderInfo = {
  square: string;
  file: string;
  rank: string;
  fileIndex: number;
  rankIndex: number;
  isLight: boolean;
};

type Props = {
  flipped?: boolean;
  showCoordinates?: boolean;
  themeColors: TailwindThemeClasses;
  renderSquare: (info: SquareRenderInfo) => ReactNode;
  squareProps?: (info: SquareRenderInfo) => {
    onClick?: () => void;
    highlightType?: 'none' | 'last-move' | 'selectable';
    badge?: ReactNode;
    dataSquare?: string;
  };
  onBoardClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  rounded?: boolean;
  className?: string;
};

const getSquareName = (fileIndex: number, rankIndex: number) => {
  return `${FILES[fileIndex]}${DISPLAY_RANKS[rankIndex]}`;
};

export function BoardLayout({
  flipped = false,
  showCoordinates = true,
  themeColors,
  renderSquare,
  squareProps,
  onBoardClick,
  rounded = true,
  className = '',
}: Props) {
  const displayFiles = useMemo(() => (flipped ? [...FILES].reverse() : FILES), [flipped]);
  const displayRanks = useMemo(
    () => (flipped ? [...DISPLAY_RANKS].reverse() : DISPLAY_RANKS),
    [flipped]
  );

  return (
    <div className={`w-full ${className}`}>
      <div
        className={`relative w-full aspect-square border border-border overflow-hidden ${rounded ? 'rounded-md shadow-lg' : ''}`}
        onClick={onBoardClick}
      >
        {displayRanks.map((rank, rankIndex) => (
          <div key={rank} className="flex h-[12.5%]">
            {displayFiles.map((file, fileIndex) => {
              const actualFileIndex = flipped ? 7 - fileIndex : fileIndex;
              const actualRankIndex = flipped ? 7 - rankIndex : rankIndex;
              const square = getSquareName(actualFileIndex, actualRankIndex);
              const isLight = isLightSquare(actualFileIndex, actualRankIndex);

              const info: SquareRenderInfo = {
                square,
                file,
                rank,
                fileIndex: actualFileIndex,
                rankIndex: actualRankIndex,
                isLight,
              };

              const extra = squareProps?.(info);

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
                  onClick={extra?.onClick}
                  highlightType={extra?.highlightType}
                  badge={extra?.badge}
                  dataSquare={extra?.dataSquare}
                >
                  {renderSquare(info)}
                </Square>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
