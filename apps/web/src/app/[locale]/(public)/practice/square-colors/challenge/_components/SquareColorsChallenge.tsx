'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useRouter } from 'next/navigation';

import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useTimedSession } from '@/app/[locale]/(public)/practice/_hooks/use-timed-session';
import { saveSquareColorsResult } from '@/app/[locale]/(public)/practice/square-colors/_actions/save-result';
import {
  generateSquareSequence,
  getSquareColor,
} from '@/app/[locale]/(public)/practice/square-colors/_lib/utils';
import { useAuth } from '@/app/[locale]/_contexts/AuthContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SquareColorsPlaying } from './SquareColorsPlaying';

type Props = {
  locale: Locale;
};

const BATCH_SIZE = 100;
const MAX_MISTAKES = 3;
const TIME_LIMIT = 60;

export default function SquareColorsChallenge({ locale }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { preferences } = useGamePreferences();

  // Batch-based question generation via ref
  const squaresRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const hasMounted = useRef(false);

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
    timeLimit: TIME_LIMIT,
    generateQuestion,
    mistakeAllowance: MAX_MISTAKES,
  });

  // Scroll to challenge element after mount
  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;

    setTimeout(() => {
      const element = document.getElementById('square-colors-challenge');
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 100);
  }, []);

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
  const savedRef = useRef(false);
  useEffect(() => {
    if (!isFinished || savedRef.current) return;
    savedRef.current = true;

    const total = correctCount + incorrectCount;
    const params = new URLSearchParams({
      score: correctCount.toString(),
      total: total.toString(),
      time: totalTime.toString(),
    });
    const resultUrl = `/${locale}/practice/square-colors/result?${params.toString()}`;

    if (user && total > 0) {
      saveSquareColorsResult({
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        timeTaken: totalTime,
        mistakeAllowance: MAX_MISTAKES,
      })
        .catch(() => {
          // Silently ignore save failures - result display is unaffected
        })
        .finally(() => {
          router.push(resultUrl);
        });
    } else {
      router.push(resultUrl);
    }
  }, [isFinished, correctCount, incorrectCount, locale, router, totalTime, user]);

  if (isFinished) {
    return <PracticeResultSkeleton />;
  }

  if (!currentSquare) {
    return <PracticeResultSkeleton />;
  }

  return (
    <div id="square-colors-challenge" className="min-h-screen">
      <SquareColorsPlaying
        currentSquare={currentSquare}
        timeRemaining={timeRemaining}
        timeLimit={TIME_LIMIT}
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
        remainingLives={MAX_MISTAKES - incorrectCount}
        maxLives={MAX_MISTAKES}
      />
    </div>
  );
}
