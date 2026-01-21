'use client';

import { useEffect, useState } from 'react';

import type { Locale } from '@/app/[locale]/_lib/types';

import { SquareColorsSetup } from './SquareColorsSetup';

type Props = {
  locale: Locale;
};

const STORAGE_KEY = 'squareColors_settings';

export default function SquareColors({ locale }: Props) {
  // Load settings from localStorage using lazy initializer
  const [timeLimit, setTimeLimit] = useState(() => {
    if (typeof window === 'undefined') return 60;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        return settings.timeLimit || 60;
      } catch {
        // Ignore invalid JSON in localStorage
      }
    }
    return 60;
  });

  // Save settings to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ timeLimit }));
    }
  }, [timeLimit]);

  return (
    <SquareColorsSetup locale={locale} timeLimit={timeLimit} onTimeLimitChange={setTimeLimit} />
  );
}
