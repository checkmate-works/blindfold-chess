'use client';

import { useTranslations } from 'next-intl';

import type { BoardTheme } from '@/lib/boardThemes';

import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';
import { AnimatedChessBoard } from '@/app/[locale]/practice/_components/AnimatedChessBoard';

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
  boardTheme = 'default',
  onOptionSelect,
  locale,
}: Props) {
  const t = useTranslations('practice.algebraicNotation');
  return (
    <div>
      <SectionTitle className="text-xl mb-4">{t('question')}</SectionTitle>
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="mb-6">
          <p className="text-lg mb-4">{question.description[locale]}</p>
        </div>

        {/* Chess Board */}
        <div className="mb-6 flex justify-center">
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

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option) => (
            <button
              key={option}
              onClick={() => !showResult && onOptionSelect(option)}
              disabled={showResult}
              className={`
                w-full text-left p-3 rounded-lg transition-colors font-mono text-lg font-medium
                ${
                  showResult
                    ? selectedAnswer === option
                      ? option === question.correctAnswer
                        ? 'bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-600 border-2'
                        : 'bg-red-100 dark:bg-red-900/30 border-red-500 dark:border-red-600 border-2'
                      : option === question.correctAnswer
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 border'
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
    </div>
  );
}
