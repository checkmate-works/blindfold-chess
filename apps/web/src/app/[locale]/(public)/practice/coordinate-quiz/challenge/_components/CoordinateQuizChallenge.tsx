'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { Square } from '@blindfold-chess/types';

import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import { useTimedSession } from '@/app/[locale]/(public)/practice/_hooks/use-timed-session';
import { saveCoordinateQuizResult } from '@/app/[locale]/(public)/practice/coordinate-quiz/_actions/save-result';
import { useAuth } from '@/app/[locale]/_contexts/AuthContext';
import type { Locale } from '@/app/[locale]/_lib/types';

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

const MAX_MISTAKES = 3;

export default function CoordinateQuizChallenge({
  locale,
  initialTimeLimit,
  initialBoardOrientation,
  initialFeedbackSpeed,
}: Props) {
  const router = useRouter();
  const { user } = useAuth();

  const boardOrientation = initialBoardOrientation as BoardOrientation;
  const feedbackSpeed = initialFeedbackSpeed as FeedbackSpeed;
  const feedbackDuration = FEEDBACK_SPEED_MS[feedbackSpeed];

  // Module-specific state
  const [lastClickedSquare, setLastClickedSquare] = useState<Square | null>(null);
  const recentSquaresRef = useRef<Square[]>([]);

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
    mistakeAllowance: MAX_MISTAKES,
  });

  useScrollToElement('quiz-session', !!currentQuestion);

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

  // Save result and redirect on finish
  const savedRef = useRef(false);
  useEffect(() => {
    if (!isFinished || savedRef.current) return;
    savedRef.current = true;

    const params = new URLSearchParams({
      score: correctCount.toString(),
      total: totalCount.toString(),
      time: totalTime.toString(),
      timeLimit: initialTimeLimit.toString(),
      orientation: boardOrientation,
      speed: feedbackSpeed,
    });
    const resultUrl = `/${locale}/practice/coordinate-quiz/result?${params.toString()}`;

    if (user && totalCount > 0) {
      saveCoordinateQuizResult({
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        timeTaken: totalTime,
        timeLimit: initialTimeLimit,
        boardOrientation,
        mistakeAllowance: MAX_MISTAKES,
      })
        .catch(() => {
          // Silently ignore save failures - result display is unaffected
        })
        .finally(() => {
          router.push(resultUrl);
        });
    } else {
      router.push(resultUrl);
    }
  }, [
    isFinished,
    correctCount,
    incorrectCount,
    totalCount,
    locale,
    router,
    totalTime,
    initialTimeLimit,
    boardOrientation,
    feedbackSpeed,
    user,
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
        remainingLives={MAX_MISTAKES - incorrectCount}
        maxLives={MAX_MISTAKES}
      />
    </div>
  );
}
