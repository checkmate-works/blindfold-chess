'use client';

import { useEffect, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { integerBetween, isBoolean, isString } from '@blindfold-chess/features/common';
import {
  DEFAULT_FEN_SETTINGS,
  type FenSettings,
  PRESET_POSITION_COUNT,
  validateCustomFenInput,
} from '@blindfold-chess/features/fen-practice';

import { useLocalStorageSettings } from '@/lib/persistent-settings/use-local-storage-settings';

const STORAGE_KEY = 'fenPracticeSettings';

const presetCount = PRESET_POSITION_COUNT;

// `problemCount` has no upper bound here: the setup screens clamp it to the
// positions actually available, which differs between presets and custom FENs.
const GUARDS = {
  problemCount: integerBetween(1, Number.MAX_SAFE_INTEGER),
  shuffleProblems: isBoolean,
  useCustomFen: isBoolean,
  customFenInput: isString,
};

export function useFenSettings() {
  const t = useTranslations('practice.fen');

  const { settings, updateSettings } = useLocalStorageSettings<FenSettings>(
    STORAGE_KEY,
    DEFAULT_FEN_SETTINGS,
    GUARDS
  );

  const [customFenError, setCustomFenError] = useState<string | null>(null);

  // Validate custom FEN when input changes
  useEffect(() => {
    const error = settings.useCustomFen ? validateCustomFenInput(settings.customFenInput) : null;

    if (!error) {
      setCustomFenError(null);
    } else if (error.kind === 'tooMany') {
      setCustomFenError(t('tooManyFens', { max: error.max }));
    } else {
      const lines = error.lines.join(', ');
      setCustomFenError(
        error.lines.length > 1
          ? t('invalidFenOnLines', { lines })
          : t('invalidFenOnLine', { lines })
      );
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
