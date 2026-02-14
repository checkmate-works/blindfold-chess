'use client';

import { useTranslations } from 'next-intl';

import { BoardOverlay } from '@/app/_components';
import { QuizTimer } from '@/components/QuizTimer';
import type { BoardSymmetryProblem } from '@blindfold-chess/features';

import { SectionTitle } from '@/app/[locale]/_components';
import { CoordinateInput } from '@/app/[locale]/_components/CoordinateInput';
import { ScoreCounter } from '@/app/[locale]/practice/_components/ScoreCounter';

export type { BoardSymmetryProblem, SymmetryType } from '@blindfold-chess/features';

type Props = {
  problem: BoardSymmetryProblem;
  selectedFile: string | null;
  selectedRank: string | null;
  isCorrect: boolean | null;
  correctCount: number;
  incorrectCount: number;
  onFileToggle: (file: string) => void;
  onRankToggle: (rank: string) => void;
  isProcessing: boolean;
  timeRemaining: number;
  timeLimit: number;
  countdown: number | null;
  correctSolution: string | null;
};

export function BoardSymmetryPlaying({
  problem,
  selectedFile,
  selectedRank,
  isCorrect,
  correctCount,
  incorrectCount,
  onFileToggle,
  onRankToggle,
  isProcessing,
  timeRemaining,
  timeLimit,
  countdown,
  correctSolution,
}: Props) {
  const t = useTranslations('practice.boardSymmetry');
  const timeElapsed = timeLimit - timeRemaining;

  // Helper for conditional classes since cn might be missing
  const getFeedbackColor = () => {
    if (isCorrect === true) return 'text-green-600 dark:text-green-400';
    if (isCorrect === false) return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Header with Timer */}
      <div className="relative flex items-center justify-center min-h-[50px] mb-8">
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <QuizTimer
            timeRemaining={timeRemaining}
            progress={timeLimit > 0 ? timeElapsed / timeLimit : 0}
            size={50}
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-8 text-center relative overflow-hidden shadow-sm">
        {/* Countdown Overlay */}
        <BoardOverlay isVisible={countdown !== null} className="backdrop-blur-md">
          <span className="text-8xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
            {countdown !== null && (countdown > 0 ? countdown : 'START!')}
          </span>
        </BoardOverlay>
        <SectionTitle className="mb-8">
          {t('question', {
            type: t(`types.${problem.type}`),
            square: problem.square,
          })}
        </SectionTitle>

        <div className="mb-8">
          <div className="flex items-center justify-center gap-4 text-6xl font-bold text-foreground mb-4 font-mono">
            {problem.square}
            <span className="text-muted-foreground">→</span>
            <span className={`min-w-[2ch] ${getFeedbackColor()}`}>
              {selectedFile && selectedRank ? `${selectedFile}${selectedRank}` : '?'}
            </span>
          </div>

          <div
            className={`text-lg font-medium h-7 transition-opacity duration-200 ${
              isCorrect !== null ? 'opacity-100' : 'opacity-0'
            } ${getFeedbackColor()}`}
          >
            {isCorrect === true
              ? t('correct')
              : isCorrect === false
                ? t('incorrectWithSolution', { solution: correctSolution || '?' })
                : ''}
          </div>
        </div>

        <div className="space-y-4">
          <CoordinateInput
            selectedFiles={selectedFile ? new Set([selectedFile]) : new Set()}
            selectedRanks={selectedRank ? new Set([selectedRank]) : new Set()}
            onFileToggle={onFileToggle}
            onRankToggle={onRankToggle}
            className={`max-w-md mx-auto ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
          />
        </div>
      </div>

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-4" />
    </div>
  );
}
