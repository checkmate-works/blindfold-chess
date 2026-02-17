'use client';

import { useTranslations } from 'next-intl';

import { BoardOverlay } from '@/app/_components';
import { QuizTimer } from '@/components/QuizTimer';
import { LuPause, LuPlay } from 'react-icons/lu';

import type { BoardTheme } from '@/lib/boardThemes';
import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/boardThemes';

import { ScoreCounter } from '@/app/[locale]/practice/_components/ScoreCounter';

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
}: Props) {
  const t = useTranslations('practice.squareColors');
  const tPractice = useTranslations('practice');
  const timeElapsed = timeLimit - timeRemaining;
  const themeColors = getBoardThemeColors(boardTheme);

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-card rounded-xl border border-border p-8 text-center relative overflow-hidden shadow-sm">
        {/* Header and Timer */}
        <div className="mb-6">
          <div className="flex justify-end mt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={onTogglePause}
                disabled={countdown !== null || showResult}
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
                size={32}
                fontSize="text-[10px]"
                strokeWidth={3}
              />
            </div>
          </div>
        </div>

        {/* Countdown Overlay */}
        <BoardOverlay isVisible={countdown !== null} className="backdrop-blur-md">
          <span className="text-8xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
            {countdown !== null && (countdown > 0 ? countdown : 'START!')}
          </span>
        </BoardOverlay>

        {/* Pause Overlay with Play Button */}
        <BoardOverlay isVisible={isPaused} className="backdrop-blur-sm bg-black/40">
          <button
            onClick={onTogglePause}
            className="bg-white/90 hover:bg-white text-gray-900 rounded-full p-6 shadow-lg transition-all hover:scale-110 active:scale-95 pointer-events-auto"
            aria-label={tPractice('resume')}
          >
            <LuPlay size={48} className="fill-current ml-1" />
          </button>
        </BoardOverlay>

        {/* Content with Blur when Paused */}
        <div
          className={`transition-all duration-300 ${isPaused ? 'blur-md grayscale opacity-50 pointer-events-none' : ''}`}
        >
          <div className="mb-8">
            <div
              className={`text-6xl font-bold mb-4 transition-colors duration-200 ${
                lastAnswer
                  ? lastAnswer.correct
                    ? 'text-green-500'
                    : 'text-red-500'
                  : 'text-foreground'
              }`}
            >
              {currentSquare}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
            {/* Light square button */}
            <button
              onClick={() => onAnswer('light')}
              disabled={showResult || countdown !== null || isPaused}
              className={`aspect-square rounded-md border border-border ${themeColors.light} ${themeColors.lightCoordinates} hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center justify-center`}
            >
              <span className="text-lg font-bold">{t('white')}</span>
            </button>

            {/* Dark square button */}
            <button
              onClick={() => onAnswer('dark')}
              disabled={showResult || countdown !== null || isPaused}
              className={`aspect-square rounded-md border border-border ${themeColors.dark} ${themeColors.darkCoordinates} hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center justify-center`}
            >
              <span className="text-lg font-bold">{t('black')}</span>
            </button>
          </div>
        </div>
      </div>

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />
    </div>
  );
}
