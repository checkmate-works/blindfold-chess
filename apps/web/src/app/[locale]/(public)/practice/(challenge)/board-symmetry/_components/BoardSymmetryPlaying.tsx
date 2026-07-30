'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { BoardSymmetryProblem } from '@blindfold-chess/features/board-symmetry';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { ChallengeCountdownOverlay } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeCountdownOverlay';
import { ChallengePauseOverlay } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengePauseOverlay';
import { ChallengeQuitControl } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeQuitControl';
import { ChallengeStatusHeader } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeStatusHeader';
import { AlgebraicKeyboardHint } from '@/app/[locale]/(public)/practice/_components/KeyboardHint';
import { useAlgebraicKeyboardInput } from '@/app/[locale]/(public)/practice/_hooks/use-algebraic-keyboard-input';
import { SectionTitle } from '@/app/[locale]/_components';
import { CoordinateInput } from '@/app/[locale]/_components/CoordinateInput';

type Props = {
  problem: BoardSymmetryProblem;
  selectedFile: string | null;
  selectedRank: string | null;
  isCorrect: boolean | null;
  correctCount: number;
  incorrectCount: number;
  onFileToggle: (file: string) => void;
  onRankToggle: (rank: string) => void;
  onBackspace: () => void;
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
  onBackspace,
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
  const isDisabled = isProcessing || countdown !== null || isPaused;

  useAlgebraicKeyboardInput({
    onFile: onFileToggle,
    onRank: onRankToggle,
    onBackspace,
    enabled: !isDisabled,
  });

  // Helper for conditional classes since cn might be missing
  const getFeedbackColor = () => {
    if (isCorrect === true) return 'text-success';
    if (isCorrect === false) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="p-8 text-center relative overflow-hidden">
        <ChallengeCountdownOverlay countdown={countdown} />
        <ChallengePauseOverlay isPaused={isPaused} onTogglePause={onTogglePause} />

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

          <ChallengeStatusHeader
            className="mb-6 flex justify-between items-center"
            remainingLives={remainingLives}
            maxLives={maxLives}
            isPaused={isPaused}
            onTogglePause={onTogglePause}
            pauseDisabled={countdown !== null || isProcessing}
            timeRemaining={timeRemaining}
            timeLimit={timeLimit}
          />

          <div className="mb-8">
            <div className="flex items-center justify-center gap-4 text-6xl font-bold text-foreground mb-4 font-mono select-none">
              {problem.square}
              <span className="text-muted-foreground">→</span>
              <span className={`min-w-[2ch] ${getFeedbackColor()}`}>
                {selectedFile && selectedRank ? `${selectedFile}${selectedRank}` : '?'}
              </span>
            </div>
          </div>

          <div className="space-y-4 -mx-8 sm:mx-0">
            <CoordinateInput
              selectedFiles={selectedFile ? new Set([selectedFile]) : new Set()}
              selectedRanks={selectedRank ? new Set([selectedRank]) : new Set()}
              onFileToggle={onFileToggle}
              onRankToggle={onRankToggle}
              className={`max-w-md mx-auto ${
                isProcessing || isPaused ? 'pointer-events-none opacity-50' : ''
              }`}
            />
            <AlgebraicKeyboardHint disabled={isDisabled} />
          </div>
        </div>
      </div>

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-4" />

      <ChallengeQuitControl
        className="flex flex-col items-center gap-2 mt-4"
        onQuitRequest={onQuitRequest}
        showQuitModal={showQuitModal}
        onQuitConfirm={onQuitConfirm}
        onQuitCancel={onQuitCancel}
      />
    </div>
  );
}
