'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME } from '@/lib/games/board-themes';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { TrainingChallengeCTA } from '@/app/[locale]/(public)/practice/(challenge)/_components/TrainingChallengeCTA';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SquareColorsQuestionPanel } from '../../_components/SquareColorsQuestionPanel';

type Props = {
  currentSquare: string;
  showResult: boolean;
  lastAnswer: { correct: boolean; square: string } | null;
  onAnswer: (color: 'light' | 'dark') => void;
  boardTheme?: BoardTheme;
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
  correctCount,
  incorrectCount,
  onEndTraining,
  locale,
}: Props) {
  const tp = useTranslations('practice');
  const inputDisabled = showResult;

  return (
    <div className="max-w-md mx-auto">
      <div className="p-8 text-center relative overflow-hidden">
        <div>
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

      <div className="mt-6 text-center">
        <button
          onClick={onEndTraining}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {tp('endTraining')}
        </button>
      </div>

      <TrainingChallengeCTA challengeHref={`/${locale}/practice/square-colors/challenge/session`} />
    </div>
  );
}
