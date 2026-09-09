'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { PositionAccuracy } from '@blindfold-chess/features/common';

import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME } from '@/lib/games/board-themes';

import { ProblemResultActions } from '@/app/[locale]/(public)/practice/(free-play)/_components/ProblemResultActions';
import { RecreationComparison } from '@/app/[locale]/(public)/practice/(free-play)/_components/RecreationComparison';
import { PieceRecreationProgress } from '@/app/[locale]/(public)/practice/_components/PieceRecreationProgress';
import type { PositionData } from '@/app/[locale]/(public)/practice/_lib/types';

const NAMESPACE = 'practice.fen';

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
  const t = useTranslations(NAMESPACE);
  const isLastProblem = currentProblemIndex >= totalProblems - 1;

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

          <PieceRecreationProgress accuracy={accuracy} namespace={NAMESPACE} />

          <RecreationComparison
            namespace={NAMESPACE}
            originalPosition={originalPosition}
            recreatedPosition={recreatedPosition}
            boardTheme={boardTheme}
            showCoordinates={showCoordinates}
          />

          <ProblemResultActions
            namespace={NAMESPACE}
            isTutorial={isTutorial}
            isLastProblem={isLastProblem}
            onNextProblem={onNextProblem}
            onViewResults={onViewResults}
            onFinishTutorial={onFinishTutorial}
          />
        </div>
      </div>
    </div>
  );
}
