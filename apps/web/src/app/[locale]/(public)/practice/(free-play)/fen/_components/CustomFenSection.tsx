'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ProblemCountAndShuffle } from './ProblemCountAndShuffle';

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

      <ProblemCountAndShuffle
        availableCount={customFenCount}
        problemCount={problemCount}
        shuffleProblems={shuffleProblems}
        onProblemCountChange={onProblemCountChange}
        onShuffleChange={onShuffleChange}
        idSuffix="Custom"
      />
    </>
  );
}
