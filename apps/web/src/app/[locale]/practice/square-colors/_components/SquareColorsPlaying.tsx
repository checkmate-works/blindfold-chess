'use client';

import { useTranslations } from 'next-intl';

import type { BoardTheme } from '@/lib/boardThemes';
import { getBoardThemeColors } from '@/lib/boardThemes';

import { SectionTitle } from '@/app/[locale]/_components';
import { TimeDisplay } from '@/app/[locale]/practice/_components/TimeDisplay';

type Props = {
  currentSquare: string;
  timeRemaining: number;
  timeLimit: number;
  showResult: boolean;
  lastAnswer: { correct: boolean; square: string } | null;
  onAnswer: (color: 'light' | 'dark') => void;
  boardTheme?: BoardTheme;
};

export function SquareColorsPlaying({
  currentSquare,
  timeRemaining,
  timeLimit,
  showResult,
  lastAnswer,
  onAnswer,
  boardTheme = 'default',
}: Props) {
  const t = useTranslations('practice.squareColors');
  const timeElapsed = timeLimit - timeRemaining;
  const themeColors = getBoardThemeColors(boardTheme);

  return (
    <div>
      {/* Timer display */}
      <TimeDisplay
        timeRemaining={timeRemaining}
        timeLimit={timeLimit}
        timeElapsed={timeElapsed}
        labels={{
          timeRemaining: t('timeRemaining'),
        }}
      />

      <div className="bg-card rounded-xl border border-border p-8 text-center">
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
            disabled={showResult}
            className={`aspect-square rounded-md border border-border ${themeColors.light} ${themeColors.lightCoordinates} hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center justify-center`}
          >
            <span className="text-lg font-bold">{t('white')}</span>
          </button>

          {/* Dark square button */}
          <button
            onClick={() => onAnswer('dark')}
            disabled={showResult}
            className={`aspect-square rounded-md border border-border ${themeColors.dark} ${themeColors.darkCoordinates} hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center justify-center`}
          >
            <span className="text-lg font-bold">{t('black')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
