import { getTranslations } from 'next-intl/server';
import { PlayClient } from './_components/PlayClient';

interface PlayPageProps {
  params: Promise<{
    locale: 'en' | 'ja';
  }>;
}

export default async function PlayPage({ params }: PlayPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const translations = {
    title: t('play.title'),
    yourMove: t('play.yourMove'),
    aiThinking: t('play.aiThinking'),
    gameOver: t('play.gameOver'),
    checkmate: t('play.checkmate'),
    stalemate: t('play.stalemate'),
    draw: t('play.draw'),
    youWin: t('play.youWin'),
    youLose: t('play.youLose'),
    check: t('play.check'),
    inputMove: t('play.inputMove'),
    submitMove: t('play.submitMove'),
    invalidMove: t('play.invalidMove'),
    newGame: t('play.newGame'),
    resign: t('play.resign'),
    undo: t('play.undo'),
    moves: t('play.moves'),
    confirmResignTitle: t('play.confirmResignTitle'),
    confirmResignMessage: t('play.confirmResignMessage'),
    cancel: t('play.cancel'),
    confirmResign: t('play.confirmResign'),
    confirmUndoTitle: t('play.confirmUndoTitle'),
    confirmUndoMessage: t('play.confirmUndoMessage'),
    confirmUndo: t('play.confirmUndo'),
  };

  return <PlayClient locale={locale} translations={translations} />;
}
