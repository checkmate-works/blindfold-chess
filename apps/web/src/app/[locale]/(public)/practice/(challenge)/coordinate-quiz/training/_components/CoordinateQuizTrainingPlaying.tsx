'use client';

import Link from 'next/link';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Square } from '@blindfold-chess/types';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
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
      <div className="bg-card rounded-2xl border border-border p-8 text-center overflow-hidden">
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

      <hr className="border-border mt-8" />
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">{tp('trainingModeActive')}</p>
        <p className="mt-2 text-base font-medium text-foreground">{tp('readyForChallenge')}</p>
        <div className="mt-4">
          <Link href={`/${locale}/practice/coordinate-quiz/challenge/session`}>
            <Button asChild variant="primary" size="lg" className="w-full">
              {tp('goToChallenge')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
