'use client';

import { useMemo } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { fenToLichessUrl } from '@blindfold-chess/features/chess-core/fen';
import { FaExternalLinkAlt } from 'react-icons/fa';

import type { BoardTheme } from '@/lib/boardThemes';
import { DEFAULT_BOARD_THEME } from '@/lib/boardThemes';

import { ChessBoardWithOverlay } from '@/app/[locale]/(public)/practice/(free-play)/_components/ChessBoardWithOverlay';
import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';
import { SegmentedProgressBar } from '@/app/[locale]/(public)/practice/_components/SegmentedProgressBar';

import { calculateSquareDifferences } from '../../_lib/preset-problems';
import type { PositionAccuracy, PositionData } from '../../_lib/types';

type Props = {
  accuracy: PositionAccuracy;
  originalPosition: PositionData;
  recreatedPosition: string;
  currentProblemIndex: number;
  totalProblems: number;
  boardTheme?: BoardTheme;
  isTutorial?: boolean;
  onNextProblem: () => void;
  onViewResults: () => void;
  onFinishTutorial?: () => void;
};

export function PositionMemoryProblemResult({
  accuracy,
  originalPosition,
  recreatedPosition,
  currentProblemIndex,
  totalProblems,
  boardTheme = DEFAULT_BOARD_THEME,
  isTutorial = false,
  onNextProblem,
  onViewResults,
  onFinishTutorial,
}: Props) {
  const t = useTranslations('practice.positionMemory');
  const isLastProblem = currentProblemIndex >= totalProblems - 1;

  // Calculate square differences for overlay display
  const squareDifferences = useMemo(
    () => calculateSquareDifferences(originalPosition.fen, recreatedPosition),
    [originalPosition.fen, recreatedPosition]
  );

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-md shadow-sm border border-border p-4">
        <div className="flex flex-col gap-6">
          {/* Accuracy Title */}
          <h2 className="text-2xl font-bold text-center">
            {t('accuracy')}: {accuracy.accuracy.toFixed(1)}% ({accuracy.correctPieces}/
            {accuracy.totalPieces})
          </h2>

          {/* Recreation Progress Bar */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {t('recreationProgress')}
            </p>
            <SegmentedProgressBar
              segments={[
                {
                  key: 'correct',
                  value: accuracy.correctPieces,
                  color: 'bg-success',
                  label: t('correct'),
                },
                {
                  key: 'incorrect',
                  value: accuracy.incorrectPieces,
                  color: 'bg-destructive',
                  label: t('incorrect'),
                },
                {
                  key: 'missing',
                  value: accuracy.missingPieces,
                  color: 'bg-muted-foreground/40',
                  label: t('missing'),
                },
              ]}
              total={accuracy.totalPieces}
            />

            {/* Extra pieces display */}
            {accuracy.extraPieces > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                {t('extra')}: <span className="font-semibold">+{accuracy.extraPieces}</span> (
                {t('extraDescription')})
              </p>
            )}
          </div>

          {/* Board Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">{t('original')}</p>
              <div className="w-full max-w-xs mx-auto">
                <AnimatedChessBoard
                  initialFen={originalPosition.fen}
                  showCoordinates={false}
                  flipped={originalPosition.isBlackToMove}
                  boardTheme={boardTheme}
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {t('yourRecreation')}
              </p>
              <div className="w-full max-w-xs mx-auto">
                <ChessBoardWithOverlay
                  fen={recreatedPosition}
                  flipped={originalPosition.isBlackToMove}
                  squareDifferences={squareDifferences}
                  boardTheme={boardTheme}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isTutorial ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {t('tutorialComplete')}
              </p>
              <Button onClick={onFinishTutorial} variant="primary" size="lg" fullWidth>
                {t('finishTutorial')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {isLastProblem ? (
                <Button onClick={onViewResults} variant="primary" size="lg" fullWidth>
                  {t('viewResults')}
                </Button>
              ) : (
                <Button onClick={onNextProblem} variant="primary" size="lg" fullWidth>
                  {t('nextProblem')}
                </Button>
              )}

              {/* Analyze on Lichess Button */}
              <Button
                onClick={() => {
                  const lichessUrl = fenToLichessUrl(originalPosition.fen);
                  window.open(lichessUrl, '_blank');
                }}
                variant="secondary"
                size="lg"
                fullWidth
                icon={<FaExternalLinkAlt className="w-4 h-4" />}
              >
                {t('analyzeOnLichess')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
