import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PageLayout } from '@/app/[locale]/_components';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GameLimitCheck } from '../_components/GameLimitCheck';
import { PgnGameForm } from './_components/PgnGameForm';

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

  const title = t('newGame.pgnPageTitle');

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/new/pgn', title }),
    title: resolveTitle(title, locale),
  };
}

export default async function PgnGamePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const tGames = await getTranslations({ locale, namespace: 'gamesPage' });

  return (
    <PageLayout
      title={t('newGame.pgnPageTitle')}
      locale={locale}
      breadcrumb={[
        { label: tGames('pageTitle'), href: '/games' },
        { label: t('newGame.title'), href: '/games/new' },
        { label: t('newGame.pgnPageTitle') },
      ]}
    >
      <GameLimitCheck locale={locale}>
        <Suspense fallback={null}>
          <PgnGameForm locale={locale} />
        </Suspense>
      </GameLimitCheck>
    </PageLayout>
  );
}
