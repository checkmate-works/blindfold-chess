import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getOptionalUser } from '@/lib/auth';
import { canUseMaia } from '@/lib/users/can-use-maia';

import { PageLayout } from '@/app/[locale]/_components';
import { type HelpStep, HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';
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
export const dynamic = 'force-dynamic';

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
  const tNewGame = await getTranslations({ locale, namespace: 'newGame' });
  const tGames = await getTranslations({ locale, namespace: 'gamesPage' });

  const user = await getOptionalUser();
  const maiaUnlocked = await canUseMaia(user?.id ?? null);

  const helpSteps: HelpStep[] = [
    {
      targetId: 'pgn-input',
      title: tNewGame('pgnPageTitle'),
      description: tNewGame('helpPgnIntroDescription'),
      side: 'bottom',
      align: 'center',
    },
    {
      targetId: 'engine-selector',
      title: tNewGame('selectEngine'),
      description: tNewGame('helpEngineDescription'),
      side: 'bottom',
      align: 'center',
    },
    {
      targetId: 'skill-level-selector',
      title: tNewGame('selectLevel'),
      description: tNewGame('helpSkillLevelDescription'),
      side: 'top',
      align: 'center',
    },
  ];

  return (
    <PageLayout
      title={t('newGame.pgnPageTitle')}
      titleAction={<HelpTourButton steps={helpSteps} label={tNewGame('helpLabel')} />}
      locale={locale}
      breadcrumb={[
        { label: tGames('pageTitle'), href: '/games' },
        { label: t('newGame.title'), href: '/games/new' },
        { label: t('newGame.pgnPageTitle') },
      ]}
    >
      <GameLimitCheck locale={locale}>
        <Suspense fallback={null}>
          <PgnGameForm locale={locale} maiaUnlocked={maiaUnlocked} />
        </Suspense>
      </GameLimitCheck>
    </PageLayout>
  );
}
