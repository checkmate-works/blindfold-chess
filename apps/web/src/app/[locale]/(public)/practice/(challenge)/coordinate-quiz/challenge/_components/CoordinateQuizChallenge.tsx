'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useCoordinateQuizSession } from '@blindfold-chess/features/coordinate-quiz/client';
import type { Square } from '@blindfold-chess/types';

import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { useChallengeResultSave } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-challenge-result-save';
import { saveCoordinateQuizResult } from '@/app/[locale]/(public)/practice/(challenge)/coordinate-quiz/_actions/save-result';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { BoardOrientation, FeedbackSpeed } from '../../_lib/types';
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

  const [lastClickedSquare, setLastClickedSquare] = useState<Square | null>(null);

  const {
    currentQuestion,
    timeRemaining,
    timeElapsed,
    correctCount,
    incorrectCount,
    showFeedback,
    lastAnswerCorrect,
    isFinished,
    countdown,
    isPaused,
    handleAnswer,
    togglePause,
  } = useCoordinateQuizSession({
    timeLimit: CHALLENGE_TIME_LIMIT,
    orientation: boardOrientation,
    feedbackSpeed,
    mistakeAllowance: MISTAKE_LIMIT,
  });

  useScrollToElement('quiz-session', !!currentQuestion);

  const [showQuitModal, setShowQuitModal] = useState(false);

  const handleQuitRequest = useCallback(() => {
    if (!isPaused) togglePause();
    setShowQuitModal(true);
  }, [isPaused, togglePause]);

  const handleQuitConfirm = useCallback(() => {
    router.push(`/${locale}/practice/coordinate-quiz/challenge`);
  }, [router, locale]);

  const handleQuitCancel = useCallback(() => {
    setShowQuitModal(false);
    if (isPaused) togglePause();
  }, [isPaused, togglePause]);

  // Clear lastClickedSquare when feedback ends
  useEffect(() => {
    if (!showFeedback) {
      setLastClickedSquare(null);
    }
  }, [showFeedback]);

  const handleSquareClick = useCallback(
    (square: Square) => {
      setLastClickedSquare(square);
      handleAnswer(square);
    },
    [handleAnswer]
  );

  const resultUrl = useMemo(() => {
    const params = new URLSearchParams({
      score: correctCount.toString(),
      total: (correctCount + incorrectCount).toString(),
      time: timeElapsed.toString(),
      orientation: boardOrientation,
      speed: feedbackSpeed,
    });
    return `/${locale}/practice/coordinate-quiz/result?${params.toString()}`;
  }, [correctCount, incorrectCount, timeElapsed, boardOrientation, feedbackSpeed, locale]);

  const saveResult = useCallback(
    () =>
      saveCoordinateQuizResult({
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        timeTaken: timeElapsed,
        boardOrientation,
      }),
    [correctCount, incorrectCount, timeElapsed, boardOrientation]
  );

  useChallengeResultSave({
    isFinished,
    totalAnswers: correctCount + incorrectCount,
    resultUrl,
    saveResult,
    moduleName: 'coordinate_quiz',
  });

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
        onQuitRequest={handleQuitRequest}
        showQuitModal={showQuitModal}
        onQuitConfirm={handleQuitConfirm}
        onQuitCancel={handleQuitCancel}
      />
    </div>
  );
}
