'use client';

import type { BoardSymmetryProblem } from '@blindfold-chess/features/board-symmetry';

import { TrainingFooter } from '@/app/[locale]/(public)/practice/(challenge)/_components/TrainingFooter';
import type { Locale } from '@/app/[locale]/_lib/types';

import { BoardSymmetryQuestionPanel } from '../../_components/BoardSymmetryQuestionPanel';

type Props = {
  problem: BoardSymmetryProblem;
  selectedFile: string | null;
  selectedRank: string | null;
  isCorrect: boolean | null;
  correctCount: number;
  incorrectCount: number;
  onFileToggle: (file: string) => void;
  onRankToggle: (rank: string) => void;
  onBackspace: () => void;
  isProcessing: boolean;
  onEndTraining: () => void;
  locale: Locale;
};

export function BoardSymmetryTrainingPlaying({
  problem,
  selectedFile,
  selectedRank,
  isCorrect,
  correctCount,
  incorrectCount,
  onFileToggle,
  onRankToggle,
  onBackspace,
  isProcessing,
  onEndTraining,
  locale,
}: Props) {
  const isDisabled = isProcessing;

  return (
    <div className="max-w-md mx-auto">
      <div className="py-2 text-center">
        <div>
          <BoardSymmetryQuestionPanel
            problem={problem}
            selectedFile={selectedFile}
            selectedRank={selectedRank}
            isCorrect={isCorrect}
            onFileToggle={onFileToggle}
            onRankToggle={onRankToggle}
            onBackspace={onBackspace}
            inputLocked={isDisabled}
            inputDimmed={isProcessing}
          />
        </div>
      </div>

      <TrainingFooter
        correct={correctCount}
        incorrect={incorrectCount}
        onEndTraining={onEndTraining}
        challengeHref={`/${locale}/practice/board-symmetry/challenge/session`}
      />
    </div>
  );
}
