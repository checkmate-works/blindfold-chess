import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { CardLink, PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GameLimitCheck } from './_components/GameLimitCheck';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'metadata.newGame', path: 'games/new' });
}

export default async function NewGamePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const tGames = await getTranslations({ locale, namespace: 'gamesPage' });

  return (
    <PageLayout
      title={t('newGame.title')}
      locale={locale}
      breadcrumb={[{ label: tGames('pageTitle'), href: '/games' }, { label: t('newGame.title') }]}
    >
      <SectionTitle>{t('newGame.selectTitle')}</SectionTitle>
      <GameLimitCheck locale={locale}>
        <div className="grid grid-cols-1 gap-4">
          <CardLink
            href="/games/new/standard"
            icon="♟"
            title={t('newGame.standardTitle')}
            description={t('newGame.standardDescription')}
          />
          <CardLink
            href="/games/new/position"
            icon="♜"
            title={t('newGame.positionPageTitle')}
            description={t('newGame.positionPageDescription')}
          />
          <CardLink
            href="/games/new/opening"
            icon="📖"
            title={t('newGame.openingPageTitle')}
            description={t('newGame.openingPageDescription')}
          />
          <CardLink
            href="/games/new/pgn"
            icon="📋"
            title={t('newGame.pgnPageTitle')}
            description={t('newGame.pgnPageDescription')}
          />
        </div>
      </GameLimitCheck>
      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}
