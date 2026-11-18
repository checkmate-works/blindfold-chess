'use client';

import { useMemo } from 'react';

import type { RemoteChallengePort } from '@blindfold-chess/features/challenge-attempt';
import { useSquareColorsSession } from '@blindfold-chess/features/square-colors/client';
import type { Square } from '@blindfold-chess/types';

import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { ChallengeAttemptGate } from '@/app/[locale]/(public)/practice/(challenge)/_components/ChallengeAttemptGate';
import { useChallengeResultSave } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-challenge-result-save';
import { useQuitConfirm } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-quit-confirm';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SquareColorsPlaySkeleton } from '../../_components/SquareColorsPlaySkeleton';
import { SquareColorsPlaying } from './SquareColorsPlaying';

type Props = {
  locale: Locale;
};

/** Square colors has no settings; the server's `parseSettings` takes an empty object. */
const SETTINGS = {};

export default function SquareColorsChallenge({ locale }: Props) {
  return (
    <ChallengeAttemptGate<Square>
      menuType="square_colors"
      settings={SETTINGS}
      fallback={<SquareColorsPlaySkeleton showHeader />}
    >
      {(attempt) => (
        <SquareColorsChallengeSession
          locale={locale}
          attemptId={attempt.attemptId}
          remote={attempt.remote}
        />
      )}
    </ChallengeAttemptGate>
  );
}

type SessionProps = {
  locale: Locale;
  attemptId: string | null;
  remote: RemoteChallengePort<Square> | undefined;
};

function SquareColorsChallengeSession({ locale, attemptId, remote }: SessionProps) {
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
    remoteFailed,
    awaitingServer,
    handleAnswer,
    togglePause,
  } = useSquareColorsSession({
    timeLimit: CHALLENGE_TIME_LIMIT,
    mistakeAllowance: MISTAKE_LIMIT,
    remote,
    disablePause: true,
  });

  useScrollToElement('square-colors-challenge');

  const { showQuitModal, handleQuitRequest, handleQuitConfirm, handleQuitCancel } = useQuitConfirm({
    locale,
    moduleSlug: 'square-colors',
    isPaused,
    togglePause,
  });

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

  useChallengeResultSave({
    isFinished,
    totalAnswers: total,
    resultUrl,
    attemptId,
    remoteFailed,
    moduleName: 'square_colors',
  });

  if (isFinished) {
    return <PracticeResultSkeleton grantsExp showsSignUpBanner showsRecordSection />;
  }

  if (!currentSquare || !isLoaded) {
    return <SquareColorsPlaySkeleton showHeader />;
  }

  return (
    <div id="square-colors-challenge" className="min-h-screen">
      <SquareColorsPlaying
        currentSquare={currentSquare}
        awaitingServer={awaitingServer}
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
