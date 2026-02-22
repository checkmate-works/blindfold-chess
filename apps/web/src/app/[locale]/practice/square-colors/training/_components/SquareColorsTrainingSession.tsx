'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';
import type { Locale } from '@/app/[locale]/_lib/types';
import { useCountdown } from '@/app/[locale]/practice/_hooks/use-countdown';

import { PracticeResultSkeleton } from '../../../_components/PracticeResultSkeleton';
import { generateSquareSequence, getSquareColor } from '../../_lib/utils';
import { SquareColorsTrainingPlaying } from './SquareColorsTrainingPlaying';

type Props = {
  locale: Locale;
};

const BATCH_SIZE = 100;

export default function SquareColorsTrainingSession({ locale }: Props) {
  const router = useRouter();
  const { preferences } = useGamePreferences();
  const { showToast } = useToast();
  const tp = useTranslations('practice');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [squares, setSquares] = useState<string[]>([]);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [lastAnswer, setLastAnswer] = useState<{ correct: boolean; square: string } | null>(null);
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
    if (hasMounted) return;

    // Tiny delay to ensure DOM is ready
    setTimeout(() => {
      const element = document.getElementById('square-colors-training-session');
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
    (selectedColor: 'light' | 'dark') => {
      if (countdown !== null || showResult) return;

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
    [currentIndex, squares, countdown, showResult]
  );

  const handleEndTraining = useCallback(() => {
    showToast(tp('trainingEnded'), 'info');
    router.push(`/${locale}/practice/square-colors`);
  }, [showToast, tp, router, locale]);

  // Show loading state while squares are being generated
  if (squares.length === 0) {
    return <PracticeResultSkeleton />;
  }

  return (
    <div id="square-colors-training-session" className="min-h-screen">
      <SquareColorsTrainingPlaying
        currentSquare={squares[currentIndex]}
        showResult={showResult}
        lastAnswer={lastAnswer}
        onAnswer={handleAnswer}
        boardTheme={preferences.boardTheme}
        countdown={countdown}
        correctCount={answers.filter((a) => a).length}
        incorrectCount={answers.filter((a) => !a).length}
        onEndTraining={handleEndTraining}
      />
    </div>
  );
}
