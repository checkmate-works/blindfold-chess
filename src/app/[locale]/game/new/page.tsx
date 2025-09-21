import { getTranslations } from 'next-intl/server';
import { NewGameForm } from './_components/NewGameForm';

interface NewGamePageProps {
  params: Promise<{
    locale: 'en' | 'ja';
  }>;
}

export default async function NewGamePage({ params }: NewGamePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const translations = {
    title: t('newGame.title'),
    selectColor: t('newGame.selectColor'),
    playAsWhite: t('newGame.playAsWhite'),
    playAsBlack: t('newGame.playAsBlack'),
    selectLevel: t('newGame.selectLevel'),
    beginner: t('newGame.beginner'),
    intermediate: t('newGame.intermediate'),
    advanced: t('newGame.advanced'),
    startGame: t('newGame.startGame'),
    whiteDescription: t('newGame.whiteDescription'),
    blackDescription: t('newGame.blackDescription'),
  };

  return <NewGameForm locale={locale} translations={translations} />;
}
