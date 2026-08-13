'use client';

import type { BoardSymmetryProblem } from '@blindfold-chess/features/board-symmetry';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { ChallengeQuitControl } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeQuitControl';
import { ChallengeSessionVeil } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeSessionVeil';
import { ChallengeStatusHeader } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeStatusHeader';

import { BoardSymmetryQuestionPanel } from './BoardSymmetryQuestionPanel';

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
  const isDisabled = isProcessing || countdown !== null || isPaused;

  return (
    <div className="max-w-md mx-auto">
      <ChallengeSessionVeil
        countdown={countdown}
        isPaused={isPaused}
        onTogglePause={onTogglePause}
        className="p-8 text-center"
      >
        <BoardSymmetryQuestionPanel
          problem={problem}
          statusHeader={
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
          }
          selectedFile={selectedFile}
          selectedRank={selectedRank}
          isCorrect={isCorrect}
          onFileToggle={onFileToggle}
          onRankToggle={onRankToggle}
          onBackspace={onBackspace}
          inputLocked={isDisabled}
          inputDimmed={isProcessing || isPaused}
        />

        <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-4" />
      </ChallengeSessionVeil>

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
