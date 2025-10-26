'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { PrimaryButton, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { generateShareUrl } from '../_lib/utils';
import { PositionMemorySettings } from './PositionMemorySettings';

type Props = {
  locale: Locale;
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
  locale,
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
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error' | 'too_long'>('idle');

  const handleCopyShareLink = () => {
    if (!useCustomFen || !customFenInput.trim()) {
      return;
    }

    const fens = customFenInput
      .trim()
      .split('\n')
      .filter((line) => line.trim());

    const { url, isTooLong } = generateShareUrl(locale, fens, timeLimit, shuffleProblems);

    if (isTooLong) {
      setCopyStatus('too_long');
      setTimeout(() => setCopyStatus('idle'), 3000);
      return;
    }

    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopyStatus('success');
        setTimeout(() => setCopyStatus('idle'), 3000);
      })
      .catch(() => {
        setCopyStatus('error');
        setTimeout(() => setCopyStatus('idle'), 3000);
      });
  };

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
          copyStatus={copyStatus}
          onTimeLimitChange={onTimeLimitChange}
          onProblemCountChange={onProblemCountChange}
          onShuffleChange={onShuffleChange}
          onUseCustomFenChange={onUseCustomFenChange}
          onCustomFenInputChange={onCustomFenInputChange}
          onCopyShareLink={handleCopyShareLink}
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
