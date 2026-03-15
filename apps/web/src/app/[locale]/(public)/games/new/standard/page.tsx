import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GameLimitCheck } from '../_components/GameLimitCheck';
import { StandardGameForm } from './_components/StandardGameForm';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/new/standard' }),
    title: t('newGame.standardTitle'),
  };
}

export default async function StandardGamePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('newGame.standardTitle')}</PageTitle>
      <PagePanel>
        <GameLimitCheck locale={locale}>
          <Suspense fallback={null}>
            <StandardGameForm locale={locale} />
          </Suspense>
          <Divider />
          <Breadcrumb
            locale={locale}
            items={[
              { label: t('newGame.title'), href: '/games/new' },
              { label: t('newGame.standardTitle') },
            ]}
          />
        </GameLimitCheck>
      </PagePanel>
    </div>
  );
}
