'use client';

import { useState } from 'react';

import { usePersistentSettings } from '@/app/[locale]/(public)/practice/_hooks/use-persistent-settings';

const STORAGE_KEY = 'positionMemorySettings';

type PositionMemorySettings = {
  timeLimit: number;
  problemCount: number;
  shuffleProblems: boolean;
  useCustomFen: boolean;
  customFenInput: string;
};

const DEFAULT_SETTINGS: PositionMemorySettings = {
  timeLimit: 30,
  problemCount: 5,
  shuffleProblems: false,
  useCustomFen: false,
  customFenInput: '',
};

type UrlOverrides = {
  urlFens?: string[] | null;
  urlTimeLimit?: number | null;
  urlShuffle?: boolean | null;
};

/**
 * Manages position memory settings with localStorage persistence
 * and optional URL parameter overrides.
 *
 * When urlFens is provided, settings are initialized from URL params
 * and localStorage persistence is disabled.
 */
export function usePositionMemorySettings(urlOverrides: UrlOverrides) {
  const { urlFens, urlTimeLimit, urlShuffle } = urlOverrides;
  const hasUrlOverride = !!urlFens;

  // Compute initial values from URL params if present
  const urlSettings: PositionMemorySettings | null = urlFens
    ? {
        timeLimit: urlTimeLimit ?? DEFAULT_SETTINGS.timeLimit,
        problemCount: DEFAULT_SETTINGS.problemCount,
        shuffleProblems: urlShuffle ?? DEFAULT_SETTINGS.shuffleProblems,
        useCustomFen: true,
        customFenInput: urlFens.join('\n'),
      }
    : null;

  // Use persistent settings only when no URL override
  const {
    settings: persistedSettings,
    updateSettings: updatePersistedSettings,
    isLoaded: isPersistedLoaded,
  } = usePersistentSettings<PositionMemorySettings>(STORAGE_KEY, DEFAULT_SETTINGS);

  // When URL params are present, use URL-derived state instead of persisted state
  const [urlDerivedSettings, setUrlDerivedSettings] = useState<PositionMemorySettings>(
    urlSettings ?? DEFAULT_SETTINGS
  );

  const settings = hasUrlOverride ? urlDerivedSettings : persistedSettings;
  const isLoaded = hasUrlOverride ? true : isPersistedLoaded;

  const updateSettings = hasUrlOverride
    ? (partial: Partial<PositionMemorySettings>) => {
        setUrlDerivedSettings((prev) => ({ ...prev, ...partial }));
      }
    : updatePersistedSettings;

  // Save explicitly (used on start button to persist before navigating)
  const saveSettings = () => {
    if (!hasUrlOverride) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  };

  const clearSettings = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    settings,
    updateSettings,
    isLoaded,
    saveSettings,
    clearSettings,
  };
}

export { STORAGE_KEY as POSITION_MEMORY_STORAGE_KEY };
