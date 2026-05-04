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
      <div className="mt-4 mb-6 mx-auto max-w-xs grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-2 text-sm text-left">
        <div />
        <div className="text-xs font-medium text-success uppercase tracking-wide">
          {t('correctAnswerLabel')}
        </div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t('yourAnswer')}
        </div>

        <div className="font-bold flex items-center gap-1.5">
          <span aria-hidden className="text-muted-foreground font-mono">
            ╱
          </span>
          {t('diagonalShortLabel')}
        </div>
        <div className="font-mono text-success">{correctDiagonal}</div>
        <div className={`font-mono ${isDiagonalCorrect ? 'text-success' : 'text-destructive'}`}>
          {userDiagonal}
        </div>

        <div className="font-bold flex items-center gap-1.5">
          <span aria-hidden className="text-muted-foreground font-mono">
            ╲
          </span>
          {t('antiDiagonalShortLabel')}
        </div>
        <div className="font-mono text-success">{correctAntiDiagonal}</div>
        <div className={`font-mono ${isAntiDiagonalCorrect ? 'text-success' : 'text-destructive'}`}>
          {userAntiDiagonal}
        </div>
      </div>
    </DiagonalQuizResultLayout>
  );
}
