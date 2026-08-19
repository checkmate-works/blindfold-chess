'use client';

import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME } from '@/lib/games/board-themes';

import { TrainingFooter } from '@/app/[locale]/(public)/practice/(challenge)/_components/TrainingFooter';
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

      <TrainingFooter
        correct={correctCount}
        incorrect={incorrectCount}
        onEndTraining={onEndTraining}
        challengeHref={`/${locale}/practice/square-colors/challenge/session`}
      />
    </div>
  );
}
