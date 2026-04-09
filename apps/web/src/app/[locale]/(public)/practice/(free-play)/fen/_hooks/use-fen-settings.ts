'use client';

import { useEffect, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { validateFenFormat as validateFEN } from '@blindfold-chess/features/chess-core';

import { usePersistentSettings } from '@/app/[locale]/(public)/practice/_hooks/use-persistent-settings';

import type { PresetPosition } from '../_data/positions';
import presetPositions from '../_data/presetPositions.json';

const MAX_FEN_COUNT = 10;
const STORAGE_KEY = 'fenPracticeSettings';

const presetCount = (presetPositions as PresetPosition[]).length;

type FenSettings = {
  problemCount: number;
  shuffleProblems: boolean;
  useCustomFen: boolean;
  customFenInput: string;
};

const DEFAULT_SETTINGS: FenSettings = {
  problemCount: presetCount,
  shuffleProblems: true,
  useCustomFen: false,
  customFenInput: '',
};

export function useFenSettings() {
  const t = useTranslations('practice.fen');

  const { settings, updateSettings } = usePersistentSettings<FenSettings>(
    STORAGE_KEY,
    DEFAULT_SETTINGS
  );

  const [customFenError, setCustomFenError] = useState<string | null>(null);

  // Validate custom FEN when input changes
  useEffect(() => {
    if (settings.useCustomFen && settings.customFenInput.trim()) {
      const lines = settings.customFenInput
        .trim()
        .split('\n')
        .filter((line: string) => line.trim());

      if (lines.length > MAX_FEN_COUNT) {
        setCustomFenError(t('tooManyFens', { max: MAX_FEN_COUNT }));
        return;
      }

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
  }, [settings.customFenInput, settings.useCustomFen, t]);

  const customFenCount = settings.customFenInput
    .trim()
    .split('\n')
    .filter((line) => line.trim()).length;

  return {
    problemCount: settings.problemCount,
    setProblemCount: (v: number) => updateSettings({ problemCount: v }),
    shuffleProblems: settings.shuffleProblems,
    setShuffleProblems: (v: boolean) => updateSettings({ shuffleProblems: v }),
    useCustomFen: settings.useCustomFen,
    setUseCustomFen: (v: boolean) => updateSettings({ useCustomFen: v }),
    customFenInput: settings.customFenInput,
    setCustomFenInput: (v: string) => updateSettings({ customFenInput: v }),
    customFenError,
    customFenCount,
    presetCount,
  };
}
