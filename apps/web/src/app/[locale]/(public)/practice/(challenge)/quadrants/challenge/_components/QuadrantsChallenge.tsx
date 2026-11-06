'use client';

import { useMemo, useRef } from 'react';

import { useRouter } from 'next/navigation';

import type { BoardOrientation } from '@blindfold-chess/features/quadrants';
import { useQuadrantsSession } from '@blindfold-chess/features/quadrants/client';

import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { useQuitConfirm } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-quit-confirm';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import type { Locale } from '@/app/[locale]/_lib/types';

import { QuadrantsPlaySkeleton } from '../../_components/QuadrantsPlaySkeleton';
import { QuadrantsPlaying } from './QuadrantsPlaying';

type Props = {
  locale: Locale;
  orientation: BoardOrientation;
};

export default function QuadrantsChallenge({ locale, orientation }: Props) {
  const router = useRouter();

  const {
    currentQuestion,
    timeRemaining,
    totalTime,
    correctCount,
    incorrectCount,
    showFeedback,
    lastAnswerCorrect,
    isFinished,
    countdown,
    isPaused,
    handleAnswer,
    togglePause,
  } = useQuadrantsSession({
    orientation,
    timeLimit: CHALLENGE_TIME_LIMIT,
    mistakeAllowance: MISTAKE_LIMIT,
  });

  useScrollToElement('quadrants-challenge');

  const { showQuitModal, handleQuitRequest, handleQuitConfirm, handleQuitCancel } = useQuitConfirm({
    locale,
    moduleSlug: 'quadrants',
    isPaused,
    togglePause,
  });

  // Redirect on finish
  const total = correctCount + incorrectCount;
  const resultUrl = useMemo(() => {
    const params = new URLSearchParams({
      score: correctCount.toString(),
      total: total.toString(),
      time: totalTime.toString(),
    });
    return `/${locale}/practice/quadrants/result?${params.toString()}`;
  }, [correctCount, total, totalTime, locale]);

  // Simple redirect without saving (no leaderboard)
  const redirectedRef = useRef(false);
  if (isFinished && !redirectedRef.current) {
    redirectedRef.current = true;
    // Use setTimeout to avoid state update during render
    setTimeout(() => {
      router.push(resultUrl);
    }, 0);
  }

  if (isFinished) {
    return <PracticeResultSkeleton grantsExp />;
  }

  if (!currentQuestion) {
    return <QuadrantsPlaySkeleton showHeader />;
  }

  return (
    <div id="quadrants-challenge" className="min-h-screen">
      <QuadrantsPlaying
        currentQuestion={currentQuestion}
        timeRemaining={timeRemaining}
        timeLimit={CHALLENGE_TIME_LIMIT}
        showFeedback={showFeedback}
        lastAnswerCorrect={lastAnswerCorrect}
        onAnswer={handleAnswer}
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
