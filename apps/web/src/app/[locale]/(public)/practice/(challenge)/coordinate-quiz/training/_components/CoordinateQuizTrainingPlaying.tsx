'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Square } from '@blindfold-chess/types';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { TrainingChallengeCTA } from '@/app/[locale]/(public)/practice/(challenge)/_components/TrainingChallengeCTA';
import type { Locale } from '@/app/[locale]/_lib/types';

import { CoordinateQuizGameBoard } from '../../_components/CoordinateQuizGameBoard';
import type { CoordinateQuestion } from '../../_lib/types';

type Props = {
  locale: Locale;
  currentQuestion: CoordinateQuestion | null;
  correctAnswers: number;
  wrongAnswers: number;
  lastClickedSquare: Square | null;
  showFeedback: boolean;
  isCorrect: boolean;
  onSquareClick: (square: Square) => void;
  onEndTraining: () => void;
};

export function CoordinateQuizTrainingPlaying({
  locale,
  currentQuestion,
  correctAnswers,
  wrongAnswers,
  lastClickedSquare,
  showFeedback,
  isCorrect,
  onSquareClick,
  onEndTraining,
}: Props) {
  const tp = useTranslations('practice');

  return (
    <div>
      <div className="-mx-4 p-8 text-center overflow-hidden sm:mx-0">
        <div className="max-w-md mx-auto mb-8 relative">
          <div className="-mx-8 sm:mx-0">
            <CoordinateQuizGameBoard
              currentQuestion={currentQuestion}
              onSquareClick={onSquareClick}
              lastClickedSquare={lastClickedSquare}
              showFeedback={showFeedback}
              isCorrect={isCorrect}
              countdown={null}
            />
          </div>
        </div>
      </div>

      <ScoreCounter correct={correctAnswers} incorrect={wrongAnswers} className="mt-4" />

      <div className="mt-6 text-center">
        <button
          onClick={onEndTraining}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {tp('endTraining')}
        </button>
      </div>

      <TrainingChallengeCTA
        challengeHref={`/${locale}/practice/coordinate-quiz/challenge/session`}
      />
    </div>
  );
}
