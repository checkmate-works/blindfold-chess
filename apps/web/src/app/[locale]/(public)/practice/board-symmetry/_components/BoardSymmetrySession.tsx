'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { checkSymmetryAnswer, generateProblem } from '@blindfold-chess/features/board-symmetry';
import type { BoardSymmetryProblem } from '@blindfold-chess/features/board-symmetry';

import type { Locale } from '@/app/[locale]/_lib/types';

import { PracticeResultSkeleton } from '../../_components/PracticeResultSkeleton';
import { useTimedSession } from '../../_hooks/use-timed-session';
import { BoardSymmetryPlaying } from './BoardSymmetryPlaying';

type Props = {
  locale: Locale;
  initialTimeLimit: number;
};

export default function BoardSymmetrySession({ locale, initialTimeLimit }: Props) {
  const router = useRouter();

  // Module-specific UI state
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const hasMounted = useRef(false);

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
    timeLimit: initialTimeLimit,
    generateQuestion,
    feedbackDuration: (correct: boolean) => (correct ? 1000 : 2000),
  });

  // Scroll to session element after mount
  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;

    setTimeout(() => {
      const element = document.getElementById('board-symmetry-session');
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 100);
  }, []);

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

  // Redirect to result page when finished
  useEffect(() => {
    if (isFinished) {
      const total = correctCount + incorrectCount;
      const params = new URLSearchParams({
        score: correctCount.toString(),
        total: total.toString(),
        time: totalTime.toString(),
        timeLimit: initialTimeLimit.toString(),
      });
      router.push(`/${locale}/practice/board-symmetry/result?${params.toString()}`);
    }
  }, [isFinished, correctCount, incorrectCount, totalTime, initialTimeLimit, locale, router]);

  if (isFinished) {
    return <PracticeResultSkeleton />;
  }

  if (!problem) return <PracticeResultSkeleton />;

  return (
    <div id="board-symmetry-session" className="min-h-screen">
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
        timeLimit={initialTimeLimit}
        countdown={countdown}
        isPaused={isPaused}
        onTogglePause={togglePause}
      />
    </div>
  );
}
