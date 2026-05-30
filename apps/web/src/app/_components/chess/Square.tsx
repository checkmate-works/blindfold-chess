import { memo } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import type { TailwindThemeClasses } from '@/lib/games/board-themes';

type Props = {
  // Position
  file: string;
  rank: string;
  isLight: boolean;

  // Content
  children?: ReactNode;

  // Coordinates
  showCoordinates?: boolean;
  showFileCoordinate?: boolean;
  showRankCoordinate?: boolean;

  // Interaction
  onClick?: () => void;

  // Highlight
  highlightType?: 'none' | 'last-move' | 'selectable' | 'selected' | 'move-dest' | 'capture-dest';

  // Badge (e.g., evaluation mark)
  badge?: ReactNode;

  // Layout
  layoutMode?: 'flex' | 'grid';

  // Theme
  themeColors?: TailwindThemeClasses;

  // Data attribute for event delegation
  dataSquare?: string;
};

export const Square = memo(function Square({
  file,
  rank,
  isLight,
  children,
  showCoordinates = false,
  showFileCoordinate = false,
  showRankCoordinate = false,
  onClick,
  highlightType = 'none',
  badge,
  layoutMode = 'flex',
  themeColors,
  dataSquare,
}: Props) {
  // Use default colors if themeColors not provided
  const defaultColors: TailwindThemeClasses = {
    light: 'bg-stone-200 dark:bg-stone-300',
    dark: 'bg-stone-600 dark:bg-stone-700',
    lightCoordinates: 'text-stone-700 dark:text-stone-800',
    darkCoordinates: 'text-stone-300 dark:text-stone-200',
  };
  const colors = themeColors || defaultColors;

  const squareColorClass = isLight ? colors.light : colors.dark;

  // `last-move` and `selectable` keep their inset ring (also used by the
  // non-interactive boards that reuse these types as generic square
  // highlighters). The interactive move affordances — selected square, legal
  // destinations, captures — are rendered as an inset overlay (below) using
  // the exact lichess/chessground values, so the simple ring would be wrong
  // for them.
  const highlightClass =
    highlightType === 'last-move'
      ? 'ring-2 ring-yellow-400 ring-inset'
      : highlightType === 'selectable'
        ? 'ring-2 ring-foreground/50 ring-inset'
        : '';

  // Lichess/chessground move-affordance overlays, copied verbatim from lila
  // `ui/lib/css/theme/board/_chessground.scss`. Rendered as an absolutely
  // positioned, pointer-events-none layer behind the piece and coordinates.
  const highlightOverlayStyle: CSSProperties | null =
    highlightType === 'selected'
      ? { backgroundColor: 'rgba(20, 85, 30, 0.5)' }
      : highlightType === 'move-dest'
        ? {
            background:
              'radial-gradient(rgba(20, 85, 30, 0.5) 19%, rgba(0, 0, 0, 0) calc(20% + 1px))',
          }
        : highlightType === 'capture-dest'
          ? {
              background:
                'radial-gradient(transparent 0%, transparent 79%, rgba(20, 85, 0, 0.3) calc(80% + 1px))',
            }
          : null;

  const coordinateColorClass = isLight ? colors.lightCoordinates : colors.darkCoordinates;

  const sizeClass = layoutMode === 'grid' ? 'aspect-square' : 'w-[12.5%] h-full';

  return (
    <div
      className={`
        ${sizeClass} relative flex items-center justify-center touch-manipulation select-none
        ${squareColorClass}
        ${highlightClass}
        ${onClick || dataSquare ? 'cursor-pointer hover:opacity-80' : ''}
        ${layoutMode === 'grid' ? 'transition-colors' : ''}
      `}
      onClick={onClick}
      data-square={dataSquare}
    >
      {/* Lichess-style move-affordance overlay, painted under the piece. */}
      {highlightOverlayStyle && (
        <div
          aria-hidden
          data-highlight={highlightType}
          className="absolute inset-0 pointer-events-none"
          style={highlightOverlayStyle}
        />
      )}

      <div className="flex items-center justify-center w-full h-full">{children}</div>

      {/* Coordinates */}
      {showCoordinates && showRankCoordinate && (
        <div
          className={`absolute left-0.5 top-0.5 text-[0.6rem] sm:text-xs font-semibold pointer-events-none ${coordinateColorClass}`}
        >
          {rank}
        </div>
      )}
      {showCoordinates && showFileCoordinate && (
        <div
          className={`absolute right-0.5 bottom-0.5 text-[0.6rem] sm:text-xs font-semibold pointer-events-none ${coordinateColorClass}`}
        >
          {file}
        </div>
      )}

      {/* Badge (e.g., evaluation mark) */}
      {badge && <div className="absolute -right-1 -top-1 z-10 pointer-events-none">{badge}</div>}
    </div>
  );
});
