'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeResult } from '@/app/[locale]/practice/_components/PracticeResult';

import { generateSquareSequence, getSquareColor } from '../_lib/utils';
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

export default function SquareColorsSession({ locale, initialTimeLimit }: Props) {
  const t = useTranslations('practice.squareColors');
  const tPractice = useTranslations('practice');
  const { preferences } = useGamePreferences();

  const timeLimit = initialTimeLimit;
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [squares, setSquares] = useState<string[]>([]);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [questionTimes, setQuestionTimes] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [lastAnswer, setLastAnswer] = useState<{ correct: boolean; square: string } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const hasStarted = useRef(false);

  // Countdown state
  const [countdown, setCountdown] = useState<number | null>(3);
  const [hasMounted, setHasMounted] = useState(false);

  // Auto-start the game on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setHasMounted(true);

    const newSquares = generateSquareSequence(100);
    setSquares(newSquares);
    setQuestionStartTime(Date.now());
  }, []);

  // Scroll to session element after mount
  useEffect(() => {
    if (!hasMounted) return;

    // Tiny delay to ensure DOM is ready
    setTimeout(() => {
      const element = document.getElementById('square-colors-session');
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
      }, 500); // Show "START!" for 0.5s
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // Timer effect
  useEffect(() => {
    if (squares.length === 0 || isFinished || countdown !== null || showResult) return;

    timerRef.current = setInterval(() => {
      setTimeElapsed((prev) => {
        const newTime = prev + 1;
        if (newTime >= timeLimit) {
          setIsFinished(true);
        }
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [squares.length, isFinished, countdown, timeLimit, showResult]);

  const handleAnswer = useCallback(
    (selectedColor: 'light' | 'dark') => {
      if (isFinished || countdown !== null || showResult) return;

      const currentSquare = squares[currentIndex];
      const correctColor = getSquareColor(currentSquare);
      const isCorrect = selectedColor === correctColor;

      // Update timing
      const now = Date.now();
      const questionTime = now - questionStartTime;
      setQuestionTimes((prev) => [...prev, questionTime / 1000]);

      // Record answer
      setAnswers((prev) => [...prev, isCorrect]);
      setLastAnswer({ correct: isCorrect, square: currentSquare });
      setShowResult(true);

      // Move to next question
      setTimeout(() => {
        // Keep moving index forward, but verify if we need to check finished state here?
        // Actually timer might finish game.
        // We just move to next question.
        setShowResult(false);
        setCurrentIndex((prev) => prev + 1);
        setQuestionStartTime(Date.now());
      }, 500);
    },
    [currentIndex, squares, isFinished, questionStartTime, countdown, showResult]
  );

  const getStats = (): GameStats => {
    const correct = answers.filter((a) => a).length;
    const incorrect = answers.filter((a) => !a).length;
    const averageTime =
      questionTimes.length > 0
        ? questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length
        : 0;

    return { correct, incorrect, totalTime: 0, averageTime };
  };

  const handlePlayAgain = () => {
    // Reset and restart
    const newSquares = generateSquareSequence(100);
    setSquares(newSquares);
    setCurrentIndex(0);
    setAnswers([]);
    setQuestionTimes([]);
    setTimeElapsed(0);
    setShowResult(false);
    setLastAnswer(null);
    setIsFinished(false);
    setQuestionStartTime(Date.now());
  };

  if (isFinished) {
    const stats = getStats();
    const total = answers.length;
    const accuracy = total > 0 ? (stats.correct / total) * 100 : 0;

    return (
      <PracticeResult
        score={{
          correct: stats.correct,
          total,
          accuracy,
          timeElapsed: timeLimit,
          averageTime: stats.averageTime,
        }}
        onTryAgain={handlePlayAgain}
        locale={locale}
        labels={{
          correctAnswers: t('correctAnswers'),
          accuracy: t('accuracy'),
          timeTaken: t('timeTaken'),
          averageTime: t('averageTime'),
          tryAgain: tPractice('tryAgain'),
          morePractice: tPractice('morePractice'),
        }}
      />
    );
  }

  // Show loading state while squares are being generated
  if (squares.length === 0) {
    return null;
  }

  return (
    <div id="square-colors-session" className="min-h-screen">
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
      />
    </div>
  );
}
