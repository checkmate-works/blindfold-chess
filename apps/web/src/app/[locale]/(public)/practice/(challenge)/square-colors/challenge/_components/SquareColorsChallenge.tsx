'use client';

import { useCallback, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { BoardSkeleton } from '@/app/_components';
import { useSquareColorsSession } from '@blindfold-chess/features/square-colors/client';

import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { useChallengeResultSave } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-challenge-result-save';
import { saveSquareColorsResult } from '@/app/[locale]/(public)/practice/(challenge)/square-colors/_actions/save-result';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SquareColorsPlaying } from './SquareColorsPlaying';

type Props = {
  locale: Locale;
};

export default function SquareColorsChallenge({ locale }: Props) {
  const router = useRouter();
  const { preferences, isLoaded } = useGamePreferences();

  const {
    currentSquare,
    timeElapsed,
    timeRemaining,
    correctCount,
    incorrectCount,
    showFeedback,
    lastAnswerCorrect,
    isFinished,
    countdown,
    isPaused,
    handleAnswer,
    togglePause,
  } = useSquareColorsSession({
    timeLimit: CHALLENGE_TIME_LIMIT,
    mistakeAllowance: MISTAKE_LIMIT,
  });

  useScrollToElement('square-colors-challenge');

  const [showQuitModal, setShowQuitModal] = useState(false);

  const handleQuitRequest = useCallback(() => {
    if (!isPaused) togglePause();
    setShowQuitModal(true);
  }, [isPaused, togglePause]);

  const handleQuitConfirm = useCallback(() => {
    router.push(`/${locale}/practice/square-colors/challenge`);
  }, [router, locale]);

  const handleQuitCancel = useCallback(() => {
    setShowQuitModal(false);
    if (isPaused) togglePause();
  }, [isPaused, togglePause]);

  // Save result and redirect on finish
  const total = correctCount + incorrectCount;
  const resultUrl = useMemo(() => {
    const params = new URLSearchParams({
      score: correctCount.toString(),
      total: total.toString(),
      time: timeElapsed.toString(),
    });
    return `/${locale}/practice/square-colors/result?${params.toString()}`;
  }, [correctCount, total, timeElapsed, locale]);

  const saveResult = useCallback(
    () =>
      saveSquareColorsResult({
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        timeTaken: timeElapsed,
      }),
    [correctCount, incorrectCount, timeElapsed]
  );

  useChallengeResultSave({
    isFinished,
    totalAnswers: total,
    resultUrl,
    saveResult,
    moduleName: 'square_colors',
  });

  if (isFinished) {
    return <PracticeResultSkeleton />;
  }

  if (!currentSquare) {
    return <PracticeResultSkeleton />;
  }

  if (!isLoaded) {
    return (
      <div className="flex justify-center">
        <div className="w-full max-w-md">
          <BoardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div id="square-colors-challenge" className="min-h-screen">
      <SquareColorsPlaying
        currentSquare={currentSquare}
        timeRemaining={timeRemaining}
        timeLimit={CHALLENGE_TIME_LIMIT}
        showResult={showFeedback}
        lastAnswer={
          lastAnswerCorrect !== null ? { correct: lastAnswerCorrect, square: currentSquare } : null
        }
        onAnswer={handleAnswer}
        boardTheme={preferences.boardTheme}
        countdown={countdown}
        correctCount={correctCount}
        incorrectCount={incorrectCount}
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
