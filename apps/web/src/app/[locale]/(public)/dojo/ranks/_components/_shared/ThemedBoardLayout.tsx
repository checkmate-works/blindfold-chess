'use client';

import type { ComponentProps, ReactNode } from 'react';

import { BoardLayout, BoardSkeleton } from '@/app/_components';
import {
  BOARD_FRAME_EXPAND_ON_MOBILE_CLASS,
  BOARD_RADIUS_EXPAND_ON_MOBILE,
} from '@/app/_components/chess/BoardFrame';

import { useBoardTheme } from '../useBoardTheme';

type BoardLayoutProps = ComponentProps<typeof BoardLayout>;

type Props = {
  renderSquare: BoardLayoutProps['renderSquare'];
  squareProps?: BoardLayoutProps['squareProps'];
  /**
   * Overrides the reader's coordinate preference. Left unset, the board shows
   * coordinates when the preference says so; `CoordinateBoard` passes `false`
   * because it draws its own label inside every square.
   */
  showCoordinates?: boolean;
  /**
   * Wrapper class. These aids sit in prose (`/dojo/guides`, the rank Tips
   * card, learn/manual articles), where the board is the explanation — so
   * the default is the same full-bleed-on-mobile frame every other board in
   * the app has. A caller may still replace it: the Tips card passes
   * `mx-auto max-w-[10rem]` for a thumbnail.
   */
  className?: string;
  /**
   * Content layered over the loaded board (an SVG of highlights or arrows).
   * The wrapper becomes `relative` so an absolutely-positioned overlay shares
   * the board's box; the skeleton is never overlaid.
   */
  overlay?: ReactNode;
};

/**
 * The static, reader-themed board every ranks-guide illustration is drawn on.
 *
 * Reads the board theme and coordinate preference, shows the board skeleton
 * until those preferences have loaded, and then renders `BoardLayout` with the
 * full-bleed-on-mobile radius. Seven illustration boards had this same
 * skeleton-or-board sequence written out around their own `renderSquare`; the
 * only thing that varies between them is what goes on each square, so that is
 * the only thing they pass.
 */
export function ThemedBoardLayout({
  renderSquare,
  squareProps,
  showCoordinates,
  className = BOARD_FRAME_EXPAND_ON_MOBILE_CLASS,
  overlay,
}: Props) {
  const { themeColors, showCoordinates: preferredCoordinates, isLoaded } = useBoardTheme();

  if (!isLoaded) {
    return (
      <div className={className}>
        <BoardSkeleton rounded={BOARD_RADIUS_EXPAND_ON_MOBILE} />
      </div>
    );
  }

  return (
    <div className={overlay ? `relative ${className}` : className}>
      <BoardLayout
        showCoordinates={showCoordinates ?? preferredCoordinates}
        themeColors={themeColors}
        renderSquare={renderSquare}
        squareProps={squareProps}
        rounded={BOARD_RADIUS_EXPAND_ON_MOBILE}
      />
      {overlay}
    </div>
  );
}
