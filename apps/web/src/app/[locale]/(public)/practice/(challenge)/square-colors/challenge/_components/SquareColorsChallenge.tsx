'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { BoardSkeleton } from '@/app/_components';
import { useTimedSession } from '@blindfold-chess/features/practice-session';

import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { useChallengeResultSave } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-challenge-result-save';
import { saveSquareColorsResult } from '@/app/[locale]/(public)/practice/(challenge)/square-colors/_actions/save-result';
import {
  generateSquareSequence,
  getSquareColor,
} from '@/app/[locale]/(public)/practice/(challenge)/square-colors/_lib/utils';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SquareColorsPlaying } from './SquareColorsPlaying';

type Props = {
  locale: Locale;
};

const BATCH_SIZE = 100;

export default function SquareColorsChallenge({ locale }: Props) {
  const router = useRouter();
  const { preferences, isLoaded } = useGamePreferences();

  // Batch-based question generation via ref
  const squaresRef = useRef<string[]>([]);
  const indexRef = useRef(0);

  const generateQuestion = useCallback((): string => {
    if (squaresRef.current.length === 0) {
      squaresRef.current = generateSquareSequence(BATCH_SIZE);
    }
    if (indexRef.current >= squaresRef.current.length) {
      squaresRef.current = [...squaresRef.current, ...generateSquareSequence(BATCH_SIZE)];
    }
    const square = squaresRef.current[indexRef.current];
    indexRef.current += 1;
    return square;
  }, []);

  const {
    currentQuestion: currentSquare,
    timeRemaining,
    totalTime,
    correctCount,
    incorrectCount,
    showFeedback,
    lastAnswerCorrect,
    isFinished,
    countdown,
    isPaused,
    handleAnswer,
    togglePause,
  } = useTimedSession<string>({
    timeLimit: CHALLENGE_TIME_LIMIT,
    generateQuestion,
    mistakeAllowance: MISTAKE_LIMIT,
  });

  useScrollToElement('square-colors-challenge');

  const [showQuitModal, setShowQuitModal] = useState(false);

  const handleQuitRequest = useCallback(() => {
    if (!isPaused) togglePause();
    setShowQuitModal(true);
  }, [isPaused, togglePause]);

  const handleQuitConfirm = useCallback(() => {
    router.push(`/${locale}/practice/square-colors/challenge`);
  }, [router, locale]);

  const handleQuitCancel = useCallback(() => {
    setShowQuitModal(false);
    if (isPaused) togglePause();
  }, [isPaused, togglePause]);

  const handleColorAnswer = useCallback(
    (selectedColor: 'light' | 'dark') => {
      if (!currentSquare) return;
      const correctColor = getSquareColor(currentSquare);
      const isCorrect = selectedColor === correctColor;
      handleAnswer(isCorrect);
    },
    [currentSquare, handleAnswer]
  );

  // Save result and redirect on finish
  const total = correctCount + incorrectCount;
  const resultUrl = useMemo(() => {
    const params = new URLSearchParams({
      score: correctCount.toString(),
      total: total.toString(),
      time: totalTime.toString(),
    });
    return `/${locale}/practice/square-colors/result?${params.toString()}`;
  }, [correctCount, total, totalTime, locale]);

  const saveResult = useCallback(
    () =>
      saveSquareColorsResult({
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        timeTaken: totalTime,
      }),
    [correctCount, incorrectCount, totalTime]
  );

  useChallengeResultSave({
    isFinished,
    totalAnswers: total,
    resultUrl,
    saveResult,
    moduleName: 'square_colors',
  });

  if (isFinished) {
    return <PracticeResultSkeleton />;
  }

  if (!currentSquare) {
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
    <div id="square-colors-challenge" className="min-h-screen">
      <SquareColorsPlaying
        currentSquare={currentSquare}
        timeRemaining={timeRemaining}
        timeLimit={CHALLENGE_TIME_LIMIT}
        showResult={showFeedback}
        lastAnswer={
          lastAnswerCorrect !== null ? { correct: lastAnswerCorrect, square: currentSquare } : null
        }
        onAnswer={handleColorAnswer}
        boardTheme={preferences.boardTheme}
        countdown={countdown}
        correctCount={correctCount}
        incorrectCount={incorrectCount}
        isPaused={isPaused}
        onTogglePause={togglePause}
        remainingLives={MISTAKE_LIMIT - incorrectCount}
        maxLives={MISTAKE_LIMIT}
        onQuitRequest={handleQuitRequest}
        showQuitModal={showQuitModal}
        onQuitConfirm={handleQuitConfirm}
        onQuitCancel={handleQuitCancel}
      />
    </div>
  );
}
