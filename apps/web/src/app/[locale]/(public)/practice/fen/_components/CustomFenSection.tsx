'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

type Props = {
  customFenInput: string;
  customFenError: string | null;
  customFenCount: number;
  problemCount: number;
  shuffleProblems: boolean;
  onCustomFenInputChange: (value: string) => void;
  onProblemCountChange: (value: number) => void;
  onShuffleChange: (value: boolean) => void;
};

export function CustomFenSection({
  customFenInput,
  customFenError,
  customFenCount,
  problemCount,
  shuffleProblems,
  onCustomFenInputChange,
  onProblemCountChange,
  onShuffleChange,
}: Props) {
  const t = useTranslations('practice.fen');

  return (
    <>
      {/* Custom FEN Input */}
      <div>
        <label htmlFor="customFenInput" className="block text-sm text-foreground mb-2">
          {t('customFenDescription')}
        </label>
        <textarea
          id="customFenInput"
          value={customFenInput}
          onChange={(e) => onCustomFenInputChange(e.target.value)}
          placeholder={t('customFenPlaceholder')}
          className="w-full h-32 px-3 py-2 border border-border rounded-md bg-background text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground resize-none"
          spellCheck="false"
        />
        {customFenError && <p className="mt-2 text-sm text-destructive">{customFenError}</p>}
      </div>

      {/* Problem Count (for custom FEN mode) */}
      {customFenCount >= 2 && (
        <div>
          <label
            htmlFor="problemCountCustom"
            className="block text-sm font-medium text-foreground mb-2"
          >
            {t('problemCount')}: {Math.min(problemCount, customFenCount)}{' '}
            {Math.min(problemCount, customFenCount) > 1 ? t('problems') : ''}
          </label>
          <input
            id="problemCountCustom"
            type="range"
            min="1"
            max={customFenCount}
            step="1"
            value={Math.min(problemCount, customFenCount)}
            onChange={(e) => onProblemCountChange(parseInt(e.target.value))}
            className="w-full h-2 bg-secondary rounded-md appearance-none cursor-pointer accent-foreground"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1</span>
            <span>{customFenCount}</span>
          </div>
        </div>
      )}

      {/* Shuffle Problems (for custom FEN mode) */}
      {customFenCount > 1 && (
        <div className="flex items-center justify-end gap-3">
          <label htmlFor="shuffleCustom" className="text-sm text-muted-foreground">
            {t('shuffle')}
          </label>
          <button
            id="shuffleCustom"
            type="button"
            role="switch"
            aria-checked={shuffleProblems}
            onClick={() => onShuffleChange(!shuffleProblems)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              shuffleProblems ? 'bg-foreground' : 'bg-secondary'
            }`}
          >
            <span className="sr-only">{t('shuffle')}</span>
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                shuffleProblems ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      )}
    </>
  );
}
