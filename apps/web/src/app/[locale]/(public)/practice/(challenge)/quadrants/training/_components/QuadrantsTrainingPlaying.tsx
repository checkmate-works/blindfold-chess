'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { QuadrantId, QuadrantQuestion } from '@blindfold-chess/features/quadrants';
import { getCorrectQuadrant } from '@blindfold-chess/features/quadrants';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { TrainingChallengeCTA } from '@/app/[locale]/(public)/practice/(challenge)/_components/TrainingChallengeCTA';
import type { Locale } from '@/app/[locale]/_lib/types';

import QuadrantBoard from '../../_components/QuadrantBoard';

type Props = {
  currentQuestion: QuadrantQuestion;
  showResult: boolean;
  lastAnswer: {
    correct: boolean;
    question: QuadrantQuestion;
    userAnswerData: QuadrantId | null;
    skipped: boolean;
  } | null;
  onAnswer: (quadrant: QuadrantId) => void;
  correctCount: number;
  incorrectCount: number;
  onEndTraining: () => void;
  locale: Locale;
};

export function QuadrantsTrainingPlaying({
  currentQuestion,
  showResult,
  lastAnswer,
  onAnswer,
  correctCount,
  incorrectCount,
  onEndTraining,
  locale,
}: Props) {
  const t = useTranslations('practice.quadrantAnchors');
  const tp = useTranslations('practice');
  const tQuiz = useTranslations('practice.coordinateQuiz');

  const correctQuadrant =
    showResult && lastAnswer ? getCorrectQuadrant(lastAnswer.question.square) : undefined;
  const wrongQuadrant =
    showResult && lastAnswer && !lastAnswer.correct && lastAnswer.userAnswerData
      ? lastAnswer.userAnswerData
      : undefined;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="p-6 text-center relative overflow-hidden space-y-4">
        {/* Orientation Indicator */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <div
              className={`w-5 h-5 rounded-full border-2 ${
                currentQuestion.orientation === 'white'
                  ? 'bg-white border-gray-800 dark:border-gray-600'
                  : 'bg-gray-800 dark:bg-gray-700 border-gray-800 dark:border-gray-600'
              }`}
            />
            <span className="text-sm font-medium text-muted-foreground">
              {currentQuestion.orientation === 'white'
                ? tQuiz('whiteToMove')
                : tQuiz('blackToMove')}
            </span>
          </div>
        </div>

        {/* Question */}
        <div className="text-2xl font-bold text-foreground">
          {t('question', { square: currentQuestion.square })}
        </div>

        {/* Quadrant Board */}
        <div className="-mx-6 sm:mx-0">
          <div className="min-h-[120px] flex flex-col justify-center items-center">
            <QuadrantBoard
              correctQuadrant={correctQuadrant}
              wrongQuadrant={wrongQuadrant}
              onQuadrantClick={onAnswer}
              disabled={showResult}
              orientation={currentQuestion.orientation}
            />
          </div>
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

      <TrainingChallengeCTA challengeHref={`/${locale}/practice/quadrants/challenge`} />
    </div>
  );
}
