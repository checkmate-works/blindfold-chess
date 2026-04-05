'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { Divider } from '@/app/[locale]/_components/Divider';
import { PagePanel } from '@/app/[locale]/_components/PagePanel';
import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ClientBreadcrumb } from './ClientBreadcrumb';
import { PlayClient } from './PlayClient';

type Props = {
  locale: Locale;
};

export function PlayPageClient({ locale }: Props) {
  const t = useTranslations('play');
  const tCommon = useTranslations('common');
  const tGames = useTranslations('gamesPage');
  const [aiMoveDisplay, setAiMoveDisplay] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <PageTitle>{aiMoveDisplay || t('title')}</PageTitle>
      <PagePanel>
        <PlayClient locale={locale} onAiMoveChange={setAiMoveDisplay} />
        <Divider />
        <ClientBreadcrumb
          items={[{ label: tGames('pageTitle'), href: '/games' }, { label: t('title') }]}
          locale={locale}
          brandName={tCommon('brandName')}
        />
      </PagePanel>
    </div>
  );
}
