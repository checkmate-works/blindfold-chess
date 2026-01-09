'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';
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

  // Default values (used for SSR and initial render)
  const defaultSettings = {
    timeLimit: 10,
    problemCount: 1,
    shuffleProblems: true,
    useCustomFen: false,
    customFenInput: '',
  };

  // URL params override defaults
  const urlSettings = urlFens
    ? {
        timeLimit: urlTimeLimit ?? defaultSettings.timeLimit,
        problemCount: defaultSettings.problemCount,
        shuffleProblems: urlShuffle ?? defaultSettings.shuffleProblems,
        useCustomFen: true,
        customFenInput: urlFens.join('\n'),
      }
    : null;

  // Game settings - initialize with defaults or URL params
  const initialValues = urlSettings ?? defaultSettings;
  const [timeLimit, setTimeLimit] = useState(initialValues.timeLimit);
  const [problemCount, setProblemCount] = useState(initialValues.problemCount);
  const [shuffleProblems, setShuffleProblems] = useState(initialValues.shuffleProblems);
  const [useCustomFen, setUseCustomFen] = useState(initialValues.useCustomFen);
  const [customFenInput, setCustomFenInput] = useState(initialValues.customFenInput);
  const [customFenError, setCustomFenError] = useState<string | null>(urlError || null);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(!!urlFens);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error' | 'too_long'>('idle');

  // Load settings from localStorage on mount (client-side only)
  useEffect(() => {
    // Skip if we already have URL params
    if (urlFens) {
      return;
    }

    const savedSettings = localStorage.getItem('positionMemorySettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setTimeLimit(settings.timeLimit ?? defaultSettings.timeLimit);
        setProblemCount(settings.problemCount ?? defaultSettings.problemCount);
        setShuffleProblems(settings.shuffleProblems ?? defaultSettings.shuffleProblems);
        setUseCustomFen(settings.useCustomFen ?? defaultSettings.useCustomFen);
        setCustomFenInput(settings.customFenInput ?? defaultSettings.customFenInput);
      } catch (error) {
        console.error('Failed to load position memory settings:', error);
      }
    }
    setHasLoadedSettings(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        .filter((line: string) => line.trim());
      const invalidLines: number[] = [];

      lines.forEach((line: string, index: number) => {
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
      .filter((line: string) => line.trim());

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
    params.set('timeLimit', timeLimit.toString());
    params.set('shuffle', shuffleProblems ? '1' : '0');

    if (useCustomFen) {
      const fens = customFenInput
        .trim()
        .split('\n')
        .filter((line: string) => line.trim());

      if (fens.length === 0 || fens.some((fen: string) => !validateFEN(fen.trim()))) {
        return;
      }

      const encoded = encodeFensToBase64(fens);
      params.set('problems', encoded);
      // Use problemCount for custom FEN, capped at the number of FENs
      const effectiveCount = Math.min(problemCount, fens.length);
      params.set('count', effectiveCount.toString());
    } else {
      params.set('count', problemCount.toString());
    }

    // Save current settings to localStorage on start (including URL-loaded settings)
    const settings = {
      timeLimit,
      problemCount,
      shuffleProblems,
      useCustomFen,
      customFenInput,
    };
    localStorage.setItem('positionMemorySettings', JSON.stringify(settings));

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

        <Button
          onClick={handleStart}
          disabled={useCustomFen && (customFenError !== null || !customFenInput.trim())}
          variant="primary"
          size="lg"
          className="w-full rounded-lg font-semibold mt-6"
          icon={<FaPlay />}
        >
          {t('start')}
        </Button>
      </div>
    </div>
  );
}
