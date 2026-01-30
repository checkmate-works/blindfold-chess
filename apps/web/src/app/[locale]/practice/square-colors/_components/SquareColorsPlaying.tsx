'use client';

import { useTranslations } from 'next-intl';

import { BoardOverlay } from '@/app/_components';
import { QuizTimer } from '@/components/QuizTimer';

import type { BoardTheme } from '@/lib/boardThemes';
import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/boardThemes';

import { SectionTitle } from '@/app/[locale]/_components';

type Props = {
  currentSquare: string;
  timeRemaining: number;
  timeLimit: number;
  showResult: boolean;
  lastAnswer: { correct: boolean; square: string } | null;
  onAnswer: (color: 'light' | 'dark') => void;
  boardTheme?: BoardTheme;
  countdown: number | null;
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
}: Props) {
  const t = useTranslations('practice.squareColors');
  const timeElapsed = timeLimit - timeRemaining;
  const themeColors = getBoardThemeColors(boardTheme);

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

        <SectionTitle className="mb-8">{t('question', { square: currentSquare })}</SectionTitle>

        <div className="mb-8">
          <div className="text-6xl font-bold text-foreground mb-4">{currentSquare}</div>

          {showResult && lastAnswer && (
            <div
              className={`text-lg font-medium ${
                lastAnswer.correct
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {lastAnswer.correct ? t('correct') : t('incorrect')}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
          {/* Light square button */}
          <button
            onClick={() => onAnswer('light')}
            disabled={showResult || countdown !== null}
            className={`aspect-square rounded-md border border-border ${themeColors.light} ${themeColors.lightCoordinates} hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center justify-center`}
          >
            <span className="text-lg font-bold">{t('white')}</span>
          </button>

          {/* Dark square button */}
          <button
            onClick={() => onAnswer('dark')}
            disabled={showResult || countdown !== null}
            className={`aspect-square rounded-md border border-border ${themeColors.dark} ${themeColors.darkCoordinates} hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center justify-center`}
          >
            <span className="text-lg font-bold">{t('black')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
