'use client';

import { useCallback } from 'react';

import { generateSquareSequence } from '@blindfold-chess/features/common';
import { useBatchTrainingSession } from '@blindfold-chess/features/practice-session';
import { getSquareColor } from '@blindfold-chess/features/square-colors';

import { useTrainingSessionShell } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-training-session-shell';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SquareColorsPlaySkeleton } from '../../_components/SquareColorsPlaySkeleton';
import { SquareColorsTrainingPlaying } from './SquareColorsTrainingPlaying';

type Props = {
  locale: Locale;
};

const BATCH_SIZE = 100;

export default function SquareColorsTrainingSession({ locale }: Props) {
  const { preferences, isLoaded } = useGamePreferences();

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

  const { sessionElementId, handleEndTraining } = useTrainingSessionShell({
    locale,
    slug: 'square-colors',
    scrollEnabled: hasQuestions,
  });

  const onAnswer = useCallback(
    (selectedColor: 'light' | 'dark') => {
      handleAnswer(selectedColor);
    },
    [handleAnswer]
  );

  // Show loading state while squares are being generated
  if (!hasQuestions || !currentSquare || !isLoaded) {
    return <SquareColorsPlaySkeleton />;
  }

  return (
    <div id={sessionElementId} className="min-h-screen">
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
