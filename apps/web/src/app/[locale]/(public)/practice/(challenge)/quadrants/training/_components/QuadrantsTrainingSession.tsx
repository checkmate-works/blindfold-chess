'use client';

import { useCallback } from 'react';

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

import { useTrainingSessionShell } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-training-session-shell';
import type { Locale } from '@/app/[locale]/_lib/types';

import { QuadrantsPlaySkeleton } from '../../_components/QuadrantsPlaySkeleton';
import { QuadrantsTrainingPlaying } from './QuadrantsTrainingPlaying';

type Props = {
  locale: Locale;
  orientation: BoardOrientation;
};

const BATCH_SIZE = 100;

export default function QuadrantsTrainingSession({ locale, orientation }: Props) {
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

  const { sessionElementId, handleEndTraining } = useTrainingSessionShell({
    locale,
    slug: 'quadrants',
    scrollEnabled: hasQuestions,
  });

  const onAnswer = useCallback(
    (selectedQuadrant: QuadrantId) => {
      handleAnswer(selectedQuadrant);
    },
    [handleAnswer]
  );

  if (!hasQuestions || !currentQuestion) {
    return <QuadrantsPlaySkeleton />;
  }

  return (
    <div id={sessionElementId} className="min-h-screen">
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
