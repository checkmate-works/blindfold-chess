'use client';

import { useCallback, useMemo, useState } from 'react';

import { useDiagonalQuizSession } from '@blindfold-chess/features/diagonal-quiz/client';

import { MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { useChallengeResultSave } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-challenge-result-save';
import { useQuitConfirm } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-quit-confirm';
import { saveDiagonalQuizResult } from '@/app/[locale]/(public)/practice/(challenge)/diagonal-quiz/_actions/save-result';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import type { Locale } from '@/app/[locale]/_lib/types';

import { DiagonalQuizPlaySkeleton } from '../../_components/DiagonalQuizPlaySkeleton';
import { DiagonalQuizPlaying } from './DiagonalQuizPlaying';

type Props = {
  locale: Locale;
  initialTimeLimit: number;
};

export default function DiagonalQuizSession({ locale, initialTimeLimit }: Props) {
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
    handleAnswer,
    togglePause,
    finishSession,
    questionResults,
  } = useDiagonalQuizSession({
    timeLimit: initialTimeLimit,
    mistakeAllowance: MISTAKE_LIMIT,
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
      }))
    );

    const params = new URLSearchParams();
    params.set('score', correctCount.toString());
    params.set('total', (correctCount + incorrectCount).toString());
    params.set('time', timeElapsed.toString());
    params.set('timeLimit', initialTimeLimit.toString());
    params.set('data', encodeURIComponent(serializedData));

    return `/${locale}/practice/diagonal-quiz/result?${params.toString()}`;
  }, [correctCount, incorrectCount, timeElapsed, initialTimeLimit, questionResults, locale]);

  const saveResult = useCallback(
    () =>
      saveDiagonalQuizResult({
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        timeTaken: timeElapsed,
      }),
    [correctCount, incorrectCount, timeElapsed]
  );

  useChallengeResultSave({
    isFinished,
    totalAnswers: correctCount + incorrectCount,
    resultUrl,
    saveResult,
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
        timeRemaining={timeRemaining}
        timeLimit={initialTimeLimit}
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
