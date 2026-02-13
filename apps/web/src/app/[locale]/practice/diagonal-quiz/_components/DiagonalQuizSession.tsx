'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Locale } from '@/app/[locale]/_lib/types';

import {
  generateSquareSequence,
  getDiagonals,
  isValidDiagonalAnswer,
  normalizeDiagonal,
} from '../_lib/utils';
import { DiagonalQuizPlaying } from './DiagonalQuizPlaying';
import { DiagonalQuizResult } from './DiagonalQuizResult';
import type { QuestionResult } from './DiagonalQuizResult';

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

export default function DiagonalQuizSession({ locale, initialTimeLimit }: Props) {
  const timeLimit = initialTimeLimit;
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [squares, setSquares] = useState<string[]>([]);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [questionTimes, setQuestionTimes] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<{
    correct: boolean;
    correctDiagonal: string;
    correctAntiDiagonal: string;
  } | null>(null);
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
    (diagonalAnswer: string, antiDiagonalAnswer: string) => {
      if (isFinished || countdown !== null || showResult) return;

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

      // Update timing
      const now = Date.now();
      const questionTime = now - questionStartTime;
      setQuestionTimes((prev) => [...prev, questionTime / 1000]);

      setAnswers((prev) => [...prev, isCorrect]);
      setQuestionResults((prev) => [
        ...prev,
        {
          square: currentSquare,
          isCorrect,
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
          setQuestionStartTime(Date.now());
        },
        isCorrect ? 1000 : 2000
      );
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
    const newSquares = generateSquareSequence(100);
    setSquares(newSquares);
    setCurrentIndex(0);
    setAnswers([]);
    setQuestionResults([]);
    setQuestionTimes([]);
    setTimeElapsed(0);
    setShowResult(false);
    setLastAnswer(null);
    setIsFinished(false);
    setCountdown(3);
    setQuestionStartTime(Date.now());

    setTimeout(() => {
      const element = document.getElementById('diagonal-quiz-session');
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 100);
  };

  if (isFinished) {
    const stats = getStats();
    const total = answers.length;
    const accuracy = total > 0 ? (stats.correct / total) * 100 : 0;

    return (
      <DiagonalQuizResult
        questionResults={questionResults}
        score={{
          correct: stats.correct,
          total,
          accuracy,
          timeElapsed: timeLimit,
          averageTime: stats.averageTime,
        }}
        onTryAgain={handlePlayAgain}
        locale={locale}
      />
    );
  }

  if (squares.length === 0) {
    return null;
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
      />
    </div>
  );
}
