'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeResultSkeleton } from '@/app/[locale]/practice/_components/PracticeResultSkeleton';
import { useCountdown } from '@/app/[locale]/practice/_hooks/useCountdown';
import { useGameTimer } from '@/app/[locale]/practice/_hooks/useGameTimer';
import {
  generateSquareSequence,
  getSquareColor,
} from '@/app/[locale]/practice/square-colors/_lib/utils';

import { SquareColorsPlaying } from './SquareColorsPlaying';

type Props = {
  locale: Locale;
  initialTimeLimit: number;
};

type GameStats = {
  correct: number;
  incorrect: number;
  totalTime: number;
  averageTime: number;
};

const BATCH_SIZE = 100;

export default function SquareColorsChallenge({ locale, initialTimeLimit }: Props) {
  const router = useRouter();
  const { preferences } = useGamePreferences();

  const timeLimit = initialTimeLimit;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [squares, setSquares] = useState<string[]>([]);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [lastAnswer, setLastAnswer] = useState<{ correct: boolean; square: string } | null>(null);
  const hasStarted = useRef(false);

  const { countdown } = useCountdown();
  const [hasMounted, setHasMounted] = useState(false);

  // Pause state
  const [isPaused, setIsPaused] = useState(false);

  const isPlaying =
    squares.length > 0 && !isFinished && countdown === null && !showResult && !isPaused;

  const { timeElapsed, totalTime } = useGameTimer({
    timeLimit,
    isActive: isPlaying,
    onTimeLimitReached: useCallback(() => {
      setIsFinished(true);
    }, []),
  });

  // Auto-start the game on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setHasMounted(true);

    const newSquares = generateSquareSequence(BATCH_SIZE);
    setSquares(newSquares);
  }, []);

  // Scroll to challenge element after mount
  useEffect(() => {
    if (hasMounted) return;

    // Tiny delay to ensure DOM is ready
    setTimeout(() => {
      const element = document.getElementById('square-colors-challenge');
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 100);
  }, [hasMounted]);

  const togglePause = useCallback(() => {
    if (isFinished || countdown !== null) return;
    setIsPaused((prev) => !prev);
  }, [isFinished, countdown]);

  const handleAnswer = useCallback(
    (selectedColor: 'light' | 'dark') => {
      if (isFinished || countdown !== null || showResult || isPaused) return;

      const currentSquare = squares[currentIndex];
      const correctColor = getSquareColor(currentSquare);
      const isCorrect = selectedColor === correctColor;

      // Record answer
      setAnswers((prev) => [...prev, isCorrect]);
      setLastAnswer({ correct: isCorrect, square: currentSquare });
      setShowResult(true);

      // Move to next question
      setTimeout(() => {
        setShowResult(false);
        setLastAnswer(null);
        setCurrentIndex((prev) => prev + 1);
      }, 500);
    },
    [currentIndex, squares, isFinished, countdown, showResult, isPaused]
  );

  const getStats = useCallback((): GameStats => {
    const correct = answers.filter((a) => a).length;
    const incorrect = answers.filter((a) => !a).length;
    // Use the accumulated precise time (in seconds) from hook
    const averageTime = answers.length > 0 ? totalTime / answers.length : 0;

    return { correct, incorrect, totalTime, averageTime };
  }, [answers, totalTime]);

  useEffect(() => {
    if (isFinished) {
      const stats = getStats();
      const total = answers.length;

      // Redirect to result page
      const params = new URLSearchParams({
        score: stats.correct.toString(),
        total: total.toString(),
        time: stats.totalTime.toString(),
        timeLimit: timeLimit.toString(),
      });
      router.push(`/${locale}/practice/square-colors/result?${params.toString()}`);
    }
  }, [isFinished, answers, locale, router, getStats, timeLimit]);

  if (isFinished) {
    return <PracticeResultSkeleton />;
  }

  // Show loading state while squares are being generated
  if (squares.length === 0) {
    return <PracticeResultSkeleton />;
  }

  return (
    <div id="square-colors-challenge" className="min-h-screen">
      <SquareColorsPlaying
        currentSquare={squares[currentIndex]}
        timeRemaining={Math.max(0, timeLimit - timeElapsed)}
        timeLimit={timeLimit}
        showResult={showResult}
        lastAnswer={lastAnswer}
        onAnswer={handleAnswer}
        boardTheme={preferences.boardTheme}
        countdown={countdown}
        correctCount={answers.filter((a) => a).length}
        incorrectCount={answers.filter((a) => !a).length}
        isPaused={isPaused}
        onTogglePause={togglePause}
      />
    </div>
  );
}
