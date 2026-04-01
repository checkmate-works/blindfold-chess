'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { BoardOverlay, Button } from '@/app/_components';
import type { BoardSymmetryProblem } from '@blindfold-chess/features/board-symmetry';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/_components/ScoreCounter';
import { SectionTitle } from '@/app/[locale]/_components';
import { CoordinateInput } from '@/app/[locale]/_components/CoordinateInput';
import type { Locale } from '@/app/[locale]/_lib/types';

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
  countdown: number | null;
  onEndTraining: () => void;
  locale: Locale;
};

export function BoardSymmetryTrainingPlaying({
  problem,
  selectedFile,
  selectedRank,
  isCorrect,
  correctCount,
  incorrectCount,
  onFileToggle,
  onRankToggle,
  isProcessing,
  countdown,
  onEndTraining,
  locale,
}: Props) {
  const t = useTranslations('practice.boardSymmetry');
  const tp = useTranslations('practice');

  const getFeedbackColor = () => {
    if (isCorrect === true) return 'text-success';
    if (isCorrect === false) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-card rounded-xl border border-border p-8 text-center shadow-sm relative overflow-hidden">
        {/* Countdown Overlay */}
        <BoardOverlay isVisible={countdown !== null} className="backdrop-blur-md">
          <span className="text-8xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
            {countdown !== null && (countdown > 0 ? countdown : 'START!')}
          </span>
        </BoardOverlay>

        <div>
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
      </div>

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-4" />

      <div className="mt-6 text-center">
        <button
          onClick={onEndTraining}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {tp('endTraining')}
        </button>
      </div>

      <hr className="border-border mt-8" />

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">{tp('trainingModeActive')}</p>
        <p className="mt-2 text-base font-medium text-foreground">{tp('readyForChallenge')}</p>
        <div className="mt-4">
          <Link href={`/${locale}/practice/board-symmetry/challenge/session`}>
            <Button asChild variant="primary" size="lg" className="w-full">
              {tp('goToChallenge')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
