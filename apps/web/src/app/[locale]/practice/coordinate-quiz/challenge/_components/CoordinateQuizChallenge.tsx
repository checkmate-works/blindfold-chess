'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Square } from 'chess.js';

import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeResultSkeleton } from '@/app/[locale]/practice/_components/PracticeResultSkeleton';
import { useTimedSession } from '@/app/[locale]/practice/_hooks/use-timed-session';

import type { BoardOrientation, CoordinateQuestion, FeedbackSpeed } from '../../_lib/types';
import { FEEDBACK_SPEED_MS } from '../../_lib/types';
import { checkAnswer, generateSingleQuestion } from '../../_lib/utils';
import { CoordinateQuizChallengePlaying } from './CoordinateQuizChallengePlaying';

type Props = {
  locale: Locale;
  initialTimeLimit: number;
  initialBoardOrientation: string;
  initialFeedbackSpeed: string;
};

export default function CoordinateQuizChallenge({
  locale,
  initialTimeLimit,
  initialBoardOrientation,
  initialFeedbackSpeed,
}: Props) {
  const router = useRouter();

  const boardOrientation = initialBoardOrientation as BoardOrientation;
  const feedbackSpeed = initialFeedbackSpeed as FeedbackSpeed;
  const feedbackDuration = FEEDBACK_SPEED_MS[feedbackSpeed];

  // Module-specific state
  const [lastClickedSquare, setLastClickedSquare] = useState<Square | null>(null);
  const recentSquaresRef = useRef<Square[]>([]);
  const hasScrolled = useRef(false);

  const generateQuestion = useCallback((): CoordinateQuestion => {
    const question = generateSingleQuestion(boardOrientation, recentSquaresRef.current);
    recentSquaresRef.current = [...recentSquaresRef.current, question.targetSquare].slice(-10);
    return question;
  }, [boardOrientation]);

  const {
    currentQuestion,
    timeRemaining,
    timeElapsed,
    totalTime,
    correctCount,
    incorrectCount,
    totalCount,
    showFeedback,
    lastAnswerCorrect,
    isFinished,
    countdown,
    isPaused,
    handleAnswer,
    togglePause,
  } = useTimedSession<CoordinateQuestion>({
    timeLimit: initialTimeLimit,
    generateQuestion,
    feedbackDuration,
  });

  // Scroll to quiz-session element after first question is rendered
  useEffect(() => {
    if (!currentQuestion || hasScrolled.current) return;
    hasScrolled.current = true;

    const element = document.getElementById('quiz-session');
    if (element) {
      element.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [currentQuestion]);

  // Clear lastClickedSquare when question changes (feedback ended)
  useEffect(() => {
    if (!showFeedback) {
      setLastClickedSquare(null);
    }
  }, [showFeedback]);

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (isFinished || !currentQuestion || showFeedback || countdown !== null || isPaused) return;

      setLastClickedSquare(square);
      const correct = checkAnswer(square, currentQuestion.targetSquare);
      handleAnswer(correct);
    },
    [isFinished, currentQuestion, showFeedback, countdown, isPaused, handleAnswer]
  );

  // Redirect on finish
  useEffect(() => {
    if (isFinished) {
      const params = new URLSearchParams();
      params.set('score', correctCount.toString());
      params.set('total', totalCount.toString());
      params.set('time', totalTime.toString());
      params.set('timeLimit', initialTimeLimit.toString());
      params.set('orientation', boardOrientation);
      params.set('speed', feedbackSpeed);

      router.push(`/${locale}/practice/coordinate-quiz/result?${params.toString()}`);
    }
  }, [
    isFinished,
    correctCount,
    totalCount,
    locale,
    router,
    totalTime,
    initialTimeLimit,
    boardOrientation,
    feedbackSpeed,
  ]);

  if (isFinished) {
    return <PracticeResultSkeleton />;
  }

  if (!currentQuestion) {
    return <PracticeResultSkeleton />;
  }

  return (
    <div id="coordinate-quiz-challenge" className="min-h-screen">
      <CoordinateQuizChallengePlaying
        currentQuestion={currentQuestion}
        timeRemaining={timeRemaining}
        timeLimit={initialTimeLimit}
        timeElapsed={timeElapsed}
        correctAnswers={correctCount}
        wrongAnswers={incorrectCount}
        lastClickedSquare={lastClickedSquare}
        showFeedback={showFeedback}
        isCorrect={lastAnswerCorrect ?? false}
        onSquareClick={handleSquareClick}
        countdown={countdown}
        isPaused={isPaused}
        onTogglePause={togglePause}
      />
    </div>
  );
}
