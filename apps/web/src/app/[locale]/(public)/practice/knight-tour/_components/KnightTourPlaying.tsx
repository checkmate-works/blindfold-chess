'use client';

import { BoardSkeleton } from '@/app/_components';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { KnightTourBoard } from './KnightTourBoard';
import { KnightTourPlayingLayout } from './KnightTourPlayingLayout';

type Props = {
  currentSquare: string;
  visitedSquares: Map<string, number>;
  availableMoves: string[];
  moveCount: number;
  onSquareClick: (square: string) => void;
  onUndo: () => void;
  onQuit: () => void;
  canUndo: boolean;
};

export function KnightTourPlaying({
  currentSquare,
  visitedSquares,
  availableMoves,
  moveCount,
  onSquareClick,
  onUndo,
  onQuit,
  canUndo,
}: Props) {
  const { preferences, isLoaded } = useGamePreferences();

  return (
    <KnightTourPlayingLayout
      currentSquare={currentSquare}
      visitedSquares={visitedSquares}
      availableMoves={availableMoves}
      moveCount={moveCount}
      onUndo={onUndo}
      onQuit={onQuit}
      canUndo={canUndo}
    >
      <div className="flex justify-center">
        <div className="w-full max-w-md">
          {!isLoaded ? (
            <BoardSkeleton />
          ) : (
            <KnightTourBoard
              currentSquare={currentSquare}
              visitedSquares={visitedSquares}
              availableMoves={availableMoves}
              onSquareClick={onSquareClick}
              showCoordinates={preferences.showCoordinates}
              boardTheme={preferences.boardTheme}
            />
          )}
        </div>
      </div>
    </KnightTourPlayingLayout>
  );
}
