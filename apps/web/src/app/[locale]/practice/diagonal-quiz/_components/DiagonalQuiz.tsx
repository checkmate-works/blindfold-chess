'use client';

import { useEffect, useState } from 'react';

import type { Locale } from '@/app/[locale]/_lib/types';

import { DiagonalQuizPageContent } from './DiagonalQuizPageContent';

type Props = {
  locale: Locale;
};

const STORAGE_KEY = 'diagonalQuiz_settings';

export default function DiagonalQuiz({ locale }: Props) {
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ timeLimit }));
    }
  }, [timeLimit]);

  return (
    <DiagonalQuizPageContent
      locale={locale}
      timeLimit={timeLimit}
      onTimeLimitChange={setTimeLimit}
    />
  );
}
