'use client';

import { TrainingFooter } from '@/app/[locale]/(public)/practice/(challenge)/_components/TrainingFooter';
import type { Locale } from '@/app/[locale]/_lib/types';

import { LegalMovesQuestionPanel } from '../../_components/LegalMovesQuestionPanel';
import type { MoveQuestion } from '../../_lib/types';

type Props = {
  locale: Locale;
  currentQuestion: MoveQuestion;
  showResult: boolean;
  lastAnswer: {
    correct: boolean;
    userAnswer: boolean;
    isLegal: boolean;
  } | null;
  onAnswer: (answer: boolean) => void;
  getQuestion: (from: string, to: string) => string;
  correctCount: number;
  incorrectCount: number;
  onEndTraining: () => void;
};

export function LegalMovesTrainingPlaying({
  locale,
  currentQuestion,
  showResult,
  lastAnswer,
  onAnswer,
  getQuestion,
  correctCount,
  incorrectCount,
  onEndTraining,
}: Props) {
  const inputDisabled = showResult;

  return (
    <div>
      <div className="relative p-8 text-center overflow-hidden">
        <div>
          <LegalMovesQuestionPanel
            currentQuestion={currentQuestion}
            lastAnswer={lastAnswer}
            onAnswer={onAnswer}
            getQuestion={getQuestion}
            disabled={inputDisabled}
          />
        </div>
      </div>

      <TrainingFooter
        correct={correctCount}
        incorrect={incorrectCount}
        onEndTraining={onEndTraining}
        challengeHref={`/${locale}/practice/legal-moves/challenge/session`}
      />
    </div>
  );
}
