import type { ReactNode } from 'react';

import { isLightSquare } from '@blindfold-chess/features/common';

import type { TailwindThemeClasses } from '@/lib/games/board-themes';

import { Square } from './Square';
import { getVisualCellSquare } from './board-coords';

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

// Visual rows/cols `0..7`, left→right / top→bottom as rendered. The mapping
// from these visual indices to the logical square is delegated to
// `getVisualCellSquare` so that both this component and the animation
// overlay (`usePieceAnimation`) share the same canonical definition.
const VISUAL_INDICES: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7] as const;

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
  return (
    <div className={`w-full ${className}`}>
      <div
        className={`relative w-full aspect-square border border-border overflow-hidden ${rounded ? 'rounded-md shadow-lg' : ''}`}
        onClick={onBoardClick}
      >
        {VISUAL_INDICES.map((row) => {
          const rowKey = getVisualCellSquare(0, row, flipped).rank;
          return (
            <div key={rowKey} className="flex h-[12.5%]">
              {VISUAL_INDICES.map((col) => {
                const { fileIndex, rankIndex, file, rank, square } = getVisualCellSquare(
                  col,
                  row,
                  flipped
                );
                const isLight = isLightSquare(fileIndex, rankIndex);

                const info: SquareRenderInfo = {
                  square,
                  file,
                  rank,
                  fileIndex,
                  rankIndex,
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
                    showRankCoordinate={col === 0}
                    showFileCoordinate={row === 7}
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
          );
        })}
      </div>
    </div>
  );
}
