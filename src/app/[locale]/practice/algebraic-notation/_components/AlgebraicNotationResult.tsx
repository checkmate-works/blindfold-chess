'use client';

import { useTranslations } from 'next-intl';

import { PrimaryButton } from '@/app/[locale]/_components';
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
    <>
      <div className="bg-card rounded-xl p-6 border border-border">
        <div
          className={`text-center ${
            isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          <p className="text-lg font-semibold mb-2">{isCorrect ? t('correct') : t('incorrect')}</p>
          <p className="text-sm text-muted-foreground mb-4">
            {t('correctAnswerIs')}{' '}
            <span className="font-mono font-bold">{question.correctAnswer}</span>
          </p>

          {/* Explanation */}
          <div className="text-left bg-muted/50 dark:bg-secondary rounded-lg p-4">
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
        </div>
      </div>

      <div className="flex justify-end">
        <PrimaryButton onClick={onNext} fullWidth={false}>
          {currentQuestionIndex < totalQuestions - 1 ? t('nextExercise') : t('complete')}
        </PrimaryButton>
      </div>
    </>
  );
}
