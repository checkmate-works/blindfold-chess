'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { validateFenFormat as validateFEN } from '@blindfold-chess/features/chess-core';

import type { PresetPosition } from '../_data/positions';
import presetPositions from '../_data/presetPositions.json';

const MAX_FEN_COUNT = 10;
const STORAGE_KEY = 'fenPracticeSettings';

const presetCount = (presetPositions as PresetPosition[]).length;

const defaultSettings = {
  problemCount: presetCount,
  shuffleProblems: true,
  useCustomFen: false,
  customFenInput: '',
};

export function useFenSettings() {
  const t = useTranslations('practice.fen');

  const [problemCount, setProblemCount] = useState(defaultSettings.problemCount);
  const [shuffleProblems, setShuffleProblems] = useState(defaultSettings.shuffleProblems);
  const [useCustomFen, setUseCustomFen] = useState(defaultSettings.useCustomFen);
  const [customFenInput, setCustomFenInput] = useState(defaultSettings.customFenInput);
  const [customFenError, setCustomFenError] = useState<string | null>(null);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setProblemCount(settings.problemCount ?? defaultSettings.problemCount);
        setShuffleProblems(settings.shuffleProblems ?? defaultSettings.shuffleProblems);
        setUseCustomFen(settings.useCustomFen ?? defaultSettings.useCustomFen);
        setCustomFenInput(settings.customFenInput ?? defaultSettings.customFenInput);
      } catch (error) {
        console.error('Failed to load FEN practice settings:', error);
      }
    }
    setHasLoadedSettings(true);
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!hasLoadedSettings) {
      return;
    }

    const settings = {
      problemCount,
      shuffleProblems,
      useCustomFen,
      customFenInput,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [problemCount, shuffleProblems, useCustomFen, customFenInput, hasLoadedSettings]);

  // Validate custom FEN when input changes
  useEffect(() => {
    if (useCustomFen && customFenInput.trim()) {
      const lines = customFenInput
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
  }, [customFenInput, useCustomFen, t]);

  const customFenCount = customFenInput
    .trim()
    .split('\n')
    .filter((line) => line.trim()).length;

  return {
    problemCount,
    setProblemCount,
    shuffleProblems,
    setShuffleProblems,
    useCustomFen,
    setUseCustomFen,
    customFenInput,
    setCustomFenInput,
    customFenError,
    customFenCount,
    presetCount,
  };
}
