import { useTranslations } from 'next-intl';

import { BoardOverlay, Button } from '@/app/_components';

import type { BoardTheme } from '@/lib/boardThemes';
import { DEFAULT_BOARD_THEME } from '@/lib/boardThemes';

import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';
import { ProgressBar } from '@/app/[locale]/(public)/practice/_components/ProgressBar';
import { QuizTimer } from '@/app/[locale]/(public)/practice/_components/QuizTimer';

import type { PositionData } from '../_lib/types';

type Props = {
  position: PositionData;
  memorizeTimeLeft: number;
  currentProblemIndex: number;
  problemCount: number;
  boardTheme?: BoardTheme;
  onMemorized: () => void;
  onSkip: () => void;
  onQuit: () => void;
  countdown: number | null;
  timeLimit: number;
};

export function PositionMemoryMemorize({
  position,
  memorizeTimeLeft,
  currentProblemIndex,
  problemCount,
  boardTheme = DEFAULT_BOARD_THEME,
  onMemorized,
  onSkip,
  onQuit,
  countdown,
  timeLimit,
}: Props) {
  const t = useTranslations('practice.positionMemory');

  // Calculate progress for QuizTimer (assuming 30s max for circle visual, or based on initial time if we had it)
  // Since memorization time is variable per user difficulty/setting, but usually short,
  // maybe we should pass initialTimeLimit?
  // For now, let's assume 30s as a baseline for the circle or just show full circle decreasing.
  // Actually, PositionMemorySession doesn't pass initial time limit to this component.
  // Let's use 30 as default max for visual progress if we don't have it, or just 100% since it's just a number.
  // But QuizTimer expects progress 0-1.
  // If we don't know the max, the circle animation is less useful.
  // However, the user request specifically asked to use QuizTimer.
  // Let's assume a default max of 30 or 15 seconds for the visual "full" circle, or just keep it 100% if unknown.
  // Wait, `memorizeTimeLeft` is what we have.
  // In `PositionMemorySession`, `timeLimit` is passed to the machine.
  // The machine initializes `memorizeTimeLeft` with `timeLimit`.
  // So we assume `memorizeTimeLeft` starts at `timeLimit`.
  // But we don't receive `timeLimit` prop here.
  // We should add `initialTimeLimit` to props if we want accurate progress.
  // For now, let's just use `memorizeTimeLeft` for the text, and maybe a static progress or estimate.
  // actually, if we want the circle to shrink, we need the total.
  // Let's check `PositionMemorySession` again. It has `timeLimit`.
  // I should pass `totalTime` to `PositionMemoryMemorize`.

  // For now, fixing the prop type error first and adding standard UI.
  // I will assume progress = 1 for now or handle it in next step if I need to change Session again.
  // RE-CHECK: `PositionMemorySession` has `timeLimit`. I can pass it.

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-md shadow-sm border border-border p-4">
        <div className="flex flex-col gap-6">
          {/* Progress */}
          {problemCount > 1 && (
            <ProgressBar current={currentProblemIndex + 1} total={problemCount} />
          )}

          {/* Timer and Status Header */}
          <div className="relative flex items-center justify-center min-h-[50px]">
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">{t('memorizing')}</p>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <QuizTimer
                timeRemaining={memorizeTimeLeft}
                progress={timeLimit > 0 ? (timeLimit - memorizeTimeLeft) / timeLimit : 0}
                size={50}
              />
            </div>
          </div>

          {/* Chess Board */}
          <div className="flex justify-center">
            <div className="w-full max-w-md relative">
              <AnimatedChessBoard
                initialFen={position.fen}
                showCoordinates={true}
                flipped={position.isBlackToMove}
                boardTheme={boardTheme}
              >
                {/* Countdown Overlay */}
                <BoardOverlay
                  isVisible={countdown !== null}
                  className="backdrop-blur-md"
                  data-testid="countdown-overlay"
                >
                  <span className="text-8xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
                    {countdown !== null && (countdown > 0 ? countdown : 'START!')}
                  </span>
                </BoardOverlay>
              </AnimatedChessBoard>
            </div>
          </div>

          {/* Memorized Button */}
          <Button
            onClick={onMemorized}
            variant="primary"
            size="lg"
            fullWidth
            disabled={countdown !== null}
          >
            {t('memorized')}
          </Button>
        </div>
      </div>

      {/* Action Links */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
        >
          {t('skip')}
        </button>
        <button
          onClick={onQuit}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
        >
          {t('quit')}
        </button>
      </div>
    </div>
  );
}
