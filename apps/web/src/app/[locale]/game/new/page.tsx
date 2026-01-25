import { Suspense } from 'react';

import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, PageTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GameLimitCheck } from './_components/GameLimitCheck';
import { NewGameForm } from './_components/NewGameForm';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export default async function NewGamePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('newGame.title')}</PageTitle>
      <GameLimitCheck locale={locale}>
        <Suspense fallback={null}>
          <NewGameForm locale={locale} />
        </Suspense>
        <Divider />
        <Breadcrumb locale={locale} items={[{ label: t('newGame.title') }]} />
      </GameLimitCheck>
    </div>
  );
}
