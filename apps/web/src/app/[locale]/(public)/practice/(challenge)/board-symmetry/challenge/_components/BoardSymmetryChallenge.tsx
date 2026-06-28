'use client';

import { useCallback, useEffect, useMemo } from 'react';

import { useBoardSymmetrySession } from '@blindfold-chess/features/board-symmetry/client';

import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { useChallengeResultSave } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-challenge-result-save';
import { useQuitConfirm } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-quit-confirm';
import { saveBoardSymmetryResult } from '@/app/[locale]/(public)/practice/(challenge)/board-symmetry/_actions/save-result';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import type { Locale } from '@/app/[locale]/_lib/types';

import { BoardSymmetryPlaySkeleton } from '../../_components/BoardSymmetryPlaySkeleton';
import { BoardSymmetryPlaying } from '../../_components/BoardSymmetryPlaying';

type Props = {
  locale: Locale;
};

export default function BoardSymmetryChallenge({ locale }: Props) {
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
      !isPaused
    ) {
      handleAnswer(selectedFile, selectedRank);
    }
  }, [selectedFile, selectedRank, handleAnswer, isProcessing, isCorrect, countdown, isPaused]);

  // Save result and redirect on finish
  const resultUrl = useMemo(() => {
    const params = new URLSearchParams({
      score: correctCount.toString(),
      total: (correctCount + incorrectCount).toString(),
      time: timeElapsed.toString(),
    });
    return `/${locale}/practice/board-symmetry/result?${params.toString()}`;
  }, [correctCount, incorrectCount, timeElapsed, locale]);

  const saveResult = useCallback(
    () =>
      saveBoardSymmetryResult({
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
    moduleName: 'board_symmetry',
  });

  if (isFinished) {
    return <PracticeResultSkeleton />;
  }

  if (!problem) {
    return <BoardSymmetryPlaySkeleton showHeader />;
  }

  return (
    <div id="board-symmetry-challenge" className="min-h-screen">
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
    </div>
  );
}
