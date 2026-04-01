'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { checkSymmetryAnswer, generateProblem } from '@blindfold-chess/features/board-symmetry';
import type { BoardSymmetryProblem } from '@blindfold-chess/features/board-symmetry';

import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@/lib/challenge-constants';

import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import { useTimedSession } from '@/app/[locale]/(public)/practice/_hooks/use-timed-session';
import { saveBoardSymmetryResult } from '@/app/[locale]/(public)/practice/board-symmetry/_actions/save-result';
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
    feedbackDuration: (correct: boolean) => (correct ? 1000 : 2000),
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
  const savedRef = useRef(false);
  useEffect(() => {
    if (!isFinished || savedRef.current) return;
    savedRef.current = true;

    const total = correctCount + incorrectCount;
    const params = new URLSearchParams({
      score: correctCount.toString(),
      total: total.toString(),
      time: totalTime.toString(),
    });
    const resultUrl = `/${locale}/practice/board-symmetry/result?${params.toString()}`;

    if (total > 0) {
      saveBoardSymmetryResult({
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        timeTaken: totalTime,
      })
        .then((result) => {
          if (!result.success) {
            console.error('Failed to save board_symmetry result:', result.error);
            sessionStorage.setItem('blindfold_chess_show_practice_save_error_toast', 'true');
          } else if (result.grantedRanks && result.grantedRanks.length > 0) {
            sessionStorage.setItem(
              'blindfold_chess_granted_ranks',
              JSON.stringify(result.grantedRanks)
            );
          }
        })
        .catch((error) => {
          console.error('Failed to save board_symmetry result:', error);
          sessionStorage.setItem('blindfold_chess_show_practice_save_error_toast', 'true');
        })
        .finally(() => {
          router.push(resultUrl);
        });
    } else {
      router.push(resultUrl);
    }
  }, [isFinished, correctCount, incorrectCount, locale, router, totalTime]);

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
