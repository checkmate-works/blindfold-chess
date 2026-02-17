'use client';

import { useEffect, useState } from 'react';

import type { Locale } from '@/app/[locale]/_lib/types';

import { SquareColorsSetup } from './SquareColorsSetup';

type Props = {
  locale: Locale;
};

const STORAGE_KEY = 'squareColors_settings';

export default function SquareColors({ locale }: Props) {
  const [timeLimit, setTimeLimit] = useState(60);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.timeLimit) {
          setTimeLimit(settings.timeLimit);
        }
      } catch {
        // Ignore invalid JSON in localStorage
      }
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ timeLimit }));
    }
  }, [timeLimit, isLoaded]);

  return (
    <SquareColorsSetup locale={locale} timeLimit={timeLimit} onTimeLimitChange={setTimeLimit} />
  );
}
