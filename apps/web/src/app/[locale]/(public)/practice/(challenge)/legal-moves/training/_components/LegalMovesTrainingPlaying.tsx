'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { TrainingChallengeCTA } from '@/app/[locale]/(public)/practice/(challenge)/_components/TrainingChallengeCTA';
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
  const tp = useTranslations('practice');
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

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />

      <div className="mt-6 text-center">
        <button
          onClick={onEndTraining}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {tp('endTraining')}
        </button>
      </div>

      <TrainingChallengeCTA challengeHref={`/${locale}/practice/legal-moves/challenge/session`} />
    </div>
  );
}
