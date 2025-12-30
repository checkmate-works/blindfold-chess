'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { FaUndo } from 'react-icons/fa';

import { ProgressBar } from '@/app/[locale]/practice/_components/ProgressBar';

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

export function KnightTourBlindPlaying({
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
  const [selectedMove, setSelectedMove] = useState<string>('');

  const handleMoveSelect = (move: string) => {
    setSelectedMove(move);
  };

  const handleSubmit = () => {
    if (selectedMove && availableMoves.includes(selectedMove)) {
      onSquareClick(selectedMove);
      setSelectedMove('');
    }
  };

  // Get move history as array of squares
  const moveHistory = Array.from(visitedSquares.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([square, num]) => ({ square, num }));

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('progress')}</h3>
        <ProgressBar current={moveCount} total={64} />
      </div>

      {/* Current Position */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">{t('currentPosition')}</p>
        <p className="text-5xl font-bold text-foreground font-mono">{currentSquare}</p>
      </div>

      {/* Available Moves */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('availableMoves')}</h3>
        {availableMoves.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {availableMoves.map((move) => (
              <button
                key={move}
                onClick={() => handleMoveSelect(move)}
                className={`
                  py-3 px-4 text-lg font-mono font-bold rounded-lg transition-colors
                  ${
                    selectedMove === move
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-secondary text-foreground'
                  }
                `}
              >
                {move}
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
            <p className="text-destructive font-medium">{t('stuck')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('stuckHint')}</p>
          </div>
        )}

        {selectedMove && (
          <div className="mt-4">
            <Button onClick={handleSubmit} variant="primary" size="lg" className="w-full">
              {t('confirmMove', { square: selectedMove })}
            </Button>
          </div>
        )}
      </div>

      {/* Move History */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('moveHistory')}</h3>
        <div className="max-h-32 overflow-y-auto">
          <div className="flex flex-wrap gap-1">
            {moveHistory.map(({ square, num }) => (
              <span
                key={square}
                className="inline-flex items-center px-2 py-1 text-xs font-mono bg-muted rounded"
              >
                <span className="text-muted-foreground mr-1">{num}.</span>
                <span className="font-bold">{square}</span>
              </span>
            ))}
          </div>
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
    </div>
  );
}
