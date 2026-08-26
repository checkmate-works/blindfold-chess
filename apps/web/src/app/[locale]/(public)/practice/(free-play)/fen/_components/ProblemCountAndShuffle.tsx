'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import {
  toggleKnobClass,
  toggleTrackClass,
} from '@/app/[locale]/_components/toggle-switch-classes';

type Props = {
  availableCount: number;
  problemCount: number;
  shuffleProblems: boolean;
  onProblemCountChange: (value: number) => void;
  onShuffleChange: (value: boolean) => void;
  idSuffix?: string;
};

export function ProblemCountAndShuffle({
  availableCount,
  problemCount,
  shuffleProblems,
  onProblemCountChange,
  onShuffleChange,
  idSuffix = '',
}: Props) {
  const t = useTranslations('practice.fen');
  const selectedCount = Math.min(problemCount, availableCount);
  const canShuffle = selectedCount > 1;

  return (
    <>
      {availableCount >= 2 && (
        <div>
          <label
            htmlFor={`problemCount${idSuffix}`}
            className="block text-sm font-medium text-foreground mb-2"
          >
            {t('problemCount')}: {selectedCount} {selectedCount > 1 ? t('problems') : ''}
          </label>
          <input
            id={`problemCount${idSuffix}`}
            type="range"
            min="1"
            max={availableCount}
            step="1"
            value={selectedCount}
            onChange={(e) => onProblemCountChange(parseInt(e.target.value))}
            className="w-full h-2 bg-secondary rounded-md appearance-none cursor-pointer accent-foreground"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1</span>
            <span>{availableCount}</span>
          </div>
        </div>
      )}

      {canShuffle && (
        <div className="flex items-center justify-end gap-3">
          <label htmlFor={`shuffle${idSuffix}`} className="text-sm text-muted-foreground">
            {t('shuffle')}
          </label>
          <button
            id={`shuffle${idSuffix}`}
            type="button"
            role="switch"
            aria-checked={shuffleProblems}
            onClick={() => onShuffleChange(!shuffleProblems)}
            className={toggleTrackClass('control', shuffleProblems)}
          >
            <span className="sr-only">{t('shuffle')}</span>
            <span className={toggleKnobClass('control', shuffleProblems)} />
          </button>
        </div>
      )}
    </>
  );
}
