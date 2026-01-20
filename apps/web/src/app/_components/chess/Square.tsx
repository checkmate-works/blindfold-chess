import type { ReactNode } from 'react';

import type { TailwindThemeClasses } from '@/lib/boardThemes';

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
  highlightType?: 'none' | 'last-move' | 'selectable';

  // Badge (e.g., evaluation mark)
  badge?: ReactNode;

  // Layout
  layoutMode?: 'flex' | 'grid';

  // Theme
  themeColors?: TailwindThemeClasses;
};

export function Square({
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
}: Props) {
  // Use default colors if themeColors not provided
  const defaultColors = {
    light: 'bg-stone-200 dark:bg-stone-300',
    dark: 'bg-stone-600 dark:bg-stone-700',
    lightCoordinates: 'text-stone-700 dark:text-stone-800',
    darkCoordinates: 'text-stone-300 dark:text-stone-200',
  };
  const colors = themeColors || defaultColors;

  const squareColorClass = isLight ? colors.light : colors.dark;

  const highlightClass =
    highlightType === 'last-move'
      ? 'ring-2 ring-yellow-400 ring-inset'
      : highlightType === 'selectable'
        ? 'ring-2 ring-foreground/50 ring-inset'
        : '';

  const coordinateColorClass = isLight ? colors.lightCoordinates : colors.darkCoordinates;

  const sizeClass = layoutMode === 'grid' ? 'aspect-square' : 'w-[12.5%] h-full';

  return (
    <div
      className={`
        ${sizeClass} relative flex items-center justify-center
        ${squareColorClass}
        ${highlightClass}
        ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
        ${layoutMode === 'grid' ? 'transition-colors select-none' : ''}
      `}
      onClick={onClick}
    >
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
}
