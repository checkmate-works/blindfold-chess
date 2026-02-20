'use client';

import type { Locale } from '@/app/[locale]/_lib/types';
import { usePersistentSettings } from '@/app/[locale]/practice/_hooks/usePersistentSettings';

import { DiagonalQuizPageContent } from './DiagonalQuizPageContent';

type Props = {
  locale: Locale;
};

type DiagonalQuizLocalSettings = {
  timeLimit: number;
};

const STORAGE_KEY = 'diagonalQuiz_settings';
const DEFAULTS: DiagonalQuizLocalSettings = { timeLimit: 60 };

export default function DiagonalQuiz({ locale }: Props) {
  const { settings, updateSettings } = usePersistentSettings(STORAGE_KEY, DEFAULTS);

  return (
    <DiagonalQuizPageContent
      locale={locale}
      timeLimit={settings.timeLimit}
      onTimeLimitChange={(timeLimit) => updateSettings({ timeLimit })}
    />
  );
}
