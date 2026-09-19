'use client';

import type { PositionAccuracy } from '@blindfold-chess/features/common';

import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME } from '@/lib/games/board-themes';

import { ProblemRecreationSections } from '@/app/[locale]/(public)/practice/(free-play)/_components/ProblemRecreationSections';
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

/** The FEN drill's per-problem result: the shared recreation block, read from this module's namespace. */
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
  return (
    <ProblemRecreationSections
      namespace={NAMESPACE}
      accuracy={accuracy}
      originalPosition={originalPosition}
      recreatedPosition={recreatedPosition}
      currentProblemIndex={currentProblemIndex}
      totalProblems={totalProblems}
      boardTheme={boardTheme}
      showCoordinates={showCoordinates}
      isTutorial={isTutorial}
      onNextProblem={onNextProblem}
      onViewResults={onViewResults}
      onFinishTutorial={onFinishTutorial}
    />
  );
}
