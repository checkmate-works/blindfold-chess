import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GameLimitCheck } from '../_components/GameLimitCheck';
import { PositionGameForm } from './_components/PositionGameForm';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/new/position' }),
    title: t('newGame.positionPageTitle'),
  };
}

export default async function PositionGamePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('newGame.positionPageTitle')}</PageTitle>
      <GameLimitCheck locale={locale}>
        <Suspense fallback={null}>
          <PositionGameForm locale={locale} />
        </Suspense>
        <Divider />
        <Breadcrumb
          locale={locale}
          items={[
            { label: t('newGame.title'), href: '/games/new' },
            { label: t('newGame.positionPageTitle') },
          ]}
        />
      </GameLimitCheck>
    </div>
  );
}
