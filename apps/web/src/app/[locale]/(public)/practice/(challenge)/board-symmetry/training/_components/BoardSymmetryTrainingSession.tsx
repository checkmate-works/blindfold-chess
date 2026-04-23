'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { checkSymmetryAnswer, generateProblem } from '@blindfold-chess/features/board-symmetry';
import type { BoardSymmetryProblem } from '@blindfold-chess/features/board-symmetry';
import { applyCoordinateBackspace } from '@blindfold-chess/features/common';

import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { BoardSymmetryTrainingPlaying } from './BoardSymmetryTrainingPlaying';

type Props = {
  locale: Locale;
};

export default function BoardSymmetryTrainingSession({ locale }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const tp = useTranslations('practice');

  const [problem, setProblem] = useState<BoardSymmetryProblem | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);

  const hasStarted = useRef(false);

  // Generate initial problem
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setProblem(generateProblem());
  }, []);

  useScrollToElement('board-symmetry-training-session');

  const advanceToNextProblem = useCallback(() => {
    setSelectedFile(null);
    setSelectedRank(null);
    setIsCorrect(null);
    setIsProcessing(false);
    setProblem(generateProblem());
  }, []);

  const checkAnswer = useCallback(
    (file: string, rank: string) => {
      if (!problem || isProcessing) return;

      const { isCorrect: correct } = checkSymmetryAnswer(file, rank, problem);
      setIsCorrect(correct);
      setIsProcessing(true);

      if (correct) {
        setCorrectCount((prev) => prev + 1);
      } else {
        setIncorrectCount((prev) => prev + 1);
      }

      const delay = correct ? 1000 : 2000;
      setTimeout(advanceToNextProblem, delay);
    },
    [problem, isProcessing, advanceToNextProblem]
  );

  const handleFileToggle = (file: string) => {
    if (isProcessing) return;
    setSelectedFile((prev) => (prev === file ? null : file));
  };

  const handleRankToggle = (rank: string) => {
    if (isProcessing) return;
    setSelectedRank((prev) => (prev === rank ? null : rank));
  };

  // Rank-first deletion: clear the rank if present, otherwise clear the file.
  const handleBackspace = useCallback(() => {
    if (isProcessing) return;
    const { next } = applyCoordinateBackspace({ selectedFile, selectedRank });
    setSelectedFile(next.selectedFile);
    setSelectedRank(next.selectedRank);
  }, [isProcessing, selectedFile, selectedRank]);

  // Auto-submit when both file and rank are selected
  useEffect(() => {
    if (selectedFile && selectedRank && !isProcessing && isCorrect === null) {
      checkAnswer(selectedFile, selectedRank);
    }
  }, [selectedFile, selectedRank, checkAnswer, isProcessing, isCorrect]);

  const handleEndTraining = useCallback(() => {
    showToast(tp('trainingEnded'), 'info');
    router.push(`/${locale}/practice/board-symmetry`);
  }, [showToast, tp, router, locale]);

  if (!problem) {
    return <PracticeResultSkeleton />;
  }

  return (
    <div id="board-symmetry-training-session" className="min-h-screen">
      <BoardSymmetryTrainingPlaying
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
        onEndTraining={handleEndTraining}
        locale={locale}
      />
    </div>
  );
}
