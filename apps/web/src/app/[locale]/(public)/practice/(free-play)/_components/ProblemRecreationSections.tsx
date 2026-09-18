'use client';

import type { ReactNode } from 'react';

import type { PositionAccuracy } from '@blindfold-chess/features/common';

import type { BoardTheme } from '@/lib/games/board-themes';

import { ProblemResultActions } from '@/app/[locale]/(public)/practice/(free-play)/_components/ProblemResultActions';
import { RecreationComparison } from '@/app/[locale]/(public)/practice/(free-play)/_components/RecreationComparison';
import { PieceRecreationProgress } from '@/app/[locale]/(public)/practice/_components/PieceRecreationProgress';
import type { PositionData } from '@/app/[locale]/(public)/practice/_lib/types';

type Props = {
  /** Practice module namespace, forwarded to all three sections. */
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
 * What a piece-recreation drill shows after a problem, below its heading:
 * how much of the position was rebuilt, the two boards side by side, and the
 * button that moves on.
 *
 * The FEN drill and position memory each render this same sequence and hand
 * the same props down to the same three components — including the "was that
 * the last problem?" arithmetic, which is about the session rather than about
 * either module. What differs between them is the chrome above and around
 * this block, so that stays with each caller.
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
  const isLastProblem = currentProblemIndex >= totalProblems - 1;

  return (
    <>
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
    </>
  );
}
