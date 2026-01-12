'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';

import { SectionTitle } from '@/app/[locale]/_components';
import { TimeDisplay } from '@/app/[locale]/practice/_components/TimeDisplay';

type Props = {
  currentSquare: string;
  timeRemaining: number;
  timeLimit: number;
  showResult: boolean;
  lastAnswer: { correct: boolean; square: string } | null;
  onAnswer: (color: 'light' | 'dark') => void;
};

export function SquareColorsPlaying({
  currentSquare,
  timeRemaining,
  timeLimit,
  showResult,
  lastAnswer,
  onAnswer,
}: Props) {
  const t = useTranslations('practice.squareColors');
  const timeElapsed = timeLimit - timeRemaining;

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

        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => onAnswer('light')}
            disabled={showResult}
            size="lg"
            className="bg-gray-100 dark:bg-gray-200 hover:bg-gray-200 dark:hover:bg-gray-300 text-gray-900 dark:text-gray-900 py-4 text-lg"
          >
            {t('white')}
          </Button>
          <Button
            onClick={() => onAnswer('dark')}
            disabled={showResult}
            size="lg"
            className="bg-gray-800 dark:bg-gray-900 hover:bg-gray-700 dark:hover:bg-gray-800 text-white py-4 text-lg"
          >
            {t('black')}
          </Button>
        </div>
      </div>
    </div>
  );
}
