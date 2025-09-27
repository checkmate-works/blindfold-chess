import { getTranslations } from 'next-intl/server';
import { GameListClient } from './_components/GameListClient';
import type { Metadata } from 'next';
import type { Locale } from './_lib/types';

interface Props {
  params: Promise<{
    locale: Locale;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.home' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const translations = {
    title: t('home.title'),
    noGames: t('home.noGames'),
    count: t('home.gamesCount'),
    moves: t('home.moves'),
    level: t('home.level'),
    win: t('home.win'),
    loss: t('home.loss'),
    draw: t('home.draw'),
    inProgress: t('home.inProgress'),
    sortBy: t('home.sortBy'),
    lastPlayedDesc: t('home.lastPlayedDesc'),
    lastPlayedAsc: t('home.lastPlayedAsc'),
    createdDesc: t('home.createdDesc'),
    createdAsc: t('home.createdAsc'),
    newGame: t('home.newGame'),
    newGameDescription: t('home.newGameDescription'),
    playAsWhite: t('home.playAsWhite'),
    playAsBlack: t('home.playAsBlack'),
    vsComputer: t('home.vsComputer'),
    maxGamesReached: t('home.maxGamesReached', { max: 50 }),
    deleteGameTitle: t('home.deleteGameTitle'),
    deleteGameMessage: t('home.deleteGameMessage'),
    deleteConfirm: t('home.deleteConfirm'),
    cancel: t('home.cancel'),
    gameDeletedToast: t('home.gameDeletedToast'),
    deleteFailedToast: t('home.deleteFailedToast'),
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <GameListClient locale={locale} translations={translations} />
    </div>
  );
}
