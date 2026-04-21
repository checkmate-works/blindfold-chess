'use client';

import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME } from '@/lib/games/board-themes';

import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { Question } from '../_lib/types';

type Props = {
  question: Question;
  currentQuestionIndex: number;
  selectedAnswer: string;
  showResult: boolean;
  boardTheme?: BoardTheme;
  onOptionSelect: (option: string) => void;
  locale: Locale;
};

export function AlgebraicNotationPlaying({
  question,
  currentQuestionIndex,
  selectedAnswer,
  showResult,
  boardTheme = DEFAULT_BOARD_THEME,
  onOptionSelect,
  locale,
}: Props) {
  return (
    <div className="flex flex-col gap-6">
      {/* Question Description (fall back to English when no translation for this locale) */}
      <p className="text-lg text-muted-foreground">
        {question.description[locale] ?? question.description.en}
      </p>

      {/* Chess Board */}
      <div className="flex justify-center">
        <div className="w-full max-w-md">
          <AnimatedChessBoard
            key={`question-${currentQuestionIndex}`}
            initialFen={question.fenBefore}
            move={question.move}
            showCoordinates={true}
            animationDuration={800}
            boardTheme={boardTheme}
            className="w-full"
          />
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option) => (
          <button
            key={option}
            onClick={() => !showResult && onOptionSelect(option)}
            disabled={showResult}
            className={`
              w-full text-left p-3 rounded-md transition-colors font-mono text-lg font-medium
              ${
                showResult
                  ? selectedAnswer === option
                    ? option === question.correctAnswer
                      ? 'bg-success/10 border-success border-2'
                      : 'bg-destructive/10 border-destructive border-2'
                    : option === question.correctAnswer
                      ? 'bg-success/5 border-success/50 border'
                      : 'bg-secondary border-border border'
                  : selectedAnswer === option
                    ? 'bg-primary/10 border-primary border-2'
                    : 'bg-secondary border-border border hover:bg-secondary/80 cursor-pointer'
              }
            `}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
