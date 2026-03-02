'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { generateSquareSequence } from '@blindfold-chess/features/common';
import {
  getDiagonals,
  isValidDiagonalAnswer,
  normalizeDiagonal,
} from '@blindfold-chess/features/diagonal-quiz';

import { useToast } from '@/app/[locale]/_contexts/ToastContext';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeResultSkeleton } from '@/app/[locale]/practice/_components/PracticeResultSkeleton';
import { useCountdown } from '@/app/[locale]/practice/_hooks/use-countdown';

import { DiagonalQuizTrainingPlaying } from './DiagonalQuizTrainingPlaying';

type Props = {
  locale: Locale;
};

const BATCH_SIZE = 100;

export default function DiagonalQuizTrainingSession({ locale }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const tp = useTranslations('practice');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [squares, setSquares] = useState<string[]>([]);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<{
    correct: boolean;
    correctDiagonal: string;
    correctAntiDiagonal: string;
  } | null>(null);
  const hasStarted = useRef(false);

  const { countdown } = useCountdown();
  const [hasMounted, setHasMounted] = useState(false);

  // Auto-start the game on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setHasMounted(true);

    const newSquares = generateSquareSequence(BATCH_SIZE);
    setSquares(newSquares);
  }, []);

  // Scroll to session element after mount
  useEffect(() => {
    if (!hasMounted) return;

    setTimeout(() => {
      const element = document.getElementById('diagonal-quiz-training-session');
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 100);
  }, [hasMounted]);

  // Regenerate squares when running low
  useEffect(() => {
    if (squares.length > 0 && currentIndex >= squares.length - 10) {
      const newBatch = generateSquareSequence(BATCH_SIZE);
      setSquares((prev) => [...prev, ...newBatch]);
    }
  }, [currentIndex, squares.length]);

  const handleAnswer = useCallback(
    (diagonalAnswer: string, antiDiagonalAnswer: string) => {
      if (countdown !== null || showResult) return;

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
      setLastAnswer({
        correct: isCorrect,
        correctDiagonal: diagonal,
        correctAntiDiagonal: antiDiagonal,
      });
      setShowResult(true);

      setTimeout(
        () => {
          setShowResult(false);
          setLastAnswer(null);
          setCurrentIndex((prev) => prev + 1);
        },
        isCorrect ? 1000 : 2000
      );
    },
    [currentIndex, squares, countdown, showResult]
  );

  const handleEndTraining = useCallback(() => {
    showToast(tp('trainingEnded'), 'info');
    router.push(`/${locale}/practice/diagonal-quiz`);
  }, [showToast, tp, router, locale]);

  // Show loading state while squares are being generated
  if (squares.length === 0) {
    return <PracticeResultSkeleton />;
  }

  return (
    <div id="diagonal-quiz-training-session" className="min-h-screen">
      <DiagonalQuizTrainingPlaying
        currentSquare={squares[currentIndex]}
        showResult={showResult}
        lastAnswer={lastAnswer}
        onAnswer={handleAnswer}
        countdown={countdown}
        correctCount={answers.filter((a) => a).length}
        incorrectCount={answers.filter((a) => !a).length}
        onEndTraining={handleEndTraining}
      />
    </div>
  );
}
