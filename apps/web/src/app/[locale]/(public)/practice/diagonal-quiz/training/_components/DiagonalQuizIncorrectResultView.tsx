'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { normalizeDiagonal } from '@blindfold-chess/features/diagonal-quiz';

import { DiagonalQuizResultLayout } from './DiagonalQuizResultLayout';

type Props = {
  question: string;
  correctDiagonal: string;
  correctAntiDiagonal: string;
  userDiagonal: string;
  userAntiDiagonal: string;
  correctCount: number;
  incorrectCount: number;
  onNextAfterIncorrect: () => void;
  onEndTraining: () => void;
};

export function DiagonalQuizIncorrectResultView({
  question,
  correctDiagonal,
  correctAntiDiagonal,
  userDiagonal,
  userAntiDiagonal,
  correctCount,
  incorrectCount,
  onNextAfterIncorrect,
  onEndTraining,
}: Props) {
  const t = useTranslations('practice.diagonalQuiz');

  const isDiagonalCorrect = normalizeDiagonal(userDiagonal) === normalizeDiagonal(correctDiagonal);
  const isAntiDiagonalCorrect =
    normalizeDiagonal(userAntiDiagonal) === normalizeDiagonal(correctAntiDiagonal);

  return (
    <DiagonalQuizResultLayout
      question={question}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
      onNext={onNextAfterIncorrect}
      onEndTraining={onEndTraining}
    >
      <div className="mt-4 mb-6 space-y-3 text-sm">
        <div>
          <p className="font-bold text-muted-foreground mb-1">{t('diagonalLabel')}</p>
          <p className="text-muted-foreground">
            <span className="font-medium">{t('correctAnswerLabel')}:</span> {correctDiagonal}
          </p>
          <p className={isDiagonalCorrect ? 'text-success' : 'text-destructive'}>
            <span className="font-medium">{t('yourAnswer')}:</span> {userDiagonal}
          </p>
        </div>
        <div>
          <p className="font-bold text-muted-foreground mb-1">{t('antiDiagonalLabel')}</p>
          <p className="text-muted-foreground">
            <span className="font-medium">{t('correctAnswerLabel')}:</span> {correctAntiDiagonal}
          </p>
          <p className={isAntiDiagonalCorrect ? 'text-success' : 'text-destructive'}>
            <span className="font-medium">{t('yourAnswer')}:</span> {userAntiDiagonal}
          </p>
        </div>
      </div>
    </DiagonalQuizResultLayout>
  );
}
