'use client';

import { useCallback, useMemo } from 'react';

import { FEEDBACK_FLASH_MS, generateSquareSequence } from '@blindfold-chess/features/common';
import {
  EXCLUDED_QUIZ_SQUARES,
  getDiagonals,
  isValidDiagonalAnswer,
  normalizeDiagonal,
} from '@blindfold-chess/features/diagonal-quiz';
import { useBatchTrainingSession } from '@blindfold-chess/features/practice-session';

import { useTrainingSessionShell } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-training-session-shell';
import type { Locale } from '@/app/[locale]/_lib/types';

import { DiagonalQuizPlaySkeleton } from '../../_components/DiagonalQuizPlaySkeleton';
import { DiagonalQuizTrainingPlaying } from './DiagonalQuizTrainingPlaying';

type Props = {
  locale: Locale;
};

const BATCH_SIZE = 100;

export default function DiagonalQuizTrainingSession({ locale }: Props) {
  const {
    currentQuestion: currentSquare,
    hasQuestions,
    showResult,
    lastAnswer,
    correctCount,
    incorrectCount,
    handleAnswer,
    handleSkip,
    handleNextAfterSkip,
    handleNextAfterIncorrect,
  } = useBatchTrainingSession<string, { diagonalAnswer: string; antiDiagonalAnswer: string }>({
    batchSize: BATCH_SIZE,
    generateBatch: () => generateSquareSequence(BATCH_SIZE, Math.random, EXCLUDED_QUIZ_SQUARES),
    checkAnswer: (square, { diagonalAnswer, antiDiagonalAnswer }) => {
      const { diagonal, antiDiagonal } = getDiagonals(square);

      const diagonalValid = isValidDiagonalAnswer(diagonalAnswer);
      const antiDiagonalValid = isValidDiagonalAnswer(antiDiagonalAnswer);

      const diagonalCorrect =
        diagonalValid && normalizeDiagonal(diagonalAnswer) === normalizeDiagonal(diagonal);
      const antiDiagonalCorrect =
        antiDiagonalValid &&
        normalizeDiagonal(antiDiagonalAnswer) === normalizeDiagonal(antiDiagonal);

      return diagonalCorrect && antiDiagonalCorrect;
    },
    feedbackDelayMs: (isCorrect) =>
      isCorrect ? FEEDBACK_FLASH_MS.correct : FEEDBACK_FLASH_MS.incorrect,
    skipAutoAdvance: false,
    incorrectAutoAdvance: false,
  });

  const { sessionElementId, handleEndTraining } = useTrainingSessionShell({
    locale,
    slug: 'diagonal-quiz',
    scrollEnabled: hasQuestions,
  });

  const onAnswer = useCallback(
    (diagonalAnswer: string, antiDiagonalAnswer: string) => {
      handleAnswer({ diagonalAnswer, antiDiagonalAnswer });
    },
    [handleAnswer]
  );

  const onSkip = useCallback(() => {
    handleSkip();
  }, [handleSkip]);

  const lastAnswerForDisplay = useMemo(() => {
    if (!lastAnswer) return null;
    const { diagonal, antiDiagonal } = getDiagonals(lastAnswer.question);
    return {
      correct: lastAnswer.correct,
      question: lastAnswer.question,
      correctDiagonal: diagonal,
      correctAntiDiagonal: antiDiagonal,
      skipped: lastAnswer.skipped,
      userDiagonal: lastAnswer.userAnswerData?.diagonalAnswer,
      userAntiDiagonal: lastAnswer.userAnswerData?.antiDiagonalAnswer,
    };
  }, [lastAnswer]);

  // Show loading state while squares are being generated
  if (!hasQuestions || !currentSquare) {
    return <DiagonalQuizPlaySkeleton />;
  }

  return (
    <div id={sessionElementId} className="min-h-screen">
      <DiagonalQuizTrainingPlaying
        locale={locale}
        currentSquare={currentSquare}
        showResult={showResult}
        lastAnswer={lastAnswerForDisplay}
        onAnswer={onAnswer}
        onSkip={onSkip}
        onNextAfterSkip={handleNextAfterSkip}
        onNextAfterIncorrect={handleNextAfterIncorrect}
        correctCount={correctCount}
        incorrectCount={incorrectCount}
        onEndTraining={handleEndTraining}
      />
    </div>
  );
}
