'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  generateSquareSequence,
  getDiagonals,
  isValidDiagonalAnswer,
  normalizeDiagonal,
} from '@blindfold-chess/features';

import type { Locale } from '@/app/[locale]/_lib/types';

import { PracticeResultSkeleton } from '../../_components/PracticeResultSkeleton';
import { useGameTimer } from '../../_hooks/useGameTimer';
import { DiagonalQuizPlaying } from './DiagonalQuizPlaying';
import type { QuestionResult } from './DiagonalQuizProblemList';

type Props = {
  locale: Locale;
  initialTimeLimit: number;
};

export default function DiagonalQuizSession({ locale, initialTimeLimit }: Props) {
  const router = useRouter();
  const timeLimit = initialTimeLimit;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [squares, setSquares] = useState<string[]>([]);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<{
    correct: boolean;
    correctDiagonal: string;
    correctAntiDiagonal: string;
  } | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const hasStarted = useRef(false);

  // Countdown state
  const [countdown, setCountdown] = useState<number | null>(3);
  const [hasMounted, setHasMounted] = useState(false);

  // Timer hook
  const isPlaying =
    squares.length > 0 && !isFinished && countdown === null && !showResult && !isPaused;

  const { timeElapsed, totalTime } = useGameTimer({
    timeLimit,
    isActive: isPlaying,
    onTimeLimitReached: useCallback(() => setIsFinished(true), []),
  });

  // Handle pause toggle
  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  // Auto-start the game on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setHasMounted(true);

    const newSquares = generateSquareSequence(100);
    setSquares(newSquares);
  }, []);

  // Scroll to session element after mount
  useEffect(() => {
    if (!hasMounted) return;

    setTimeout(() => {
      const element = document.getElementById('diagonal-quiz-session');
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 100);
  }, [hasMounted]);

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      const timer = setTimeout(() => {
        setCountdown(null);
      }, 500);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const handleAnswer = useCallback(
    (diagonalAnswer: string, antiDiagonalAnswer: string) => {
      if (isFinished || countdown !== null || showResult || isPaused) return;

      const currentSquare = squares[currentIndex];
      const { diagonal, antiDiagonal } = getDiagonals(currentSquare);

      const diagonalValid = isValidDiagonalAnswer(diagonalAnswer);
      const antiDiagonalValid = isValidDiagonalAnswer(antiDiagonalAnswer);

      const diagonalCorrect =
        diagonalValid && normalizeDiagonal(diagonalAnswer) === normalizeDiagonal(diagonal);
      const antiDiagonalCorrect =
        antiDiagonalValid &&
        normalizeDiagonal(antiDiagonalAnswer) === normalizeDiagonal(antiDiagonal);

      const isCorrect = diagonalCorrect && antiDiagonalCorrect;

      setAnswers((prev) => [...prev, isCorrect]);
      setQuestionResults((prev) => [
        ...prev,
        {
          square: currentSquare,
          isCorrect,
          isDiagonalCorrect: diagonalCorrect,
          isAntiDiagonalCorrect: antiDiagonalCorrect,
          correctDiagonal: diagonal,
          correctAntiDiagonal: antiDiagonal,
          userDiagonal: diagonalAnswer,
          userAntiDiagonal: antiDiagonalAnswer,
        },
      ]);
      setLastAnswer({
        correct: isCorrect,
        correctDiagonal: diagonal,
        correctAntiDiagonal: antiDiagonal,
      });
      setShowResult(true);

      setTimeout(
        () => {
          setShowResult(false);
          setCurrentIndex((prev) => prev + 1);
        },
        isCorrect ? 1000 : 2000
      );
    },
    [currentIndex, squares, isFinished, countdown, showResult, isPaused]
  );

  // Redirect on finish
  useEffect(() => {
    if (isFinished) {
      const correct = answers.filter((a) => a).length;
      const total = answers.length;

      // Serialize results
      const serializedData = JSON.stringify(
        questionResults.map((r) => ({
          s: r.square,
          c: r.isCorrect ? 1 : 0,
          dc: r.isDiagonalCorrect ? 1 : 0,
          ac: r.isAntiDiagonalCorrect ? 1 : 0,
          cd: r.correctDiagonal,
          ca: r.correctAntiDiagonal,
          ud: r.userDiagonal,
          ua: r.userAntiDiagonal,
        }))
      );

      const params = new URLSearchParams();
      params.set('score', correct.toString());
      params.set('total', total.toString());
      params.set('time', totalTime.toString());
      params.set('timeLimit', timeLimit.toString());
      params.set('data', encodeURIComponent(serializedData));

      router.push(`/${locale}/practice/diagonal-quiz/result?${params.toString()}`);
    }
  }, [isFinished, answers, questionResults, locale, router, timeLimit, totalTime]);

  if (squares.length === 0 || isFinished) {
    return <PracticeResultSkeleton />;
  }

  return (
    <div id="diagonal-quiz-session">
      <DiagonalQuizPlaying
        currentSquare={squares[currentIndex]}
        timeRemaining={Math.max(0, timeLimit - timeElapsed)}
        timeLimit={timeLimit}
        showResult={showResult}
        lastAnswer={lastAnswer}
        onAnswer={handleAnswer}
        countdown={countdown}
        correctCount={answers.filter((a) => a).length}
        incorrectCount={answers.filter((a) => !a).length}
        isPaused={isPaused}
        onTogglePause={togglePause}
      />
    </div>
  );
}
