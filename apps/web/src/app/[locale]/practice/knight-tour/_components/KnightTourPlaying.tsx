'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { FaUndo } from 'react-icons/fa';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { ProgressBar } from '@/app/[locale]/practice/_components/ProgressBar';

import { KnightTourBoard } from './KnightTourBoard';

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
  const t = useTranslations('practice.knightTour');
  const tPractice = useTranslations('practice');
  const { preferences } = useGamePreferences();

  return (
    <div className="space-y-4">
      {/* Progress */}
      <ProgressBar current={moveCount} total={64} />

      {/* Board */}
      <div className="flex justify-center">
        <div className="w-full max-w-md">
          <KnightTourBoard
            currentSquare={currentSquare}
            visitedSquares={visitedSquares}
            availableMoves={availableMoves}
            onSquareClick={onSquareClick}
            showCoordinates={preferences.showCoordinates}
            boardTheme={preferences.boardTheme}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <Button
          onClick={onUndo}
          variant="secondary"
          size="md"
          icon={<FaUndo />}
          disabled={!canUndo}
          className="flex-1"
        >
          {t('undo')}
        </Button>
        <Button onClick={onQuit} variant="secondary" size="md" className="flex-1">
          {tPractice('quit')}
        </Button>
      </div>

      {/* Hint */}
      {availableMoves.length === 0 && moveCount < 64 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
          <p className="text-destructive font-medium">{t('stuck')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('stuckHint')}</p>
        </div>
      )}
    </div>
  );
}
