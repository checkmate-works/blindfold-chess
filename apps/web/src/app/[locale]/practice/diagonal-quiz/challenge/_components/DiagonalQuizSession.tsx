'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { generateSquareSequence } from '@blindfold-chess/features/common';
import {
  getDiagonals,
  isValidDiagonalAnswer,
  normalizeDiagonal,
} from '@blindfold-chess/features/diagonal-quiz';

import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeResultSkeleton } from '@/app/[locale]/practice/_components/PracticeResultSkeleton';
import { useTimedSession } from '@/app/[locale]/practice/_hooks/useTimedSession';

import type { QuestionResult } from '../../_components/DiagonalQuizProblemList';
import { DiagonalQuizPlaying } from './DiagonalQuizPlaying';

type Props = {
  locale: Locale;
  initialTimeLimit: number;
};

const BATCH_SIZE = 100;

export default function DiagonalQuizSession({ locale, initialTimeLimit }: Props) {
  const router = useRouter();

  // Batch-based question generation
  const squaresRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const hasMounted = useRef(false);

  // Module-specific state
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [lastAnswer, setLastAnswer] = useState<{
    correct: boolean;
    correctDiagonal: string;
    correctAntiDiagonal: string;
  } | null>(null);

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
    isFinished,
    countdown,
    isPaused,
    handleAnswer: hookHandleAnswer,
    togglePause,
  } = useTimedSession<string>({
    timeLimit: initialTimeLimit,
    generateQuestion,
    feedbackDuration: (correct: boolean) => (correct ? 1000 : 2000),
  });

  // Scroll to session element after mount
  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;

    setTimeout(() => {
      const element = document.getElementById('diagonal-quiz-session');
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 100);
  }, []);

  // Clear module-specific feedback state when hook feedback ends
  useEffect(() => {
    if (!showFeedback) {
      setLastAnswer(null);
    }
  }, [showFeedback]);

  const handleAnswer = useCallback(
    (diagonalAnswer: string, antiDiagonalAnswer: string) => {
      if (!currentSquare) return;

      const { diagonal, antiDiagonal } = getDiagonals(currentSquare);

      const diagonalValid = isValidDiagonalAnswer(diagonalAnswer);
      const antiDiagonalValid = isValidDiagonalAnswer(antiDiagonalAnswer);

      const diagonalCorrect =
        diagonalValid && normalizeDiagonal(diagonalAnswer) === normalizeDiagonal(diagonal);
      const antiDiagonalCorrect =
        antiDiagonalValid &&
        normalizeDiagonal(antiDiagonalAnswer) === normalizeDiagonal(antiDiagonal);

      const isCorrect = diagonalCorrect && antiDiagonalCorrect;

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

      hookHandleAnswer(isCorrect);
    },
    [currentSquare, hookHandleAnswer]
  );

  // Redirect on finish
  useEffect(() => {
    if (isFinished) {
      const total = correctCount + incorrectCount;

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
      params.set('score', correctCount.toString());
      params.set('total', total.toString());
      params.set('time', totalTime.toString());
      params.set('timeLimit', initialTimeLimit.toString());
      params.set('data', encodeURIComponent(serializedData));

      router.push(`/${locale}/practice/diagonal-quiz/result?${params.toString()}`);
    }
  }, [
    isFinished,
    correctCount,
    incorrectCount,
    questionResults,
    locale,
    router,
    initialTimeLimit,
    totalTime,
  ]);

  if (!currentSquare || isFinished) {
    return <PracticeResultSkeleton />;
  }

  return (
    <div id="diagonal-quiz-session">
      <DiagonalQuizPlaying
        currentSquare={currentSquare}
        timeRemaining={timeRemaining}
        timeLimit={initialTimeLimit}
        showResult={showFeedback}
        lastAnswer={lastAnswer}
        onAnswer={handleAnswer}
        countdown={countdown}
        correctCount={correctCount}
        incorrectCount={incorrectCount}
        isPaused={isPaused}
        onTogglePause={togglePause}
      />
    </div>
  );
}
