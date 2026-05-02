import { BoardOverlay, Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { LuPause, LuPlay } from 'react-icons/lu';

import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME } from '@/lib/games/board-themes';

import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';
import { PiecesInfo } from '@/app/[locale]/(public)/practice/_components/PiecesInfo';
import { ProgressBar } from '@/app/[locale]/(public)/practice/_components/ProgressBar';
import { QuizTimer } from '@/app/[locale]/(public)/practice/_components/QuizTimer';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';

import type { DisplayMode } from '../../_lib/session-config';
import type { PositionData } from '../../_lib/types';

type Props = {
  position: PositionData;
  memorizeTimeLeft: number;
  currentProblemIndex: number;
  problemCount: number;
  boardTheme?: BoardTheme;
  displayMode?: DisplayMode;
  onMemorized: () => void;
  onSkip: () => void;
  onQuit: () => void;
  countdown: number | null;
  timeLimit: number;
  isPaused?: boolean;
  onTogglePause?: () => void;
  showSkip?: boolean;
};

export function PositionMemoryMemorize({
  position,
  memorizeTimeLeft,
  currentProblemIndex,
  problemCount,
  boardTheme = DEFAULT_BOARD_THEME,
  displayMode = 'board',
  onMemorized,
  onSkip,
  onQuit,
  countdown,
  timeLimit,
  isPaused = false,
  onTogglePause,
  showSkip = true,
}: Props) {
  const t = useTranslations('practice.positionMemory');
  const tPractice = useTranslations('practice');

  return (
    <div className="space-y-4">
      <div className="p-4">
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
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {onTogglePause && (
                <button
                  onClick={onTogglePause}
                  disabled={countdown !== null}
                  className="p-1 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
                  aria-label={isPaused ? tPractice('resume') : tPractice('pause')}
                >
                  {isPaused ? (
                    <LuPlay size={18} className="fill-current" />
                  ) : (
                    <LuPause size={18} className="fill-current" />
                  )}
                </button>
              )}
              <QuizTimer
                timeRemaining={memorizeTimeLeft}
                progress={timeLimit > 0 ? (timeLimit - memorizeTimeLeft) / timeLimit : 0}
                size={50}
              />
            </div>
          </div>

          {/* Position Display (board or character list) */}
          <div className="flex justify-center">
            <div className="w-full max-w-md relative">
              {displayMode === 'text' ? (
                <PiecesInfo fen={position.fen} />
              ) : (
                <AnimatedChessBoard
                  initialFen={position.fen}
                  showCoordinates={true}
                  flipped={position.isBlackToMove}
                  boardTheme={boardTheme}
                />
              )}

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

              {/* Pause Overlay */}
              <BoardOverlay isVisible={isPaused} className="backdrop-blur-sm bg-black/40 z-50">
                {onTogglePause && (
                  <button
                    onClick={onTogglePause}
                    className="bg-white/90 hover:bg-white text-foreground rounded-full p-6 transition-all hover:scale-110 active:scale-95 pointer-events-auto touch-manipulation select-none"
                    aria-label={tPractice('resume')}
                  >
                    <LuPlay size={48} className="fill-current ml-1" />
                  </button>
                )}
              </BoardOverlay>
            </div>
          </div>

          {/* Memorized Button */}
          <Button
            onClick={onMemorized}
            variant="primary"
            size="lg"
            fullWidth
            disabled={countdown !== null || isPaused}
          >
            {t('memorized')}
          </Button>
        </div>
      </div>

      {/* Action Links */}
      <div className="flex flex-col items-center gap-2">
        {showSkip && (
          <button onClick={onSkip} className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
            {t('skip')}
          </button>
        )}
        <button onClick={onQuit} className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
          {t('quit')}
        </button>
      </div>
    </div>
  );
}
