import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getOptionalUser } from '@/lib/auth';
import { canUseMaia } from '@/lib/users/can-use-maia';

import { PageLayout } from '@/app/[locale]/_components';
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

// `generateStaticParams` is intentionally retained for metadata pre-render
// but the page reads cookies (auth state for the Maia entitlement check),
// so Next.js will switch to dynamic rendering at runtime. That is the
// desired behaviour — the form renders different UI per user.
export const generateStaticParams = generateLocaleStaticParams;
export const dynamic = 'force-dynamic';

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

  const user = await getOptionalUser();
  const maiaUnlocked = await canUseMaia(user?.id ?? null);

  return (
    <PageLayout
      title={t('newGame.standardTitle')}
      locale={locale}
      breadcrumb={[
        { label: tGames('pageTitle'), href: '/games' },
        { label: t('newGame.title'), href: '/games/new' },
        { label: t('newGame.standardTitle') },
      ]}
    >
      <GameLimitCheck locale={locale}>
        <Suspense fallback={null}>
          <StandardGameForm locale={locale} maiaUnlocked={maiaUnlocked} />
        </Suspense>
      </GameLimitCheck>
    </PageLayout>
  );
}
