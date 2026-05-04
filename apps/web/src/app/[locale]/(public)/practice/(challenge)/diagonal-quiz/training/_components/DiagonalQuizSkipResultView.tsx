'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { DiagonalQuizResultLayout } from './DiagonalQuizResultLayout';

type Props = {
  question: string;
  correctDiagonal: string;
  correctAntiDiagonal: string;
  correctCount: number;
  incorrectCount: number;
  onNextAfterSkip: () => void;
  onEndTraining: () => void;
};

export function DiagonalQuizSkipResultView({
  question,
  correctDiagonal,
  correctAntiDiagonal,
  correctCount,
  incorrectCount,
  onNextAfterSkip,
  onEndTraining,
}: Props) {
  const t = useTranslations('practice.diagonalQuiz');

  return (
    <DiagonalQuizResultLayout
      question={question}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
      onNext={onNextAfterSkip}
      onEndTraining={onEndTraining}
    >
      <p className="text-sm text-muted-foreground">
        {t('correctAnswer', {
          diagonal: correctDiagonal,
          antiDiagonal: correctAntiDiagonal,
        })}
      </p>
    </DiagonalQuizResultLayout>
  );
}
