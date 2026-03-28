import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { asc } from 'drizzle-orm';

import { chessOpenings, db } from '@/lib/db';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GameLimitCheck } from '../_components/GameLimitCheck';
import { OpeningGameForm } from './_components/OpeningGameForm';

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

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/new/opening' }),
    title: t('newGame.openingPageTitle'),
  };
}

export default async function OpeningGamePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const tOpeningNames = await getTranslations({ locale, namespace: 'topics.openings.names' });

  const allOpenings = await db
    .select({
      slug: chessOpenings.slug,
      name: chessOpenings.name,
      fen: chessOpenings.fen,
      ecoCode: chessOpenings.ecoCode,
      pgn: chessOpenings.pgn,
    })
    .from(chessOpenings)
    .orderBy(asc(chessOpenings.sortOrder));

  const openings = allOpenings.map((o) => {
    const translatedName = tOpeningNames.has(o.slug as never)
      ? tOpeningNames(o.slug as never)
      : o.name;
    return { ...o, translatedName };
  });

  return (
    <div className="space-y-8">
      <PageTitle>{t('newGame.openingPageTitle')}</PageTitle>
      <PagePanel>
        <GameLimitCheck locale={locale}>
          <OpeningGameForm openings={openings} />
          <Divider />
          <Breadcrumb
            locale={locale}
            items={[
              { label: t('newGame.title'), href: '/games/new' },
              { label: t('newGame.openingPageTitle') },
            ]}
          />
        </GameLimitCheck>
      </PagePanel>
    </div>
  );
}
