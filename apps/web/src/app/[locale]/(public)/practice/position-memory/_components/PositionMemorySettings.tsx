'use client';

import { useTranslations } from 'next-intl';

import type { BoardTheme } from '@/lib/boardThemes';

import { PositionMemoryCustomFenSection } from './PositionMemoryCustomFenSection';
import { PositionMemoryPresetSection } from './PositionMemoryPresetSection';

type Props = {
  timeLimit: number;
  problemCount: number;
  shuffleProblems: boolean;
  useCustomFen: boolean;
  customFenInput: string;
  customFenError: string | null;
  copyStatus: 'idle' | 'success' | 'error' | 'too_long';
  boardTheme: BoardTheme;
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
  useCustomFen,
  customFenInput,
  customFenError,
  copyStatus,
  boardTheme,
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
      {/* Problem Source */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t('problemSource')}
        </label>
        <div className="flex rounded-lg bg-secondary p-1">
          <button
            type="button"
            onClick={() => onUseCustomFenChange(false)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              !useCustomFen
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('presetProblems')}
          </button>
          <button
            type="button"
            onClick={() => onUseCustomFenChange(true)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              useCustomFen
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('enterFen')}
          </button>
        </div>
      </div>

      {!useCustomFen && (
        <PositionMemoryPresetSection
          problemCount={problemCount}
          shuffleProblems={shuffleProblems}
          timeLimit={timeLimit}
          boardTheme={boardTheme}
          onProblemCountChange={onProblemCountChange}
          onShuffleChange={onShuffleChange}
          onTimeLimitChange={onTimeLimitChange}
        />
      )}

      {useCustomFen && (
        <PositionMemoryCustomFenSection
          customFenInput={customFenInput}
          customFenError={customFenError}
          problemCount={problemCount}
          shuffleProblems={shuffleProblems}
          timeLimit={timeLimit}
          copyStatus={copyStatus}
          onCustomFenInputChange={onCustomFenInputChange}
          onProblemCountChange={onProblemCountChange}
          onShuffleChange={onShuffleChange}
          onTimeLimitChange={onTimeLimitChange}
          onCopyShareLink={onCopyShareLink}
        />
      )}
    </div>
  );
}
