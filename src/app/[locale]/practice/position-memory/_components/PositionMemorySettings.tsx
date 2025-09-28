'use client';

import type { Locale } from '../../../_lib/types';

interface PositionMemorySettingsProps {
  timeLimit: number;
  problemCount: number;
  shuffleProblems: boolean;
  maxProblems: number;
  useCustomFen: boolean;
  customFenInput: string;
  customFenError: string | null;
  locale: Locale;
  onTimeLimitChange: (value: number) => void;
  onProblemCountChange: (value: number) => void;
  onShuffleChange: (value: boolean) => void;
  onUseCustomFenChange: (value: boolean) => void;
  onCustomFenInputChange: (value: string) => void;
  translations: {
    timeLimit: string;
    seconds: string;
    problemCount: string;
    problems: string;
    shuffle: string;
    useCustomFen: string;
    customFenPlaceholder: string;
    customFenError: string;
  };
}

export function PositionMemorySettings({
  timeLimit,
  problemCount,
  shuffleProblems,
  maxProblems,
  useCustomFen,
  customFenInput,
  customFenError,
  locale,
  onTimeLimitChange,
  onProblemCountChange,
  onShuffleChange,
  onUseCustomFenChange,
  onCustomFenInputChange,
  translations,
}: PositionMemorySettingsProps) {
  return (
    <div className="space-y-6">
      {/* Time Limit */}
      <div>
        <label htmlFor="timeLimit" className="block text-sm font-medium text-foreground mb-2">
          {translations.timeLimit}: {timeLimit} {translations.seconds}
        </label>
        <input
          id="timeLimit"
          type="range"
          min="5"
          max="60"
          step="5"
          value={timeLimit}
          onChange={(e) => onTimeLimitChange(parseInt(e.target.value))}
          className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-foreground"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{locale === 'ja' ? '5秒' : '5s'}</span>
          <span>{locale === 'ja' ? '1分' : '60s'}</span>
        </div>
      </div>

      {/* Use Custom FEN */}
      <div className="flex items-center justify-between">
        <label htmlFor="useCustomFen" className="text-sm font-medium text-foreground">
          {translations.useCustomFen}
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
          <span className="sr-only">{translations.useCustomFen}</span>
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
            placeholder={translations.customFenPlaceholder}
            className="w-full h-32 px-3 py-2 border border-border rounded-lg bg-background text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground resize-none"
            spellCheck="false"
          />
          {customFenError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{customFenError}</p>
          )}
        </div>
      )}

      {/* Problem Count - only show if not using custom FEN */}
      {!useCustomFen && (
        <div>
          <label htmlFor="problemCount" className="block text-sm font-medium text-foreground mb-2">
            {translations.problemCount}: {problemCount}{' '}
            {problemCount > 1 ? translations.problems : ''}
          </label>
          <input
            id="problemCount"
            type="range"
            min="1"
            max={maxProblems}
            step="1"
            value={problemCount}
            onChange={(e) => onProblemCountChange(parseInt(e.target.value))}
            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-foreground"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1</span>
            <span>{maxProblems}</span>
          </div>
        </div>
      )}

      {/* Shuffle Problems */}
      {problemCount > 1 && (
        <div className="flex items-center justify-between">
          <label htmlFor="shuffle" className="text-sm font-medium text-foreground">
            {translations.shuffle}
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
            <span className="sr-only">{translations.shuffle}</span>
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
