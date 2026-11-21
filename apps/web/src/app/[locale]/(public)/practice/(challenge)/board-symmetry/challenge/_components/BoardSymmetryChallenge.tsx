'use client';

import { useEffect, useMemo } from 'react';

import type { BoardSymmetryProblem } from '@blindfold-chess/features/board-symmetry';
import { useBoardSymmetrySession } from '@blindfold-chess/features/board-symmetry/client';
import type { RemoteChallengePort } from '@blindfold-chess/features/challenge-attempt';

import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@/lib/challenge/constants';

import {
  AwaitingServerInputLock,
  ChallengeAttemptGate,
} from '@/app/[locale]/(public)/practice/(challenge)/_components/ChallengeAttemptGate';
import { useChallengeResultSave } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-challenge-result-save';
import { useQuitConfirm } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-quit-confirm';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import type { Locale } from '@/app/[locale]/_lib/types';

import { BoardSymmetryPlaySkeleton } from '../../_components/BoardSymmetryPlaySkeleton';
import { BoardSymmetryPlaying } from '../../_components/BoardSymmetryPlaying';

type Props = {
  locale: Locale;
};

/** Board symmetry has no settings; the server's `parseSettings` takes an empty object. */
const SETTINGS = {};

export default function BoardSymmetryChallenge({ locale }: Props) {
  return (
    <ChallengeAttemptGate<BoardSymmetryProblem>
      menuType="board_symmetry"
      settings={SETTINGS}
      fallback={<BoardSymmetryPlaySkeleton showHeader />}
    >
      {(attempt) => (
        <BoardSymmetryChallengeSession
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
  remote: RemoteChallengePort<BoardSymmetryProblem> | undefined;
};

function BoardSymmetryChallengeSession({ locale, attemptId, remote }: SessionProps) {
  const {
    currentProblem: problem,
    timeRemaining,
    timeElapsed,
    correctCount,
    incorrectCount,
    showFeedback: isProcessing,
    lastAnswerCorrect,
    isFinished,
    countdown,
    isPaused,
    remoteFailed,
    awaitingServer,
    selectedFile,
    selectedRank,
    handleFileToggle,
    handleRankToggle,
    handleBackspace,
    handleAnswer,
    togglePause,
  } = useBoardSymmetrySession({
    timeLimit: CHALLENGE_TIME_LIMIT,
    mistakeAllowance: MISTAKE_LIMIT,
    remote,
    disablePause: true,
  });

  const isCorrect = isProcessing ? lastAnswerCorrect : null;

  useScrollToElement('board-symmetry-challenge');

  const { showQuitModal, handleQuitRequest, handleQuitConfirm, handleQuitCancel } = useQuitConfirm({
    locale,
    moduleSlug: 'board-symmetry',
    isPaused,
    togglePause,
  });

  // Auto-submit when both file and rank are selected
  useEffect(() => {
    if (
      selectedFile &&
      selectedRank &&
      !isProcessing &&
      isCorrect === null &&
      countdown === null &&
      !isPaused &&
      !awaitingServer
    ) {
      handleAnswer(selectedFile, selectedRank);
    }
  }, [
    selectedFile,
    selectedRank,
    handleAnswer,
    isProcessing,
    isCorrect,
    countdown,
    isPaused,
    awaitingServer,
  ]);

  // Save result and redirect on finish
  const resultUrl = useMemo(() => {
    const params = new URLSearchParams({
      score: correctCount.toString(),
      total: (correctCount + incorrectCount).toString(),
      time: timeElapsed.toString(),
    });
    return `/${locale}/practice/board-symmetry/result?${params.toString()}`;
  }, [correctCount, incorrectCount, timeElapsed, locale]);

  useChallengeResultSave({
    isFinished,
    totalAnswers: correctCount + incorrectCount,
    resultUrl,
    attemptId,
    remoteFailed,
    moduleName: 'board_symmetry',
  });

  if (isFinished) {
    return <PracticeResultSkeleton grantsExp showsSignUpBanner showsRecordSection />;
  }

  if (!problem) {
    return <BoardSymmetryPlaySkeleton showHeader />;
  }

  return (
    <div id="board-symmetry-challenge" className="min-h-screen">
      {/* The question view is shared and takes no waiting state, so input to
          the whole view is locked while the next problem is on its way. */}
      <AwaitingServerInputLock active={awaitingServer}>
        <BoardSymmetryPlaying
          problem={problem}
          selectedFile={selectedFile}
          selectedRank={selectedRank}
          isCorrect={isCorrect}
          correctCount={correctCount}
          incorrectCount={incorrectCount}
          onFileToggle={handleFileToggle}
          onRankToggle={handleRankToggle}
          onBackspace={handleBackspace}
          isProcessing={isProcessing}
          timeRemaining={timeRemaining}
          timeLimit={CHALLENGE_TIME_LIMIT}
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
      </AwaitingServerInputLock>
    </div>
  );
}
