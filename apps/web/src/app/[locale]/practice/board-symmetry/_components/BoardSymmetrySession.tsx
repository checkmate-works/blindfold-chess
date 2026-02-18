'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { checkSymmetryAnswer, generateProblem } from '@blindfold-chess/features';
import type { BoardSymmetryProblem } from '@blindfold-chess/features';

import type { Locale } from '@/app/[locale]/_lib/types';

import { PracticeResultSkeleton } from '../../_components/PracticeResultSkeleton';
import { useGameTimer } from '../../_hooks/useGameTimer';
import { BoardSymmetryPlaying } from './BoardSymmetryPlaying';

type Props = {
  locale: Locale;
  initialTimeLimit: number;
};

export default function BoardSymmetrySession({ locale, initialTimeLimit }: Props) {
  const router = useRouter();

  const timeLimit = initialTimeLimit;
  const [isFinished, setIsFinished] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);

  // Game state
  const [problem, setProblem] = useState<BoardSymmetryProblem | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [isPaused, setIsPaused] = useState(false);

  const hasStarted = useRef(false);
  const [hasMounted, setHasMounted] = useState(false);

  const nextProblem = useCallback(() => {
    setProblem(generateProblem());
    setSelectedFile(null);
    setSelectedRank(null);
    setIsCorrect(null);
    setIsCorrect(null);
    setIsProcessing(false);
  }, []);

  // Timer hook
  const isPlaying = !isFinished && countdown === null && !isProcessing && !isPaused;

  const { timeElapsed, totalTime } = useGameTimer({
    timeLimit,
    isActive: isPlaying,
    onTimeLimitReached: useCallback(() => setIsFinished(true), []),
  });

  // Toggle pause
  const togglePause = useCallback(() => {
    if (isFinished || countdown !== null) return;
    setIsPaused((prev) => !prev);
  }, [isFinished, countdown]);

  // Auto-start and mount detection
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setHasMounted(true);
    nextProblem();
  }, [nextProblem]);

  // Scroll to session element after mount
  useEffect(() => {
    if (!hasMounted) return;
    setTimeout(() => {
      const element = document.getElementById('board-symmetry-session');
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 100);
  }, [hasMounted]);

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      const timer = setTimeout(() => {
        setCountdown(null);
      }, 500); // Show "START!" for 0.5s
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const checkAnswer = useCallback(
    (file: string, rank: string) => {
      if (!problem || isProcessing || isFinished || countdown !== null || isPaused) return;

      const { isCorrect: correct } = checkSymmetryAnswer(file, rank, problem);

      setIsCorrect(correct);
      setIsProcessing(true);

      if (correct) {
        setCorrectCount((c) => c + 1);
      } else {
        setIncorrectCount((c) => c + 1);
      }

      // Auto-advance
      setTimeout(
        () => {
          if (!isFinished) {
            nextProblem();
          }
        },
        correct ? 1000 : 2000
      );
    },
    [problem, isProcessing, isFinished, nextProblem, countdown, isPaused]
  );

  const handleFileToggle = (file: string) => {
    if (isProcessing || countdown !== null || isPaused) return;
    setSelectedFile((prev) => (prev === file ? null : file));
  };

  const handleRankToggle = (rank: string) => {
    if (isProcessing || countdown !== null || isPaused) return;
    setSelectedRank((prev) => (prev === rank ? null : rank));
  };

  // Auto-submit effect when both selected
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
        timeLimit: timeLimit.toString(),
      });
      router.push(`/${locale}/practice/board-symmetry/result?${params.toString()}`);
    }
  }, [isFinished, correctCount, incorrectCount, totalTime, timeLimit, locale, router]);

  if (isFinished) {
    return <PracticeResultSkeleton />;
  }

  if (!problem) return <PracticeResultSkeleton />;

  return (
    <div id="board-symmetry-session">
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
        timeRemaining={timeLimit - timeElapsed}
        timeLimit={timeLimit}
        countdown={countdown}
        isPaused={isPaused}
        onTogglePause={togglePause}
      />
    </div>
  );
}
