'use client';

import { type ReactNode, useMemo } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaUndo } from 'react-icons/fa';

import { ProgressBar } from '@/app/[locale]/(public)/practice/_components/ProgressBar';

type Props = {
  currentSquare: string;
  visitedSquares: Map<string, number>;
  availableMoves: string[];
  moveCount: number;
  onUndo: () => void;
  onQuit: () => void;
  canUndo: boolean;
  positionTextSize?: string;
  children: ReactNode;
};

export function KnightTourPlayingLayout({
  currentSquare,
  visitedSquares,
  availableMoves,
  moveCount,
  onUndo,
  onQuit,
  canUndo,
  positionTextSize = 'text-3xl',
  children,
}: Props) {
  const t = useTranslations('practice.knightTour');
  const tPractice = useTranslations('practice');

  const moveHistory = useMemo(
    () =>
      Array.from(visitedSquares.entries())
        .sort((a, b) => a[1] - b[1])
        .map(([square, num]) => ({ square, num })),
    [visitedSquares]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-6">
        {/* Progress */}
        <ProgressBar current={moveCount} total={64} />

        {/* Current Position */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">{t('currentPosition')}</p>
          <p className={`${positionTextSize} font-bold text-foreground font-mono`}>
            {currentSquare}
          </p>
        </div>

        {/* Interaction Area */}
        {availableMoves.length > 0 ? (
          children
        ) : (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 text-center">
            <p className="text-destructive font-medium">{t('stuck')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('stuckHint')}</p>
          </div>
        )}

        {/* Move History */}
        {moveHistory.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('moveHistory')}</h3>
            <div className="max-h-32 overflow-y-auto">
              <div className="flex flex-wrap gap-1">
                {moveHistory.map(({ square, num }) => (
                  <span
                    key={square}
                    className="inline-flex items-center px-2 py-1 text-xs font-mono bg-muted rounded"
                  >
                    <span className="text-muted-foreground mr-1">{num}.</span>
                    <span className="font-bold">N{square}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

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
          <Button onClick={onQuit} variant="destructive" size="md" className="flex-1">
            {tPractice('quit')}
          </Button>
        </div>
      </div>
    </div>
  );
}
