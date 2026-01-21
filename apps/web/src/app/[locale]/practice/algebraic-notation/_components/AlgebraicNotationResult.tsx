'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { Question } from '../_lib/types';

type Props = {
  selectedAnswer: string;
  question: Question;
  currentQuestionIndex: number;
  totalQuestions: number;
  onNext: () => void;
  locale: Locale;
};

export function AlgebraicNotationResult({
  selectedAnswer,
  question,
  currentQuestionIndex,
  totalQuestions,
  onNext,
  locale,
}: Props) {
  const t = useTranslations('practice.algebraicNotation');
  const isCorrect = selectedAnswer === question.correctAnswer;

  return (
    <div className="flex flex-col gap-6">
      {/* Result */}
      <div
        className={`text-center ${
          isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        }`}
      >
        <p className="text-lg font-semibold mb-2">{isCorrect ? t('correct') : t('incorrect')}</p>
        <p className="text-sm text-muted-foreground">
          {t('correctAnswerIs')}{' '}
          <span className="font-mono font-bold">{question.correctAnswer}</span>
        </p>
      </div>

      {/* Explanation */}
      <div className="bg-muted/50 dark:bg-secondary rounded-md p-4">
        <h4 className="text-sm font-medium text-foreground mb-3">{t('explanation')}</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          {question.explanation[locale].map((point, index) => (
            <li key={index} className="flex items-start">
              <span className="text-muted-foreground mr-2">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Next Button */}
      <Button onClick={onNext} variant="primary" size="lg" fullWidth>
        {currentQuestionIndex < totalQuestions - 1 ? t('nextExercise') : t('complete')}
      </Button>
    </div>
  );
}
