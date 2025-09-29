'use client';

import { useTranslations } from 'next-intl';
import { SectionTitle, PrimaryButton } from '@/app/[locale]/_components';
import { PositionMemorySettings } from './PositionMemorySettings';

type Props = {
  timeLimit: number;
  problemCount: number;
  shuffleProblems: boolean;
  maxProblems: number;
  useCustomFen: boolean;
  customFenInput: string;
  customFenError: string | null;
  onTimeLimitChange: (value: number) => void;
  onProblemCountChange: (value: number) => void;
  onShuffleChange: (value: boolean) => void;
  onUseCustomFenChange: (value: boolean) => void;
  onCustomFenInputChange: (value: string) => void;
  onStart: () => void;
};

export function PositionMemorySetup({
  timeLimit,
  problemCount,
  shuffleProblems,
  maxProblems,
  useCustomFen,
  customFenInput,
  customFenError,
  onTimeLimitChange,
  onProblemCountChange,
  onShuffleChange,
  onUseCustomFenChange,
  onCustomFenInputChange,
  onStart,
}: Props) {
  const t = useTranslations('practice.positionMemory');
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mb-8">
        <SectionTitle className="text-xl mb-4">{t('settings')}</SectionTitle>

        <PositionMemorySettings
          timeLimit={timeLimit}
          problemCount={problemCount}
          shuffleProblems={shuffleProblems}
          maxProblems={maxProblems}
          useCustomFen={useCustomFen}
          customFenInput={customFenInput}
          customFenError={customFenError}
          onTimeLimitChange={onTimeLimitChange}
          onProblemCountChange={onProblemCountChange}
          onShuffleChange={onShuffleChange}
          onUseCustomFenChange={onUseCustomFenChange}
          onCustomFenInputChange={onCustomFenInputChange}
        />

        <PrimaryButton
          onClick={onStart}
          disabled={useCustomFen && (customFenError !== null || !customFenInput.trim())}
          className="mt-6"
        >
          {t('start')}
        </PrimaryButton>
      </div>
    </div>
  );
}
