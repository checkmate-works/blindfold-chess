'use client';

import Link from 'next/link';

import { BoardOverlay, Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { BoardTheme } from '@/lib/boardThemes';
import { DEFAULT_BOARD_THEME } from '@/lib/boardThemes';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SquareColorAnswerButtons } from '../../_components/SquareColorAnswerButtons';
import { SquareColorQuestionDisplay } from '../../_components/SquareColorQuestionDisplay';

type Props = {
  currentSquare: string;
  showResult: boolean;
  lastAnswer: { correct: boolean; square: string } | null;
  onAnswer: (color: 'light' | 'dark') => void;
  boardTheme?: BoardTheme;
  countdown: number | null;
  correctCount: number;
  incorrectCount: number;
  onEndTraining: () => void;
  locale: Locale;
};

export function SquareColorsTrainingPlaying({
  currentSquare,
  showResult,
  lastAnswer,
  onAnswer,
  boardTheme = DEFAULT_BOARD_THEME,
  countdown,
  correctCount,
  incorrectCount,
  onEndTraining,
  locale,
}: Props) {
  const t = useTranslations('practice.squareColors');
  const tp = useTranslations('practice');

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-card rounded-xl border border-border p-8 text-center relative overflow-hidden shadow-sm">
        {/* Countdown Overlay */}
        <BoardOverlay isVisible={countdown !== null} className="backdrop-blur-md">
          <span className="text-8xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
            {countdown !== null && (countdown > 0 ? countdown : 'START!')}
          </span>
        </BoardOverlay>

        <div>
          <SquareColorQuestionDisplay currentSquare={currentSquare} lastAnswer={lastAnswer} />

          <SquareColorAnswerButtons
            onAnswer={onAnswer}
            disabled={showResult || countdown !== null}
            labels={{ white: t('white'), black: t('black') }}
            boardTheme={boardTheme}
          />
        </div>
      </div>

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />

      <div className="mt-6 text-center">
        <button
          onClick={onEndTraining}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {tp('endTraining')}
        </button>
      </div>

      <hr className="border-border mt-8" />

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">{tp('trainingModeActive')}</p>
        <p className="mt-2 text-base font-medium text-foreground">{tp('readyForChallenge')}</p>
        <div className="mt-4">
          <Link href={`/${locale}/practice/square-colors/challenge/session`}>
            <Button asChild variant="primary" size="lg" className="w-full">
              {tp('goToChallenge')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
