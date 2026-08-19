'use client';

import { useMemo } from 'react';

import { BoardFrame, Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { calculateSquareDifferences } from '@blindfold-chess/features/common';
import type { PositionAccuracy } from '@blindfold-chess/features/common';

import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME } from '@/lib/games/board-themes';

import { ChessBoardWithOverlay } from '@/app/[locale]/(public)/practice/(free-play)/_components/ChessBoardWithOverlay';
import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';
import { PieceRecreationProgress } from '@/app/[locale]/(public)/practice/_components/PieceRecreationProgress';
import type { PositionData } from '@/app/[locale]/(public)/practice/_lib/types';

type Props = {
  accuracy: PositionAccuracy;
  originalPosition: PositionData;
  recreatedPosition: string;
  currentProblemIndex: number;
  totalProblems: number;
  boardTheme?: BoardTheme;
  showCoordinates?: boolean;
  isTutorial?: boolean;
  onNextProblem: () => void;
  onViewResults: () => void;
  onFinishTutorial?: () => void;
};

export function FenProblemResult({
  accuracy,
  originalPosition,
  recreatedPosition,
  currentProblemIndex,
  totalProblems,
  boardTheme = DEFAULT_BOARD_THEME,
  showCoordinates = true,
  isTutorial = false,
  onNextProblem,
  onViewResults,
  onFinishTutorial,
}: Props) {
  const t = useTranslations('practice.fen');
  const isLastProblem = currentProblemIndex >= totalProblems - 1;

  // Calculate square differences for overlay display
  const squareDifferences = useMemo(
    () => calculateSquareDifferences(originalPosition.fen, recreatedPosition),
    [originalPosition.fen, recreatedPosition]
  );

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-md border border-border p-4">
        <div className="flex flex-col gap-6">
          {/* Accuracy Result */}
          <div className="text-center">
            <p className="text-2xl font-bold">
              {t('accuracy')}: {accuracy.accuracy.toFixed(1)}% ({accuracy.correctPieces}/
              {accuracy.totalPieces})
            </p>
          </div>

          <PieceRecreationProgress accuracy={accuracy} namespace="practice.fen" />

          {/* Board Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">{t('original')}</p>
              <BoardFrame>
                <AnimatedChessBoard
                  initialFen={originalPosition.fen}
                  showCoordinates={showCoordinates}
                  flipped={originalPosition.isBlackToMove}
                  boardTheme={boardTheme}
                />
              </BoardFrame>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {t('yourRecreation')}
              </p>
              <BoardFrame>
                <ChessBoardWithOverlay
                  fen={recreatedPosition}
                  flipped={originalPosition.isBlackToMove}
                  squareDifferences={squareDifferences}
                  boardTheme={boardTheme}
                  showCoordinates={showCoordinates}
                />
              </BoardFrame>
            </div>
          </div>

          {/* Action Button */}
          {isTutorial ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {t('tutorialComplete')}
              </p>
              <Button onClick={onFinishTutorial} variant="primary" size="lg" fullWidth>
                {t('finishTutorial')}
              </Button>
            </div>
          ) : isLastProblem ? (
            <Button onClick={onViewResults} variant="primary" size="lg" fullWidth>
              {t('viewResults')}
            </Button>
          ) : (
            <Button onClick={onNextProblem} variant="primary" size="lg" fullWidth>
              {t('nextProblem')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
