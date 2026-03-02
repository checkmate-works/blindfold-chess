'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useCountdown } from '@/app/[locale]/(public)/practice/_hooks/use-countdown';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { MoveQuestion, PieceType } from '../../_lib/types';
import { generateBalancedMoveQuestions, isLegalMove } from '../../_lib/utils';
import { LegalMovesTrainingPlaying } from './LegalMovesTrainingPlaying';

type Props = {
  locale: Locale;
  selectedPieces: PieceType[];
};

const BATCH_SIZE = 100;

export default function LegalMovesTrainingSession({ locale, selectedPieces }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const t = useTranslations('practice.legalMoves');
  const tp = useTranslations('practice');

  const getQuestion = (from: string, to: string) => t('questionFormat', { from, to });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState<MoveQuestion[]>([]);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [lastAnswer, setLastAnswer] = useState<{
    correct: boolean;
    userAnswer: boolean;
    isLegal: boolean;
  } | null>(null);
  const hasStarted = useRef(false);

  const { countdown } = useCountdown();
  const [hasMounted, setHasMounted] = useState(false);

  // Auto-start the game on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setHasMounted(true);

    const newQuestions = generateBalancedMoveQuestions(BATCH_SIZE, selectedPieces);
    setQuestions(newQuestions);
  }, [selectedPieces]);

  // Scroll to session element after mount
  useEffect(() => {
    if (!hasMounted) return;

    // Tiny delay to ensure DOM is ready
    setTimeout(() => {
      const element = document.getElementById('legal-moves-training-session');
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 100);
  }, [hasMounted]);

  // Regenerate questions when running low
  useEffect(() => {
    if (questions.length > 0 && currentIndex >= questions.length - 10) {
      const newBatch = generateBalancedMoveQuestions(BATCH_SIZE, selectedPieces);
      setQuestions((prev) => [...prev, ...newBatch]);
    }
  }, [currentIndex, questions.length, selectedPieces]);

  const handleAnswer = useCallback(
    (userAnswer: boolean) => {
      if (countdown !== null || showResult) return;

      const currentQuestion = questions[currentIndex];
      const isLegal = isLegalMove(currentQuestion.from, currentQuestion.to, currentQuestion.piece);
      const isCorrect = userAnswer === isLegal;

      // Record answer
      setAnswers((prev) => [...prev, isCorrect]);
      setLastAnswer({ correct: isCorrect, userAnswer, isLegal });
      setShowResult(true);

      // Move to next question
      setTimeout(() => {
        setShowResult(false);
        setLastAnswer(null);
        setCurrentIndex((prev) => prev + 1);
      }, 500);
    },
    [currentIndex, questions, countdown, showResult]
  );

  const handleEndTraining = useCallback(() => {
    showToast(tp('trainingEnded'), 'info');
    router.push(`/${locale}/practice/legal-moves`);
  }, [showToast, tp, router, locale]);

  // Show loading state while questions are being generated
  if (questions.length === 0) {
    return <PracticeResultSkeleton />;
  }

  return (
    <div id="legal-moves-training-session" className="min-h-screen">
      <LegalMovesTrainingPlaying
        currentQuestion={questions[currentIndex]}
        showResult={showResult}
        lastAnswer={lastAnswer}
        onAnswer={handleAnswer}
        getQuestion={getQuestion}
        countdown={countdown}
        correctCount={answers.filter((a) => a).length}
        incorrectCount={answers.filter((a) => !a).length}
        onEndTraining={handleEndTraining}
      />
    </div>
  );
}
