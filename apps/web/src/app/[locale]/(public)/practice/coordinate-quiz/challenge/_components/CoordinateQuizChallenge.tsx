'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { Square } from '@blindfold-chess/types';

import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@/lib/challenge-constants';

import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import { useTimedSession } from '@/app/[locale]/(public)/practice/_hooks/use-timed-session';
import { saveCoordinateQuizResult } from '@/app/[locale]/(public)/practice/coordinate-quiz/_actions/save-result';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { BoardOrientation, CoordinateQuestion, FeedbackSpeed } from '../../_lib/types';
import { FEEDBACK_SPEED_MS } from '../../_lib/types';
import { checkAnswer, generateSingleQuestion } from '../../_lib/utils';
import { CoordinateQuizChallengePlaying } from './CoordinateQuizChallengePlaying';

type Props = {
  locale: Locale;
  initialBoardOrientation: string;
  initialFeedbackSpeed: string;
};

export default function CoordinateQuizChallenge({
  locale,
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
    timeLimit: CHALLENGE_TIME_LIMIT,
    generateQuestion,
    feedbackDuration,
    mistakeAllowance: MISTAKE_LIMIT,
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
      orientation: boardOrientation,
      speed: feedbackSpeed,
    });
    const resultUrl = `/${locale}/practice/coordinate-quiz/result?${params.toString()}`;

    if (totalCount > 0) {
      saveCoordinateQuizResult({
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        timeTaken: totalTime,
        boardOrientation,
      })
        .then((result) => {
          if (!result.success) {
            console.error('Failed to save coordinate_quiz result:', result.error);
            sessionStorage.setItem('blindfold_chess_show_practice_save_error_toast', 'true');
          } else if (result.grantedRanks && result.grantedRanks.length > 0) {
            sessionStorage.setItem(
              'blindfold_chess_granted_ranks',
              JSON.stringify(result.grantedRanks)
            );
          }
        })
        .catch((error) => {
          console.error('Failed to save coordinate_quiz result:', error);
          sessionStorage.setItem('blindfold_chess_show_practice_save_error_toast', 'true');
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
        timeLimit={CHALLENGE_TIME_LIMIT}
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
        remainingLives={MISTAKE_LIMIT - incorrectCount}
        maxLives={MISTAKE_LIMIT}
      />
    </div>
  );
}
