'use client';

import { useCallback } from 'react';

import { BoardLayout, BoardSkeleton } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';
import { BOARD_FRAME_EXPAND_ON_MOBILE_CLASS } from '@/app/_components/chess/BoardFrame';
import { ChessPieceIcon } from '@blindfold-chess/icons';

import { useBoardTheme } from '../useBoardTheme';
import type { StaticPiecePlacement } from './fen-to-static-placements';

/**
 * These aids sit in prose (`/dojo/guides`, the rank Tips card, learn/manual
 * articles), where the board is the explanation — so it gets the same
 * full-bleed-on-mobile frame every other board in the app has. A caller may
 * still replace it: the Tips card passes `mx-auto max-w-[10rem]` for a
 * thumbnail.
 */
const DEFAULT_CLASS_NAME = BOARD_FRAME_EXPAND_ON_MOBILE_CLASS;

type StaticPositionBoardProps = {
  placements: ReadonlyArray<StaticPiecePlacement>;
  className?: string;
};

/**
 * Renders a chess board with a fixed list of piece placements and no
 * interactivity. Used by ranks-guide boards that need to display a multi-piece
 * static position (e.g. the 10-piece random / kingside-castled positions on
 * the 2kyu guide). Unlike `PieceMovementBoard` this places many pieces at
 * once; unlike `ChessBoard` it skips all FEN parsing and move handling.
 */
export function StaticPositionBoard({
  placements,
  className = DEFAULT_CLASS_NAME,
}: StaticPositionBoardProps) {
  const { themeColors, showCoordinates, isLoaded } = useBoardTheme();

  const renderSquare = useCallback(
    ({ square }: SquareRenderInfo) => {
      const placement = placements.find((p) => p.square === square);
      if (!placement) return null;
      return <ChessPieceIcon type={placement.type} color={placement.color} size={32} />;
    },
    [placements]
  );

  if (!isLoaded) {
    return (
      <div className={className}>
        <BoardSkeleton />
      </div>
    );
  }

  return (
    <div className={className}>
      <BoardLayout
        showCoordinates={showCoordinates}
        themeColors={themeColors}
        renderSquare={renderSquare}
      />
    </div>
  );
}
