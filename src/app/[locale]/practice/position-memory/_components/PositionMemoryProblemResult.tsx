'use client';

import { useMemo } from 'react';

import { useTranslations } from 'next-intl';

import { SectionTitle } from '@/app/[locale]/_components';
import { AnimatedChessBoard } from '@/app/[locale]/practice/_components/AnimatedChessBoard';

import type { PositionAccuracy, PositionData } from '../_lib/types';
import { calculateSquareDifferences } from '../_lib/utils';
import { ChessBoardWithOverlay } from './ChessBoardWithOverlay';

type Props = {
  accuracy: PositionAccuracy;
  originalPosition: PositionData;
  recreatedPosition: string;
  currentProblemIndex: number;
  totalProblems: number;
  onNextProblem: () => void;
  onViewResults: () => void;
};

export function PositionMemoryProblemResult({
  accuracy,
  originalPosition,
  recreatedPosition,
  currentProblemIndex,
  totalProblems,
  onNextProblem,
  onViewResults,
}: Props) {
  const t = useTranslations('practice.positionMemory');
  const isLastProblem = currentProblemIndex >= totalProblems - 1;

  // Calculate square differences for overlay display
  const squareDifferences = useMemo(
    () => calculateSquareDifferences(originalPosition.fen, recreatedPosition),
    [originalPosition.fen, recreatedPosition]
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mb-8">
        <SectionTitle className="text-2xl font-bold text-center mb-6">
          {t('accuracy')}: {accuracy.accuracy.toFixed(1)}%
        </SectionTitle>

        <div className="grid grid-cols-3 gap-4 text-center mb-6">
          <div>
            <p className="text-2xl font-bold text-green-600">{accuracy.correctPieces}</p>
            <p className="text-sm text-muted-foreground">{t('correct')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{accuracy.extraPieces}</p>
            <p className="text-sm text-muted-foreground">{t('extra')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{accuracy.netScore.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">{t('score')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">{t('original')}</p>
            <div className="w-full max-w-xs mx-auto">
              <AnimatedChessBoard
                initialFen={originalPosition.fen}
                showCoordinates={false}
                flipped={originalPosition.isBlackToMove}
              />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">{t('yourRecreation')}</p>
            <div className="w-full max-w-xs mx-auto">
              <ChessBoardWithOverlay
                fen={recreatedPosition}
                flipped={originalPosition.isBlackToMove}
                squareDifferences={squareDifferences}
              />
            </div>
          </div>
        </div>

        {isLastProblem ? (
          <button
            onClick={onViewResults}
            className="w-full mt-6 bg-foreground hover:bg-foreground/90 text-background font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            {t('viewResults')}
          </button>
        ) : (
          <button
            onClick={onNextProblem}
            className="w-full mt-6 bg-foreground hover:bg-foreground/90 text-background font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            {t('nextProblem')}
          </button>
        )}
      </div>
    </div>
  );
}
