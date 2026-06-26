'use client';

import { useCallback, useMemo } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FEEDBACK_FLASH_MS, generateSquareSequence } from '@blindfold-chess/features/common';
import {
  EXCLUDED_QUIZ_SQUARES,
  getDiagonals,
  isValidDiagonalAnswer,
  normalizeDiagonal,
} from '@blindfold-chess/features/diagonal-quiz';
import { useBatchTrainingSession } from '@blindfold-chess/features/practice-session';

import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { DiagonalQuizPlaySkeleton } from '../../_components/DiagonalQuizPlaySkeleton';
import { DiagonalQuizTrainingPlaying } from './DiagonalQuizTrainingPlaying';

type Props = {
  locale: Locale;
};

const BATCH_SIZE = 100;

export default function DiagonalQuizTrainingSession({ locale }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const tp = useTranslations('practice');

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

  useScrollToElement('diagonal-quiz-training-session', hasQuestions);

  const onAnswer = useCallback(
    (diagonalAnswer: string, antiDiagonalAnswer: string) => {
      handleAnswer({ diagonalAnswer, antiDiagonalAnswer });
    },
    [handleAnswer]
  );

  const onSkip = useCallback(() => {
    handleSkip();
  }, [handleSkip]);

  const handleEndTraining = useCallback(() => {
    showToast(tp('trainingEnded'), 'info');
    router.push(`/${locale}/practice/diagonal-quiz`);
  }, [showToast, tp, router, locale]);

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
    <div id="diagonal-quiz-training-session" className="min-h-screen">
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
