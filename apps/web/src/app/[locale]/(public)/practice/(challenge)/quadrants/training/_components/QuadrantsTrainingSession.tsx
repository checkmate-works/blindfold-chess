'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { useBatchTrainingSession } from '@blindfold-chess/features/practice-session';
import type {
  BoardOrientation,
  QuadrantId,
  QuadrantQuestion,
} from '@blindfold-chess/features/quadrants';
import {
  checkQuadrantAnswer,
  generateQuadrantQuestionBatch,
} from '@blindfold-chess/features/quadrants';

import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { QuadrantsTrainingPlaying } from './QuadrantsTrainingPlaying';

type Props = {
  locale: Locale;
  orientation: BoardOrientation;
};

const BATCH_SIZE = 100;

export default function QuadrantsTrainingSession({ locale, orientation }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const tp = useTranslations('practice');

  const {
    currentQuestion,
    hasQuestions,
    showResult,
    lastAnswer,
    correctCount,
    incorrectCount,
    handleAnswer,
  } = useBatchTrainingSession<QuadrantQuestion, QuadrantId>({
    batchSize: BATCH_SIZE,
    generateBatch: () => generateQuadrantQuestionBatch(BATCH_SIZE, orientation),
    checkAnswer: (question, selectedQuadrant) =>
      checkQuadrantAnswer(question.square, selectedQuadrant),
    feedbackDelayMs: (isCorrect: boolean) => (isCorrect ? 500 : 1500),
  });

  useScrollToElement('quadrants-training-session', hasQuestions);

  const onAnswer = useCallback(
    (selectedQuadrant: QuadrantId) => {
      handleAnswer(selectedQuadrant);
    },
    [handleAnswer]
  );

  const handleEndTraining = useCallback(() => {
    showToast(tp('trainingEnded'), 'info');
    router.push(`/${locale}/practice/quadrants`);
  }, [showToast, tp, router, locale]);

  if (!hasQuestions || !currentQuestion) {
    return <PracticeResultSkeleton />;
  }

  return (
    <div id="quadrants-training-session" className="min-h-screen">
      <QuadrantsTrainingPlaying
        currentQuestion={currentQuestion}
        showResult={showResult}
        lastAnswer={lastAnswer}
        onAnswer={onAnswer}
        correctCount={correctCount}
        incorrectCount={incorrectCount}
        onEndTraining={handleEndTraining}
        locale={locale}
      />
    </div>
  );
}
