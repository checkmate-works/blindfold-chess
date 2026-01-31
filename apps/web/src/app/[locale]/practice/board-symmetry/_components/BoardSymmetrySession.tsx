'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeResult } from '@/app/[locale]/practice/_components/PracticeResult';

import { BoardSymmetryPlaying, BoardSymmetryProblem } from './BoardSymmetryPlaying';

type Props = {
  locale: Locale;
  initialTimeLimit: number;
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

export default function BoardSymmetrySession({ locale, initialTimeLimit }: Props) {
  const t = useTranslations('practice.boardSymmetry');
  const tPractice = useTranslations('practice');

  const timeLimit = initialTimeLimit;
  const [timeElapsed, setTimeElapsed] = useState(0);
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

  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const hasStarted = useRef(false);
  const [hasMounted, setHasMounted] = useState(false);

  const generateProblem = useCallback(() => {
    const randomFile = FILES[Math.floor(Math.random() * 8)];
    const randomRank = RANKS[Math.floor(Math.random() * 8)];
    const types: ('horizontal' | 'vertical' | 'point')[] = ['horizontal', 'vertical', 'point'];
    const randomType = types[Math.floor(Math.random() * types.length)];

    setProblem({
      square: `${randomFile}${randomRank}`,
      type: randomType,
    });
    setSelectedFile(null);
    setSelectedRank(null);
    setIsCorrect(null);
    setIsProcessing(false);
  }, []);

  // Auto-start and mount detection
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setHasMounted(true);
    generateProblem();
  }, [generateProblem]);

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

  // Timer effect
  useEffect(() => {
    if (isFinished || countdown !== null || isProcessing) return;

    timerRef.current = setInterval(() => {
      setTimeElapsed((prev) => {
        const newTime = prev + 1;
        if (newTime >= timeLimit) {
          setIsFinished(true);
        }
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isFinished, timeLimit, countdown, isProcessing]);

  const checkAnswer = useCallback(
    (file: string, rank: string) => {
      if (!problem || isProcessing || isFinished || countdown !== null) return;

      const fileIndex = FILES.indexOf(problem.square[0]);
      const rankIndex = RANKS.indexOf(problem.square[1]);

      let targetFileIndex = fileIndex;
      let targetRankIndex = rankIndex;

      switch (problem.type) {
        case 'horizontal': // File symmetry (a <-> h)
          targetFileIndex = 7 - fileIndex;
          break;
        case 'vertical': // Rank symmetry (1 <-> 8)
          targetRankIndex = 7 - rankIndex;
          break;
        case 'point': // Center symmetry (rotate 180)
          targetFileIndex = 7 - fileIndex;
          targetRankIndex = 7 - rankIndex;
          break;
      }

      const correctFile = FILES[targetFileIndex];
      const correctRank = RANKS[targetRankIndex];
      const correct = file === correctFile && rank === correctRank;

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
            generateProblem();
          }
        },
        correct ? 1000 : 2000
      );
    },
    [problem, isProcessing, isFinished, generateProblem, countdown]
  );

  const handleFileToggle = (file: string) => {
    if (isProcessing || countdown !== null) return;
    setSelectedFile((prev) => (prev === file ? null : file));
  };

  const handleRankToggle = (rank: string) => {
    if (isProcessing || countdown !== null) return;
    setSelectedRank((prev) => (prev === rank ? null : rank));
  };

  // Auto-submit effect when both selected
  useEffect(() => {
    if (selectedFile && selectedRank && !isProcessing && isCorrect === null && countdown === null) {
      checkAnswer(selectedFile, selectedRank);
    }
  }, [selectedFile, selectedRank, checkAnswer, isProcessing, isCorrect, countdown]);

  const handlePlayAgain = () => {
    setCorrectCount(0);
    setIncorrectCount(0);
    setTimeElapsed(0);
    setIsFinished(false);
    setCountdown(3);
    generateProblem();
  };

  if (isFinished) {
    const total = correctCount + incorrectCount;
    const accuracy = total > 0 ? (correctCount / total) * 100 : 0;
    const averageTime = total > 0 ? timeLimit / total : 0;

    return (
      <PracticeResult
        score={{
          correct: correctCount,
          total,
          accuracy,
          timeElapsed: timeLimit,
          averageTime,
        }}
        onTryAgain={handlePlayAgain}
        locale={locale}
        labels={{
          correctAnswers: t('correctAnswers') || tPractice('correctAnswers'), // Fallback if missing
          accuracy: t('accuracy') || tPractice('accuracy'),
          timeTaken: t('timeTaken') || tPractice('timeTaken'),
          averageTime: t('averageTime') || tPractice('averageTime'),
          tryAgain: tPractice('tryAgain'),
          morePractice: tPractice('morePractice'),
        }}
      />
    );
  }

  if (!problem) return null;

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
      />
    </div>
  );
}
