'use client';

import { BoardOverlay } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { BoardSymmetryProblem } from '@blindfold-chess/features/board-symmetry';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { LuPause, LuPlay } from 'react-icons/lu';

import { QuitConfirmModal } from '@/app/[locale]/(public)/practice/_components/QuitConfirmModal';
import { QuizTimer } from '@/app/[locale]/(public)/practice/_components/QuizTimer';
import { ScoreCounter } from '@/app/[locale]/(public)/practice/_components/ScoreCounter';
import { useQuitConfirmLabels } from '@/app/[locale]/(public)/practice/_hooks/use-quit-confirm-labels';
import { SectionTitle } from '@/app/[locale]/_components';
import { CoordinateInput } from '@/app/[locale]/_components/CoordinateInput';

export type { BoardSymmetryProblem, SymmetryType } from '@blindfold-chess/features/board-symmetry';

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
  isPaused: boolean;
  onTogglePause: () => void;
  remainingLives?: number;
  maxLives?: number;
  onQuitRequest: () => void;
  showQuitModal: boolean;
  onQuitConfirm: () => void;
  onQuitCancel: () => void;
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
  isPaused,
  remainingLives,
  maxLives,
  onTogglePause,
  onQuitRequest,
  showQuitModal,
  onQuitConfirm,
  onQuitCancel,
}: Props) {
  const t = useTranslations('practice.boardSymmetry');
  const tPractice = useTranslations('practice');
  const quitConfirmLabels = useQuitConfirmLabels();
  const timeElapsed = timeLimit - timeRemaining;

  // Helper for conditional classes since cn might be missing
  const getFeedbackColor = () => {
    if (isCorrect === true) return 'text-success';
    if (isCorrect === false) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-card rounded-xl border border-border p-8 text-center shadow-sm relative overflow-hidden">
        {/* Countdown Overlay */}
        <BoardOverlay
          isVisible={countdown !== null}
          className="backdrop-blur-md z-50"
          data-testid="countdown-overlay"
        >
          <span className="text-8xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
            {countdown !== null && (countdown > 0 ? countdown : 'START!')}
          </span>
        </BoardOverlay>

        {/* Pause Overlay with Play Button */}
        <BoardOverlay isVisible={isPaused} className="backdrop-blur-sm bg-black/40 z-50">
          <button
            onClick={onTogglePause}
            className="bg-white/90 hover:bg-white text-foreground rounded-full p-6 shadow-lg transition-all hover:scale-110 active:scale-95 pointer-events-auto"
            aria-label={tPractice('resume')}
          >
            <LuPlay size={48} className="fill-current ml-1" />
          </button>
        </BoardOverlay>

        {/* Content with Blur when Paused */}
        <div
          className={`transition-all duration-300 ${isPaused || countdown !== null ? 'blur-sm' : ''}`}
        >
          <SectionTitle className="mb-8">
            {t('question', {
              type: t(`types.${problem.type}`),
              square: problem.square,
            })}
          </SectionTitle>

          {/* Header: Lives and Timer */}
          <div className="mb-6 flex justify-between items-center">
            {/* Lives */}
            <div className="flex items-center gap-1">
              {maxLives !== undefined &&
                remainingLives !== undefined &&
                Array.from({ length: maxLives }, (_, i) => (
                  <span key={i} className="text-destructive">
                    {i < remainingLives ? (
                      <FaHeart className="w-5 h-5" />
                    ) : (
                      <FaRegHeart className="w-5 h-5 opacity-30" />
                    )}
                  </span>
                ))}
            </div>
            {/* Timer */}
            <div className="flex items-center gap-2">
              <button
                onClick={onTogglePause}
                disabled={countdown !== null || isProcessing}
                className="p-1 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
                aria-label={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? (
                  <LuPlay size={18} className="fill-current" />
                ) : (
                  <LuPause size={18} className="fill-current" />
                )}
              </button>

              <QuizTimer
                timeRemaining={timeRemaining}
                progress={timeLimit > 0 ? timeElapsed / timeLimit : 0}
                size={40}
                fontSize="text-xs"
                strokeWidth={4}
              />
            </div>
          </div>

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
              className={`max-w-md mx-auto ${
                isProcessing || isPaused ? 'pointer-events-none opacity-50' : ''
              }`}
            />
          </div>
        </div>
      </div>

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-4" />

      <div className="flex flex-col items-center gap-2 mt-4">
        <button
          onClick={onQuitRequest}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
        >
          {tPractice('quit')}
        </button>
      </div>

      <QuitConfirmModal
        isOpen={showQuitModal}
        onConfirm={onQuitConfirm}
        onCancel={onQuitCancel}
        labels={quitConfirmLabels}
      />
    </div>
  );
}
