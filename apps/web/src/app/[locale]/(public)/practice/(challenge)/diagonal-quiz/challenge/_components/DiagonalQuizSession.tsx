'use client';

import { useCallback, useMemo, useState } from 'react';

import type { RemoteChallengePort } from '@blindfold-chess/features/challenge-attempt';
import { useDiagonalQuizSession } from '@blindfold-chess/features/diagonal-quiz/client';
import type { Square } from '@blindfold-chess/types';

import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { ChallengeAttemptGate } from '@/app/[locale]/(public)/practice/(challenge)/_components/ChallengeAttemptGate';
import { useChallengeResultSave } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-challenge-result-save';
import { useQuitConfirm } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-quit-confirm';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import type { Locale } from '@/app/[locale]/_lib/types';

import { DiagonalQuizPlaySkeleton } from '../../_components/DiagonalQuizPlaySkeleton';
import { DiagonalQuizPlaying } from './DiagonalQuizPlaying';

type Props = {
  locale: Locale;
};

/** Diagonal quiz has no settings; the server's `parseSettings` takes an empty object. */
const SETTINGS = {};

/**
 * Every challenge runs for {@link CHALLENGE_TIME_LIMIT}. The setup screen used
 * to pass it in the URL; a hand-edited value would now only make the device's
 * clock disagree with the server's, which keeps its own limit.
 */
const TIME_LIMIT = CHALLENGE_TIME_LIMIT;

export default function DiagonalQuizSession({ locale }: Props) {
  return (
    <ChallengeAttemptGate<Square>
      menuType="diagonal_quiz"
      settings={SETTINGS}
      fallback={<DiagonalQuizPlaySkeleton showHeader />}
    >
      {(attempt) => (
        <DiagonalQuizChallengeSession
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

function DiagonalQuizChallengeSession({ locale, attemptId, remote }: SessionProps) {
  const {
    currentSquare,
    timeRemaining,
    timeElapsed,
    correctCount,
    incorrectCount,
    showFeedback,
    lastAnswer,
    isFinished,
    countdown,
    isPaused,
    remoteFailed,
    awaitingServer,
    handleAnswer,
    togglePause,
    finishSession,
    questionResults,
  } = useDiagonalQuizSession({
    timeLimit: TIME_LIMIT,
    mistakeAllowance: MISTAKE_LIMIT,
    remote,
    disablePause: true,
  });

  useScrollToElement('diagonal-quiz-session');

  // Set when the user quits mid-run. The run still lands on the result/feedback
  // screen, but `skipSave` below suppresses leaderboard recording, EXP, and rank
  // evaluation — a voluntarily-abandoned run is not rewarded.
  const [isAborted, setIsAborted] = useState(false);
  const handleAbort = useCallback(() => {
    setIsAborted(true);
    finishSession();
  }, [finishSession]);

  const { showQuitModal, handleQuitRequest, handleQuitConfirm, handleQuitCancel } = useQuitConfirm({
    locale,
    moduleSlug: 'diagonal-quiz',
    isPaused,
    togglePause,
    // Quit ends the run at its current score and falls through to the same
    // result/feedback screen as a full completion, instead of bailing back to
    // the challenge setup page.
    onConfirm: handleAbort,
  });

  // Save result and redirect on finish
  const resultUrl = useMemo(() => {
    const serializedData = JSON.stringify(
      questionResults.map((r) => ({
        s: r.square,
        c: r.isCorrect ? 1 : 0,
        dc: r.isDiagonalCorrect ? 1 : 0,
        ac: r.isAntiDiagonalCorrect ? 1 : 0,
        cd: r.correctDiagonal,
        ca: r.correctAntiDiagonal,
        ud: r.userDiagonal,
        ua: r.userAntiDiagonal,
        ...(r.timedOut ? { t: 1 } : {}),
      }))
    );

    const params = new URLSearchParams();
    params.set('score', correctCount.toString());
    params.set('total', (correctCount + incorrectCount).toString());
    params.set('time', timeElapsed.toString());
    params.set('timeLimit', TIME_LIMIT.toString());
    params.set('data', encodeURIComponent(serializedData));

    return `/${locale}/practice/diagonal-quiz/result?${params.toString()}`;
  }, [correctCount, incorrectCount, timeElapsed, questionResults, locale]);

  useChallengeResultSave({
    isFinished,
    totalAnswers: correctCount + incorrectCount,
    resultUrl,
    attemptId,
    remoteFailed,
    moduleName: 'diagonal_quiz',
    skipSave: isAborted,
  });

  // On finish the session is navigating to the separate result page, so the
  // result-shaped skeleton is correct there. The brief pre-first-square state,
  // by contrast, is about to render the playing screen — use the matching
  // play-shaped skeleton so the fallback doesn't diverge from what renders.
  if (isFinished) {
    return <PracticeResultSkeleton grantsExp showsSignUpBanner showsRecordSection />;
  }
  if (!currentSquare) {
    return <DiagonalQuizPlaySkeleton showHeader />;
  }

  return (
    <div id="diagonal-quiz-session" className="min-h-screen">
      <DiagonalQuizPlaying
        currentSquare={currentSquare}
        awaitingServer={awaitingServer}
        timeRemaining={timeRemaining}
        timeLimit={TIME_LIMIT}
        showResult={showFeedback}
        lastAnswer={lastAnswer}
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
