import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getOpenings } from '@/lib/openings/master-queries';

import { PageLayout } from '@/app/[locale]/_components';
import { type HelpStep, HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
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

  const title = t('newGame.openingPageTitle');

  return {
    ...generateCanonicalMetadata({ locale, path: 'games/new/opening', title }),
    title: resolveTitle(title, locale),
  };
}

export default async function OpeningGamePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const tNewGame = await getTranslations({ locale, namespace: 'newGame' });
  const tGames = await getTranslations({ locale, namespace: 'gamesPage' });
  const tOpeningNames = await getTranslations({ locale, namespace: 'topics.openings.names' });

  const helpSteps: HelpStep[] = [
    {
      targetId: 'opening-search',
      title: tNewGame('openingPageTitle'),
      description: tNewGame('helpOpeningIntroDescription'),
      side: 'bottom',
      align: 'center',
    },
  ];

  const allOpenings = await getOpenings();

  const openings = allOpenings.map((o) => {
    const translatedName = tOpeningNames.has(o.slug as never)
      ? tOpeningNames(o.slug as never)
      : o.name;
    return {
      slug: o.slug,
      name: o.name,
      fen: o.fen,
      ecoCode: o.ecoCode,
      pgn: o.pgn,
      translatedName,
    };
  });

  return (
    <PageLayout
      title={t('newGame.openingPageTitle')}
      titleAction={<HelpTourButton steps={helpSteps} label={tNewGame('helpLabel')} />}
      locale={locale}
      breadcrumb={[
        { label: tGames('pageTitle'), href: '/games' },
        { label: t('newGame.title'), href: '/games/new' },
        { label: t('newGame.openingPageTitle') },
      ]}
    >
      <GameLimitCheck locale={locale}>
        <OpeningGameForm openings={openings} />
      </GameLimitCheck>
    </PageLayout>
  );
}
