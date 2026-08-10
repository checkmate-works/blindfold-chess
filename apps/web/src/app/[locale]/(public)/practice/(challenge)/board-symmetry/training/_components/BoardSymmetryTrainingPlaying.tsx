'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { BoardSymmetryProblem } from '@blindfold-chess/features/board-symmetry';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { TrainingChallengeCTA } from '@/app/[locale]/(public)/practice/(challenge)/_components/TrainingChallengeCTA';
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
  const tp = useTranslations('practice');
  const isDisabled = isProcessing;

  return (
    <div className="max-w-md mx-auto">
      <div className="p-8 text-center relative overflow-hidden">
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

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-4" />

      <div className="mt-6 text-center">
        <button
          onClick={onEndTraining}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {tp('endTraining')}
        </button>
      </div>

      <TrainingChallengeCTA
        challengeHref={`/${locale}/practice/board-symmetry/challenge/session`}
      />
    </div>
  );
}
