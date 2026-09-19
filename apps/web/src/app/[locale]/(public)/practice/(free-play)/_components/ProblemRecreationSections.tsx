'use client';

import type { ReactNode } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { PositionAccuracy } from '@blindfold-chess/features/common';

import type { BoardTheme } from '@/lib/games/board-themes';

import { ProblemResultActions } from '@/app/[locale]/(public)/practice/(free-play)/_components/ProblemResultActions';
import { RecreationComparison } from '@/app/[locale]/(public)/practice/(free-play)/_components/RecreationComparison';
import { PieceRecreationProgress } from '@/app/[locale]/(public)/practice/_components/PieceRecreationProgress';
import type { PositionData } from '@/app/[locale]/(public)/practice/_lib/types';

type Props = {
  /** Practice module namespace, used for the heading and forwarded to all three sections. */
  namespace: string;
  accuracy: PositionAccuracy;
  originalPosition: PositionData;
  recreatedPosition: string;
  currentProblemIndex: number;
  totalProblems: number;
  boardTheme: BoardTheme;
  showCoordinates: boolean;
  isTutorial: boolean;
  onNextProblem: () => void;
  onViewResults: () => void;
  onFinishTutorial?: () => void;
  /** Passed through to {@link ProblemResultActions}. */
  extraActions?: ReactNode;
};

/**
 * What a piece-recreation drill shows after a problem: the accuracy heading,
 * how much of the position was rebuilt, the two boards side by side, and the
 * button that moves on.
 *
 * The FEN drill and position memory each render this same sequence and hand
 * the same props down to the same three components — including the "was that
 * the last problem?" arithmetic, which is about the session rather than about
 * either module. Only the namespace the labels are read from and the extra
 * action buttons differ, so those are the callers' to supply.
 */
export function ProblemRecreationSections({
  namespace,
  accuracy,
  originalPosition,
  recreatedPosition,
  currentProblemIndex,
  totalProblems,
  boardTheme,
  showCoordinates,
  isTutorial,
  onNextProblem,
  onViewResults,
  onFinishTutorial,
  extraActions,
}: Props) {
  const t = useTranslations(namespace);
  const isLastProblem = currentProblemIndex >= totalProblems - 1;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-center">
        {t('accuracy')}: {accuracy.accuracy.toFixed(1)}% ({accuracy.correctPieces}/
        {accuracy.totalPieces})
      </h2>

      <PieceRecreationProgress accuracy={accuracy} namespace={namespace} />

      <RecreationComparison
        namespace={namespace}
        originalPosition={originalPosition}
        recreatedPosition={recreatedPosition}
        boardTheme={boardTheme}
        showCoordinates={showCoordinates}
      />

      <ProblemResultActions
        namespace={namespace}
        isTutorial={isTutorial}
        isLastProblem={isLastProblem}
        onNextProblem={onNextProblem}
        onViewResults={onViewResults}
        onFinishTutorial={onFinishTutorial}
        extraActions={extraActions}
      />
    </div>
  );
}
