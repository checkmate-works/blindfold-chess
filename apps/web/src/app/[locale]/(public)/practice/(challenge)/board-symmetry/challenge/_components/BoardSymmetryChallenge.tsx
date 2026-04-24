'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { checkSymmetryAnswer, generateProblem } from '@blindfold-chess/features/board-symmetry';
import type { BoardSymmetryProblem } from '@blindfold-chess/features/board-symmetry';
import { FEEDBACK_FLASH_MS, applyCoordinateBackspace } from '@blindfold-chess/features/common';
import { useTimedSession } from '@blindfold-chess/features/practice-session';

import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { useChallengeResultSave } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-challenge-result-save';
import { saveBoardSymmetryResult } from '@/app/[locale]/(public)/practice/(challenge)/board-symmetry/_actions/save-result';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import type { Locale } from '@/app/[locale]/_lib/types';

import { BoardSymmetryPlaying } from '../../_components/BoardSymmetryPlaying';

type Props = {
  locale: Locale;
};

export default function BoardSymmetryChallenge({ locale }: Props) {
  const router = useRouter();

  // Module-specific UI state
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showQuitModal, setShowQuitModal] = useState(false);

  const generateQuestion = useCallback((): BoardSymmetryProblem => {
    return generateProblem();
  }, []);

  const {
    currentQuestion: problem,
    timeRemaining,
    totalTime,
    correctCount,
    incorrectCount,
    showFeedback: isProcessing,
    isFinished,
    countdown,
    isPaused,
    handleAnswer,
    togglePause,
  } = useTimedSession<BoardSymmetryProblem>({
    timeLimit: CHALLENGE_TIME_LIMIT,
    generateQuestion,
    mistakeAllowance: MISTAKE_LIMIT,
    feedbackDuration: (correct: boolean) =>
      correct ? FEEDBACK_FLASH_MS.correct : FEEDBACK_FLASH_MS.incorrect,
  });

  useScrollToElement('board-symmetry-challenge');

  // Clear module-specific state when feedback ends (next problem loaded)
  useEffect(() => {
    if (!isProcessing) {
      setSelectedFile(null);
      setSelectedRank(null);
      setIsCorrect(null);
    }
  }, [isProcessing]);

  const checkAnswer = useCallback(
    (file: string, rank: string) => {
      if (!problem || isProcessing || isFinished || countdown !== null || isPaused) return;

      const { isCorrect: correct } = checkSymmetryAnswer(file, rank, problem);
      setIsCorrect(correct);
      handleAnswer(correct);
    },
    [problem, isProcessing, isFinished, countdown, isPaused, handleAnswer]
  );

  const handleFileToggle = (file: string) => {
    if (isProcessing || countdown !== null || isPaused) return;
    setSelectedFile((prev) => (prev === file ? null : file));
  };

  const handleRankToggle = (rank: string) => {
    if (isProcessing || countdown !== null || isPaused) return;
    setSelectedRank((prev) => (prev === rank ? null : rank));
  };

  // Rank-first deletion: clear the rank if present, otherwise clear the file.
  const handleBackspace = useCallback(() => {
    if (isProcessing || countdown !== null || isPaused) return;
    const { next } = applyCoordinateBackspace({ selectedFile, selectedRank });
    setSelectedFile(next.selectedFile);
    setSelectedRank(next.selectedRank);
  }, [isProcessing, countdown, isPaused, selectedFile, selectedRank]);

  const handleQuitRequest = useCallback(() => {
    if (!isPaused) togglePause();
    setShowQuitModal(true);
  }, [isPaused, togglePause]);

  const handleQuitConfirm = useCallback(() => {
    router.push(`/${locale}/practice/board-symmetry/challenge`);
  }, [router, locale]);

  const handleQuitCancel = useCallback(() => {
    setShowQuitModal(false);
    if (isPaused) togglePause();
  }, [isPaused, togglePause]);

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
      checkAnswer(selectedFile, selectedRank);
    }
  }, [selectedFile, selectedRank, checkAnswer, isProcessing, isCorrect, countdown, isPaused]);

  // Save result and redirect on finish
  const total = correctCount + incorrectCount;
  const resultUrl = useMemo(() => {
    const params = new URLSearchParams({
      score: correctCount.toString(),
      total: total.toString(),
      time: totalTime.toString(),
    });
    return `/${locale}/practice/board-symmetry/result?${params.toString()}`;
  }, [correctCount, total, totalTime, locale]);

  const saveResult = useCallback(
    () =>
      saveBoardSymmetryResult({
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        timeTaken: totalTime,
      }),
    [correctCount, incorrectCount, totalTime]
  );

  useChallengeResultSave({
    isFinished,
    totalAnswers: total,
    resultUrl,
    saveResult,
    moduleName: 'board_symmetry',
  });

  if (isFinished) {
    return <PracticeResultSkeleton />;
  }

  if (!problem) {
    return <PracticeResultSkeleton />;
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
