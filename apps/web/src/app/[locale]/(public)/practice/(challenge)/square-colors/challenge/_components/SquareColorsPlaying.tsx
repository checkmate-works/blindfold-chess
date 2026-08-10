'use client';

import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME } from '@/lib/games/board-themes';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { ChallengeCountdownOverlay } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeCountdownOverlay';
import { ChallengePauseOverlay } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengePauseOverlay';
import { ChallengeQuitControl } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeQuitControl';
import { ChallengeStatusHeader } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeStatusHeader';
import { SquareColorsQuestionPanel } from '@/app/[locale]/(public)/practice/(challenge)/square-colors/_components/SquareColorsQuestionPanel';

type Props = {
  currentSquare: string;
  timeRemaining: number;
  timeLimit: number;
  showResult: boolean;
  lastAnswer: { correct: boolean; square: string } | null;
  onAnswer: (color: 'light' | 'dark') => void;
  boardTheme?: BoardTheme;
  countdown: number | null;
  correctCount: number;
  incorrectCount: number;
  isPaused: boolean;
  onTogglePause: () => void;
  remainingLives: number;
  maxLives: number;
  onQuitRequest: () => void;
  showQuitModal: boolean;
  onQuitConfirm: () => void;
  onQuitCancel: () => void;
};

export function SquareColorsPlaying({
  currentSquare,
  timeRemaining,
  timeLimit,
  showResult,
  lastAnswer,
  onAnswer,
  boardTheme = DEFAULT_BOARD_THEME,
  countdown,
  correctCount,
  incorrectCount,
  isPaused,
  onTogglePause,
  remainingLives,
  maxLives,
  onQuitRequest,
  showQuitModal,
  onQuitConfirm,
  onQuitCancel,
}: Props) {
  const inputDisabled = showResult || countdown !== null || isPaused;

  return (
    <div className="max-w-md mx-auto">
      <div className="p-8 text-center relative overflow-hidden">
        <div className="mb-6">
          <ChallengeStatusHeader
            className="flex justify-between items-center mt-2"
            remainingLives={remainingLives}
            maxLives={maxLives}
            isPaused={isPaused}
            onTogglePause={onTogglePause}
            pauseDisabled={countdown !== null || showResult}
            timeRemaining={timeRemaining}
            timeLimit={timeLimit}
          />
        </div>

        <ChallengeCountdownOverlay countdown={countdown} />
        <ChallengePauseOverlay isPaused={isPaused} onTogglePause={onTogglePause} />

        {/* Content with Blur when Paused */}
        <div
          className={`transition-all duration-300 ${isPaused ? 'blur-md grayscale opacity-50 pointer-events-none' : ''}`}
        >
          <SquareColorsQuestionPanel
            currentSquare={currentSquare}
            lastAnswer={lastAnswer}
            onAnswer={onAnswer}
            boardTheme={boardTheme}
            disabled={inputDisabled}
          />
        </div>
      </div>

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />

      <ChallengeQuitControl
        className="mt-6 text-center"
        onQuitRequest={onQuitRequest}
        showQuitModal={showQuitModal}
        onQuitConfirm={onQuitConfirm}
        onQuitCancel={onQuitCancel}
      />
    </div>
  );
}
