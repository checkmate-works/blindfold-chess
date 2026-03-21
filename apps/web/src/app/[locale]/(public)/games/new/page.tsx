import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SUPPORTED_LOCALES } from '@/config';

import { CardLink, Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GameLimitCheck } from './_components/GameLimitCheck';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/new' }),
    title: t('newGame.title'),
  };
}

export default async function NewGamePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('newGame.selectTitle')}</PageTitle>
      <PagePanel>
        <GameLimitCheck locale={locale}>
          <div className="grid grid-cols-1 gap-4">
            <CardLink
              href="/games/new/standard"
              icon="♟"
              title={t('newGame.standardTitle')}
              description={t('newGame.standardDescription')}
            />
            <CardLink
              href="/games/new/pgn"
              icon="📋"
              title={t('newGame.pgnPageTitle')}
              description={t('newGame.pgnPageDescription')}
            />
            <CardLink
              href="/games/new/position"
              icon="♜"
              title={t('newGame.positionPageTitle')}
              description={t('newGame.positionPageDescription')}
            />
          </div>
          <Divider />
          <Breadcrumb locale={locale} items={[{ label: t('newGame.title') }]} />
        </GameLimitCheck>
      </PagePanel>
    </div>
  );
}
