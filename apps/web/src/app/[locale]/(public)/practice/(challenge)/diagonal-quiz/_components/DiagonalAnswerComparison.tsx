'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

type Props = {
  correctDiagonal: string;
  correctAntiDiagonal: string;
  userDiagonal?: string;
  userAntiDiagonal?: string;
  isDiagonalCorrect: boolean;
  isAntiDiagonalCorrect: boolean;
};

export function DiagonalAnswerComparison({
  correctDiagonal,
  correctAntiDiagonal,
  userDiagonal,
  userAntiDiagonal,
  isDiagonalCorrect,
  isAntiDiagonalCorrect,
}: Props) {
  const t = useTranslations('practice.diagonalQuiz');

  return (
    <div className="mx-auto max-w-xs grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-2 text-sm text-left">
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
      <div
        className={`font-mono ${userDiagonal ? (isDiagonalCorrect ? 'text-success' : 'text-destructive') : 'text-muted-foreground'}`}
      >
        {userDiagonal || '—'}
      </div>

      <div className="font-bold flex items-center gap-1.5">
        <span aria-hidden className="text-muted-foreground font-mono">
          ╲
        </span>
        {t('antiDiagonalShortLabel')}
      </div>
      <div className="font-mono text-success">{correctAntiDiagonal}</div>
      <div
        className={`font-mono ${userAntiDiagonal ? (isAntiDiagonalCorrect ? 'text-success' : 'text-destructive') : 'text-muted-foreground'}`}
      >
        {userAntiDiagonal || '—'}
      </div>
    </div>
  );
}
