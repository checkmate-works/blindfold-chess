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
    // Start Method
    startMethod: t('newGame.startMethod'),
    newGame: t('newGame.newGame'),
    newGameDescription: t('newGame.newGameDescription'),
    fromPgn: t('newGame.fromPgn'),
    fromPgnDescription: t('newGame.fromPgnDescription'),
    // PGN
    pgnTitle: t('newGame.pgnTitle'),
    pgnPlaceholder: t('newGame.pgnPlaceholder'),
    validWithMoves: t('newGame.validWithMoves'),
    invalidPgn: t('newGame.invalidPgn'),
    derivedFromPgn: t('newGame.derivedFromPgn'),
    // Color
    selectColor: t('newGame.selectColor'),
    playAsWhite: t('newGame.playAsWhite'),
    playAsBlack: t('newGame.playAsBlack'),
    whiteDescription: t('newGame.whiteDescription'),
    blackDescription: t('newGame.blackDescription'),
    // Skill Level
    selectLevel: t('newGame.selectLevel'),
    beginner: t('newGame.beginner'),
    intermediate: t('newGame.intermediate'),
    advanced: t('newGame.advanced'),
    // Buttons
    startGame: t('newGame.startGame'),
    cancel: t('newGame.cancel'),
  };

  return <NewGameForm locale={locale} translations={translations} />;
}
