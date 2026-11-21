'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { RemoteChallengePort } from '@blindfold-chess/features/challenge-attempt';
import { coordinateQuizChallengeDefinition } from '@blindfold-chess/features/coordinate-quiz';
import type { CoordinateQuizChallengeSettings } from '@blindfold-chess/features/coordinate-quiz';
import { useCoordinateQuizSession } from '@blindfold-chess/features/coordinate-quiz/client';
import type { Square } from '@blindfold-chess/types';

import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { ChallengeAttemptGate } from '@/app/[locale]/(public)/practice/(challenge)/_components/ChallengeAttemptGate';
import { useChallengeResultSave } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-challenge-result-save';
import { useQuitConfirm } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-quit-confirm';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import type { Locale } from '@/app/[locale]/_lib/types';

import { CoordinateQuizPlaySkeleton } from '../../_components/CoordinateQuizPlaySkeleton';
import type { CoordinateQuestion } from '../../_lib/types';
import { CoordinateQuizChallengePlaying } from './CoordinateQuizChallengePlaying';

type Props = {
  locale: Locale;
  initialBoardOrientation: string;
};

/** What the setup screen links with when the query carries no valid choice. */
const DEFAULT_SETTINGS: CoordinateQuizChallengeSettings = {
  boardOrientation: 'white',
};

export default function CoordinateQuizChallenge({ locale, initialBoardOrientation }: Props) {
  // The server starts the attempt only with settings its `parseSettings`
  // accepts, and the device plays with the same values so both run one game.
  const settings = useMemo(
    () =>
      coordinateQuizChallengeDefinition.parseSettings({
        boardOrientation: initialBoardOrientation,
      }) ?? DEFAULT_SETTINGS,
    [initialBoardOrientation]
  );

  return (
    <ChallengeAttemptGate<CoordinateQuestion>
      menuType="coordinate_quiz"
      settings={settings}
      fallback={<CoordinateQuizPlaySkeleton showHeader />}
    >
      {(attempt) => (
        <CoordinateQuizChallengeSession
          locale={locale}
          settings={settings}
          attemptId={attempt.attemptId}
          remote={attempt.remote}
        />
      )}
    </ChallengeAttemptGate>
  );
}

type SessionProps = {
  locale: Locale;
  settings: CoordinateQuizChallengeSettings;
  attemptId: string | null;
  remote: RemoteChallengePort<CoordinateQuestion> | undefined;
};

function CoordinateQuizChallengeSession({ locale, settings, attemptId, remote }: SessionProps) {
  const { boardOrientation } = settings;

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
    remoteFailed,
    handleAnswer,
    togglePause,
  } = useCoordinateQuizSession({
    timeLimit: CHALLENGE_TIME_LIMIT,
    orientation: boardOrientation,
    mistakeAllowance: MISTAKE_LIMIT,
    remote,
    disablePause: true,
  });

  useScrollToElement('quiz-session', !!currentQuestion);

  const { showQuitModal, handleQuitRequest, handleQuitConfirm, handleQuitCancel } = useQuitConfirm({
    locale,
    moduleSlug: 'coordinate-quiz',
    isPaused,
    togglePause,
  });

  // Clear lastClickedSquare when feedback ends
  useEffect(() => {
    if (!showFeedback) {
      setLastClickedSquare(null);
    }
  }, [showFeedback]);

  const handleSquareClick = useCallback(
    (square: Square) => {
      // The answer's highlight stays on the square it was given on until the
      // next question, including any wait for the server; a click meanwhile is
      // ignored by the session and must not move it.
      if (showFeedback) return;
      setLastClickedSquare(square);
      handleAnswer(square);
    },
    [handleAnswer, showFeedback]
  );

  const resultUrl = useMemo(() => {
    const params = new URLSearchParams({
      score: correctCount.toString(),
      total: (correctCount + incorrectCount).toString(),
      time: timeElapsed.toString(),
      orientation: boardOrientation,
    });
    return `/${locale}/practice/coordinate-quiz/result?${params.toString()}`;
  }, [correctCount, incorrectCount, timeElapsed, boardOrientation, locale]);

  useChallengeResultSave({
    isFinished,
    totalAnswers: correctCount + incorrectCount,
    resultUrl,
    attemptId,
    remoteFailed,
    moduleName: 'coordinate_quiz',
  });

  if (isFinished) {
    return <PracticeResultSkeleton grantsExp showsSignUpBanner showsRecordSection />;
  }

  if (!currentQuestion) {
    return <CoordinateQuizPlaySkeleton showHeader />;
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
