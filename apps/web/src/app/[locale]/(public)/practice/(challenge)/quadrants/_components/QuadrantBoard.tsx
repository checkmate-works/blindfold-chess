'use client';

import { useCallback } from 'react';

import { BoardLayout, BoardSkeleton } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';
import type { QuadrantId } from '@blindfold-chess/features/quadrants';

import { getBoardThemeColors } from '@/lib/games/board-themes';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  correctQuadrant?: QuadrantId | null;
  wrongQuadrant?: QuadrantId | null;
  onQuadrantClick: (id: QuadrantId) => void;
  disabled?: boolean;
  orientation?: 'white' | 'black';
};

/**
 * Maps logical fileIndex/rankIndex to QuadrantId.
 * White orientation standard:
 * q1 (TR): file 4-7, rank 4-7
 * q2 (TL): file 0-3, rank 4-7
 * q3 (BL): file 0-3, rank 0-3
 * q4 (BR): file 4-7, rank 0-3
 */
function getQuadrantId(fileIndex: number, rankIndex: number): QuadrantId {
  const isTopHalf = rankIndex < 4; // rankIndex 0..3 corresponds to ranks 8,7,6,5
  const isLeftHalf = fileIndex < 4; // fileIndex 0..3 corresponds to files a,b,c,d
  if (isTopHalf && isLeftHalf) return 'q2';
  if (isTopHalf && !isLeftHalf) return 'q1';
  if (!isTopHalf && isLeftHalf) return 'q3';
  return 'q4';
}

export default function QuadrantBoard({
  correctQuadrant,
  wrongQuadrant,
  onQuadrantClick,
  disabled,
  orientation = 'white',
}: Props) {
  const { preferences, isLoaded } = useGamePreferences();

  // Map visual position (tl, tr, bl, br) to logical QuadrantId based on orientation
  const getVisualQuadrantId = useCallback(
    (position: 'tl' | 'tr' | 'bl' | 'br'): QuadrantId => {
      if (orientation === 'white') {
        switch (position) {
          case 'tl':
            return 'q2';
          case 'tr':
            return 'q1';
          case 'bl':
            return 'q3';
          case 'br':
            return 'q4';
        }
      } else {
        switch (position) {
          case 'tl':
            return 'q4';
          case 'tr':
            return 'q3';
          case 'bl':
            return 'q1';
          case 'br':
            return 'q2';
        }
      }
    },
    [orientation]
  );

  const getSegmentColor = useCallback(
    (segments: ('tl' | 'tr' | 'bl' | 'br')[], fallback: string = 'bg-yellow-400') => {
      for (const seg of segments) {
        const segId = getVisualQuadrantId(seg);
        if (correctQuadrant === segId) return 'bg-green-500 z-40';
        if (wrongQuadrant === segId) return 'bg-red-500 z-40';
      }
      return `${fallback} z-20`;
    },
    [getVisualQuadrantId, correctQuadrant, wrongQuadrant]
  );

  const getHighlightClass = useCallback(
    (qId: QuadrantId) => {
      if (qId === correctQuadrant) return 'bg-green-500/30';
      if (qId === wrongQuadrant) return 'bg-red-500/30';
      return '';
    },
    [correctQuadrant, wrongQuadrant]
  );

  const renderSquare = useCallback(
    ({ fileIndex, rankIndex }: SquareRenderInfo) => {
      const qId = getQuadrantId(fileIndex, rankIndex);
      const highlightClass = getHighlightClass(qId);
      if (!highlightClass) return null;
      return <div className={`absolute inset-0 ${highlightClass} z-10 pointer-events-none`} />;
    },
    [getHighlightClass]
  );

  const squareProps = useCallback(
    ({ fileIndex, rankIndex }: SquareRenderInfo) => {
      const qId = getQuadrantId(fileIndex, rankIndex);
      return {
        onClick: disabled ? undefined : () => onQuadrantClick(qId),
      };
    },
    [onQuadrantClick, disabled]
  );

  if (!isLoaded) {
    return (
      <div className="mx-auto w-full max-w-xs sm:max-w-sm relative">
        <BoardSkeleton />
      </div>
    );
  }

  const themeColors = getBoardThemeColors(preferences.boardTheme);

  return (
    <div className="mx-auto w-full max-w-xs sm:max-w-sm relative group rounded-md shadow-lg overflow-hidden">
      <BoardLayout
        flipped={orientation === 'black'}
        showCoordinates={preferences.showCoordinates}
        themeColors={themeColors}
        renderSquare={renderSquare}
        squareProps={squareProps}
        rounded={false}
      />

      {/* Segmented Overlay Lines (Borders) */}
      <div className="absolute inset-0 pointer-events-none">
        {/* CENTER CROSS */}
        <div
          className={`absolute left-1/2 top-0 h-1/2 w-[3px] -translate-x-1/2 ${getSegmentColor(['tl', 'tr'])}`}
        />
        <div
          className={`absolute left-1/2 bottom-0 h-1/2 w-[3px] -translate-x-1/2 ${getSegmentColor(['bl', 'br'])}`}
        />
        <div
          className={`absolute top-1/2 left-0 w-1/2 h-[3px] -translate-y-1/2 ${getSegmentColor(['tl', 'bl'])}`}
        />
        <div
          className={`absolute top-1/2 right-0 w-1/2 h-[3px] -translate-y-1/2 ${getSegmentColor(['tr', 'br'])}`}
        />

        {/* OUTER FRAME (3px width) */}
        <div className={`absolute top-0 left-0 w-1/2 h-[3px] ${getSegmentColor(['tl'])}`} />
        <div className={`absolute top-0 right-0 w-1/2 h-[3px] ${getSegmentColor(['tr'])}`} />
        <div className={`absolute bottom-0 left-0 w-1/2 h-[3px] ${getSegmentColor(['bl'])}`} />
        <div className={`absolute bottom-0 right-0 w-1/2 h-[3px] ${getSegmentColor(['br'])}`} />
        <div className={`absolute top-0 left-0 h-1/2 w-[3px] ${getSegmentColor(['tl'])}`} />
        <div className={`absolute bottom-0 left-0 h-1/2 w-[3px] ${getSegmentColor(['bl'])}`} />
        <div className={`absolute top-0 right-0 h-1/2 w-[3px] ${getSegmentColor(['tr'])}`} />
        <div className={`absolute bottom-0 right-0 h-1/2 w-[3px] ${getSegmentColor(['br'])}`} />
      </div>
    </div>
  );
}
