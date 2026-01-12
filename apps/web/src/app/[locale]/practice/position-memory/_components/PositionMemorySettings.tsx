'use client';

import { useTranslations } from 'next-intl';

import { FaLink } from 'react-icons/fa';

type Props = {
  timeLimit: number;
  problemCount: number;
  shuffleProblems: boolean;
  maxProblems: number;
  useCustomFen: boolean;
  customFenInput: string;
  customFenError: string | null;
  copyStatus: 'idle' | 'success' | 'error' | 'too_long';
  onTimeLimitChange: (value: number) => void;
  onProblemCountChange: (value: number) => void;
  onShuffleChange: (value: boolean) => void;
  onUseCustomFenChange: (value: boolean) => void;
  onCustomFenInputChange: (value: string) => void;
  onCopyShareLink: () => void;
};

export function PositionMemorySettings({
  timeLimit,
  problemCount,
  shuffleProblems,
  maxProblems,
  useCustomFen,
  customFenInput,
  customFenError,
  copyStatus,
  onTimeLimitChange,
  onProblemCountChange,
  onShuffleChange,
  onUseCustomFenChange,
  onCustomFenInputChange,
  onCopyShareLink,
}: Props) {
  const t = useTranslations('practice.positionMemory');
  return (
    <div className="space-y-6">
      {/* Time Limit */}
      <div>
        <label htmlFor="timeLimit" className="block text-sm font-medium text-foreground mb-2">
          {t('timeLimit')}: {timeLimit} {t('seconds')}
        </label>
        <input
          id="timeLimit"
          type="range"
          min="5"
          max="60"
          step="5"
          value={timeLimit}
          onChange={(e) => onTimeLimitChange(parseInt(e.target.value))}
          className="w-full h-2 bg-secondary rounded-md appearance-none cursor-pointer accent-foreground"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{t('fiveSeconds')}</span>
          <span>{t('oneMinute')}</span>
        </div>
      </div>

      {/* Use Custom FEN */}
      <div className="flex items-center justify-between">
        <label htmlFor="useCustomFen" className="text-sm font-medium text-foreground">
          {t('useCustomFen')}
        </label>
        <button
          id="useCustomFen"
          type="button"
          role="switch"
          aria-checked={useCustomFen}
          onClick={() => onUseCustomFenChange(!useCustomFen)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            useCustomFen ? 'bg-foreground' : 'bg-secondary'
          }`}
        >
          <span className="sr-only">{t('useCustomFen')}</span>
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
              useCustomFen ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Custom FEN Input */}
      {useCustomFen && (
        <div>
          <label
            htmlFor="customFenInput"
            className="block text-sm font-medium text-foreground mb-2"
          >
            FEN{' '}
            {customFenInput.trim()
              ? `(${
                  customFenInput
                    .trim()
                    .split('\n')
                    .filter((line) => line.trim()).length
                })`
              : ''}
          </label>
          <textarea
            id="customFenInput"
            value={customFenInput}
            onChange={(e) => onCustomFenInputChange(e.target.value)}
            placeholder={t('customFenPlaceholder')}
            className="w-full h-32 px-3 py-2 border border-border rounded-md bg-background text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground resize-none"
            spellCheck="false"
          />
          {customFenError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{customFenError}</p>
          )}

          {/* Share Link Button */}
          {customFenInput.trim() && !customFenError && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={onCopyShareLink}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-md hover:bg-secondary/80 transition-colors"
              >
                <FaLink />
                <span>{t('copyShareLink')}</span>
              </button>
            </div>
          )}

          {/* Copy Status Messages */}
          {copyStatus === 'success' && (
            <p className="mt-2 text-sm text-green-600 dark:text-green-400">{t('linkCopied')}</p>
          )}
          {copyStatus === 'error' && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{t('copyFailed')}</p>
          )}
          {copyStatus === 'too_long' && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{t('urlTooLong')}</p>
          )}
        </div>
      )}

      {/* Problem Count */}
      {(() => {
        const customFenCount = useCustomFen
          ? customFenInput
              .trim()
              .split('\n')
              .filter((line) => line.trim()).length
          : 0;
        const effectiveMaxProblems = useCustomFen ? customFenCount : maxProblems;

        // Show problem count slider when:
        // - Not using custom FEN, OR
        // - Using custom FEN with 2+ valid FENs
        if (!useCustomFen || customFenCount >= 2) {
          return (
            <div>
              <label
                htmlFor="problemCount"
                className="block text-sm font-medium text-foreground mb-2"
              >
                {t('problemCount')}: {Math.min(problemCount, effectiveMaxProblems)}{' '}
                {Math.min(problemCount, effectiveMaxProblems) > 1 ? t('problems') : ''}
              </label>
              <input
                id="problemCount"
                type="range"
                min="1"
                max={effectiveMaxProblems}
                step="1"
                value={Math.min(problemCount, effectiveMaxProblems)}
                onChange={(e) => onProblemCountChange(parseInt(e.target.value))}
                className="w-full h-2 bg-secondary rounded-md appearance-none cursor-pointer accent-foreground"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1</span>
                <span>{effectiveMaxProblems}</span>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Shuffle Problems */}
      {((useCustomFen &&
        customFenInput
          .trim()
          .split('\n')
          .filter((line) => line.trim()).length > 1) ||
        (!useCustomFen && problemCount > 1)) && (
        <div className="flex items-center justify-between">
          <label htmlFor="shuffle" className="text-sm font-medium text-foreground">
            {t('shuffle')}
          </label>
          <button
            id="shuffle"
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
    </div>
  );
}
