'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { PrimaryButton, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { encodeFensToBase64, generateShareUrl, validateFEN } from '../_lib/utils';
import { PositionMemorySettings } from './PositionMemorySettings';

type Props = {
  locale: Locale;
  urlError?: string | null;
  urlFens?: string[] | null;
  urlTimeLimit?: number | null;
  urlShuffle?: boolean | null;
  maxProblems: number;
};

export function PositionMemorySetup({
  locale,
  urlError,
  urlFens,
  urlTimeLimit,
  urlShuffle,
  maxProblems,
}: Props) {
  const t = useTranslations('practice.positionMemory');
  const router = useRouter();

  // Game settings
  const [timeLimit, setTimeLimit] = useState(10);
  const [problemCount, setProblemCount] = useState(1);
  const [shuffleProblems, setShuffleProblems] = useState(true);
  const [useCustomFen, setUseCustomFen] = useState(false);
  const [customFenInput, setCustomFenInput] = useState('');
  const [customFenError, setCustomFenError] = useState<string | null>(null);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error' | 'too_long'>('idle');

  // Load saved settings from localStorage or URL params
  useEffect(() => {
    // URL params take priority over localStorage
    if (urlFens) {
      setUseCustomFen(true);
      setCustomFenInput(urlFens.join('\n'));
      setTimeLimit(urlTimeLimit ?? 10);
      setShuffleProblems(urlShuffle ?? true);
      setHasLoadedSettings(true);
      return;
    }

    // Handle URL errors
    if (urlError) {
      setCustomFenError(urlError);
      setHasLoadedSettings(true);
      return;
    }

    // Load from localStorage if no URL params
    const savedSettings = localStorage.getItem('positionMemorySettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setTimeLimit(settings.timeLimit ?? 10);
        setProblemCount(settings.problemCount ?? 1);
        setShuffleProblems(settings.shuffleProblems ?? true);
        setUseCustomFen(settings.useCustomFen ?? false);
        setCustomFenInput(settings.customFenInput ?? '');
      } catch (error) {
        console.error('Failed to load position memory settings:', error);
      }
    }
    setHasLoadedSettings(true);
  }, [urlFens, urlTimeLimit, urlShuffle, urlError]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    // Don't save if settings haven't been loaded yet
    if (!hasLoadedSettings) {
      return;
    }

    // Don't save if loaded from URL params
    if (urlFens) {
      return;
    }

    const settings = {
      timeLimit,
      problemCount,
      shuffleProblems,
      useCustomFen,
      customFenInput,
    };
    localStorage.setItem('positionMemorySettings', JSON.stringify(settings));
  }, [
    timeLimit,
    problemCount,
    shuffleProblems,
    useCustomFen,
    customFenInput,
    hasLoadedSettings,
    urlFens,
  ]);

  // Validate custom FEN when input changes
  useEffect(() => {
    if (useCustomFen && customFenInput.trim()) {
      const lines = customFenInput
        .trim()
        .split('\n')
        .filter((line) => line.trim());
      const invalidLines: number[] = [];

      lines.forEach((line, index) => {
        if (!validateFEN(line.trim())) {
          invalidLines.push(index + 1);
        }
      });

      if (invalidLines.length > 0) {
        const lineStr =
          invalidLines.length > 1
            ? t('invalidFenOnLines', { lines: invalidLines.join(', ') })
            : t('invalidFenOnLine', { lines: invalidLines.join(', ') });
        setCustomFenError(lineStr);
      } else {
        setCustomFenError(null);
      }
    } else {
      setCustomFenError(null);
    }
  }, [customFenInput, useCustomFen, t]);

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

  const handleStart = () => {
    // Build URL params
    const params = new URLSearchParams();
    params.set('t', timeLimit.toString());
    params.set('s', shuffleProblems ? '1' : '0');

    if (useCustomFen) {
      const fens = customFenInput
        .trim()
        .split('\n')
        .filter((line) => line.trim());

      if (fens.length === 0 || fens.some((fen) => !validateFEN(fen.trim()))) {
        return;
      }

      const encoded = encodeFensToBase64(fens);
      params.set('p', encoded);
    } else {
      params.set('c', problemCount.toString());
    }

    // Navigate to session page
    router.push(`/${locale}/practice/position-memory/session?${params.toString()}`);
  };

  return (
    <div className="max-w-4xl mx-auto">
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
          onTimeLimitChange={setTimeLimit}
          onProblemCountChange={setProblemCount}
          onShuffleChange={setShuffleProblems}
          onUseCustomFenChange={setUseCustomFen}
          onCustomFenInputChange={setCustomFenInput}
          onCopyShareLink={handleCopyShareLink}
        />

        <PrimaryButton
          onClick={handleStart}
          disabled={useCustomFen && (customFenError !== null || !customFenInput.trim())}
          className="mt-6"
        >
          {t('start')}
        </PrimaryButton>
      </div>
    </div>
  );
}
