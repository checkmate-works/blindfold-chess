import type { ReactNode } from 'react';

import { isLightSquare } from '@blindfold-chess/features/common';

import { BoardAnnotationOverlay } from '@/lib/board-annotations/BoardAnnotationOverlay';
import type { BoardAnnotations } from '@/lib/board-annotations/types';
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
    highlightType?: 'none' | 'last-move' | 'selectable' | 'selected' | 'move-dest' | 'capture-dest';
    badge?: ReactNode;
    dataSquare?: string;
  };
  onBoardClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  /**
   * Board-level pointer-down hook driving `ChessBoard`'s interactive drag.
   * Event delegation reads the source square via the same `[data-square]`
   * ancestor lookup as `onBoardClick`; the move/up phases are tracked on
   * `window` by the handler so a drag survives the pointer leaving the board.
   */
  onBoardPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  rounded?: boolean;
  className?: string;
  /**
   * Optional pre-parsed display annotations (arrows + circles). Rendered
   * inside the same `relative` container as the squares so the SVG layer
   * shares the board's coordinate space.
   */
  annotations?: BoardAnnotations | null;
  /**
   * Slot for absolute-positioned overlays that need to share the board's
   * coordinate space — currently the promotion picker. Rendered last so it
   * stacks on top of the squares.
   */
  overlay?: ReactNode;
};

// Visual rows/cols `0..7`, left→right / top→bottom as rendered. The mapping
// from these visual indices to the logical square is delegated to
// `getVisualCellSquare` so that both this component and the animation
// overlay (`usePieceAnimation`) share the same canonical definition.
const VISUAL_INDICES = [0, 1, 2, 3, 4, 5, 6, 7] as const;

export function BoardLayout({
  flipped = false,
  showCoordinates = true,
  themeColors,
  renderSquare,
  squareProps,
  onBoardClick,
  onBoardPointerDown,
  rounded = true,
  className = '',
  annotations = null,
  overlay,
}: Props) {
  return (
    <div className={`w-full ${className}`}>
      <div
        className={`relative w-full aspect-square overflow-hidden ${rounded ? 'rounded-md' : ''}`}
        onClick={onBoardClick}
        onPointerDown={onBoardPointerDown}
      >
        {VISUAL_INDICES.map((row) => {
          return (
            <div key={row} className="flex h-[12.5%]">
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
        {annotations && <BoardAnnotationOverlay annotations={annotations} flipped={flipped} />}
        {overlay}
      </div>
    </div>
  );
}
