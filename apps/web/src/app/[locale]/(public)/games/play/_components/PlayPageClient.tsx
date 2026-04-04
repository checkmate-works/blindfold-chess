'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PlayClient } from './PlayClient';

type Props = {
  locale: Locale;
};

export function PlayPageClient({ locale }: Props) {
  const t = useTranslations('play');
  const [aiMoveDisplay, setAiMoveDisplay] = useState<string | null>(null);

  return (
    <>
      <div className="mb-8">
        <PageTitle>{aiMoveDisplay || t('title')}</PageTitle>
      </div>
      <PlayClient locale={locale} onAiMoveChange={setAiMoveDisplay} />
    </>
  );
}
