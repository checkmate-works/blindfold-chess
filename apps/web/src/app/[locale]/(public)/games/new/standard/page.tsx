import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GameLimitCheck } from '../_components/GameLimitCheck';
import { StandardGameForm } from './_components/StandardGameForm';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  const title = t('newGame.standardTitle');

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/new/standard', title }),
    title: resolveTitle(title, locale),
  };
}

export default async function StandardGamePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const tGames = await getTranslations({ locale, namespace: 'gamesPage' });

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
              { label: tGames('pageTitle'), href: '/games' },
              { label: t('newGame.title'), href: '/games/new' },
              { label: t('newGame.standardTitle') },
            ]}
          />
        </GameLimitCheck>
      </PagePanel>
    </div>
  );
}
