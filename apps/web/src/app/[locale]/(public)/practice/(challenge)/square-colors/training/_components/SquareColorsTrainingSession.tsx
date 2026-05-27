'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { BoardSkeleton } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { generateSquareSequence } from '@blindfold-chess/features/common';
import { useBatchTrainingSession } from '@blindfold-chess/features/practice-session';
import { getSquareColor } from '@blindfold-chess/features/square-colors';

import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SquareColorsTrainingPlaying } from './SquareColorsTrainingPlaying';

type Props = {
  locale: Locale;
};

const BATCH_SIZE = 100;

export default function SquareColorsTrainingSession({ locale }: Props) {
  const router = useRouter();
  const { preferences, isLoaded } = useGamePreferences();
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
  } = useBatchTrainingSession<string, 'light' | 'dark'>({
    batchSize: BATCH_SIZE,
    generateBatch: () => generateSquareSequence(BATCH_SIZE),
    checkAnswer: (square, selectedColor) => selectedColor === getSquareColor(square),
    feedbackDelayMs: 500,
  });

  useScrollToElement('square-colors-training-session', hasQuestions);

  const onAnswer = useCallback(
    (selectedColor: 'light' | 'dark') => {
      handleAnswer(selectedColor);
    },
    [handleAnswer]
  );

  const handleEndTraining = useCallback(() => {
    showToast(tp('trainingEnded'), 'info');
    router.push(`/${locale}/practice/square-colors`);
  }, [showToast, tp, router, locale]);

  // Show loading state while squares are being generated
  if (!hasQuestions || !currentSquare) {
    return <PracticeResultSkeleton />;
  }

  if (!isLoaded) {
    return (
      <div className="flex justify-center">
        <div className="w-full max-w-md">
          <BoardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div id="square-colors-training-session" className="min-h-screen">
      <SquareColorsTrainingPlaying
        currentSquare={currentSquare}
        showResult={showResult}
        lastAnswer={
          lastAnswer ? { correct: lastAnswer.correct, square: lastAnswer.question } : null
        }
        onAnswer={onAnswer}
        boardTheme={preferences.boardTheme}
        correctCount={correctCount}
        incorrectCount={incorrectCount}
        onEndTraining={handleEndTraining}
        locale={locale}
      />
    </div>
  );
}
