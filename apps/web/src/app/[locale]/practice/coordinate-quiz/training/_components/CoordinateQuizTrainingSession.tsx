'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Square } from 'chess.js';

import { useToast } from '@/app/[locale]/_contexts/ToastContext';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeResultSkeleton } from '@/app/[locale]/practice/_components/PracticeResultSkeleton';
import { useCountdown } from '@/app/[locale]/practice/_hooks/use-countdown';

import type { BoardOrientation, CoordinateQuestion, FeedbackSpeed } from '../../_lib/types';
import { FEEDBACK_SPEED_MS } from '../../_lib/types';
import { checkAnswer, generateSingleQuestion } from '../../_lib/utils';
import { CoordinateQuizTrainingPlaying } from './CoordinateQuizTrainingPlaying';

type Props = {
  locale: Locale;
  boardOrientation: string;
  feedbackSpeed: string;
};

export default function CoordinateQuizTrainingSession({
  locale,
  boardOrientation: initialBoardOrientation,
  feedbackSpeed: initialFeedbackSpeed,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const tp = useTranslations('practice');

  const boardOrientation = initialBoardOrientation as BoardOrientation;
  const feedbackSpeed = initialFeedbackSpeed as FeedbackSpeed;
  const feedbackDuration = FEEDBACK_SPEED_MS[feedbackSpeed];

  const [currentQuestion, setCurrentQuestion] = useState<CoordinateQuestion | null>(null);
  const [recentSquares, setRecentSquares] = useState<Square[]>([]);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [lastClickedSquare, setLastClickedSquare] = useState<Square | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const { countdown } = useCountdown();

  const hasStarted = useRef(false);
  const hasScrolled = useRef(false);

  // Auto-start the game on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const firstQuestion = generateSingleQuestion(boardOrientation);
    setCurrentQuestion(firstQuestion);
    setRecentSquares([firstQuestion.targetSquare]);
  }, [boardOrientation]);

  // Scroll to training session element after first question is rendered
  useEffect(() => {
    if (!currentQuestion || hasScrolled.current) return;
    hasScrolled.current = true;

    const element = document.getElementById('coordinate-quiz-training-session');
    if (element) {
      element.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [currentQuestion]);

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (!currentQuestion || showFeedback || countdown !== null) return;

      setLastClickedSquare(square);
      const correct = checkAnswer(square, currentQuestion.targetSquare);
      setIsCorrect(correct);
      setShowFeedback(true);

      if (correct) {
        setCorrectAnswers((prev) => prev + 1);
      } else {
        setWrongAnswers((prev) => prev + 1);
      }

      // Generate next question after feedback delay
      setTimeout(() => {
        const updatedRecentSquares = [...recentSquares, currentQuestion.targetSquare].slice(-10);
        setRecentSquares(updatedRecentSquares);

        const nextQuestion = generateSingleQuestion(boardOrientation, updatedRecentSquares);
        setCurrentQuestion(nextQuestion);
        setShowFeedback(false);
        setLastClickedSquare(null);
      }, feedbackDuration);
    },
    [currentQuestion, showFeedback, boardOrientation, recentSquares, feedbackDuration, countdown]
  );

  const handleEndTraining = useCallback(() => {
    showToast(tp('trainingEnded'), 'info');
    router.push(`/${locale}/practice/coordinate-quiz`);
  }, [showToast, tp, router, locale]);

  // Show loading state while question is being generated
  if (!currentQuestion) {
    return <PracticeResultSkeleton />;
  }

  return (
    <div id="coordinate-quiz-training-session" className="min-h-screen">
      <CoordinateQuizTrainingPlaying
        currentQuestion={currentQuestion}
        correctAnswers={correctAnswers}
        wrongAnswers={wrongAnswers}
        lastClickedSquare={lastClickedSquare}
        showFeedback={showFeedback}
        isCorrect={isCorrect}
        onSquareClick={handleSquareClick}
        countdown={countdown}
        onEndTraining={handleEndTraining}
      />
    </div>
  );
}
