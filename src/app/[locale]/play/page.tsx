'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { PlayClient } from './_components/PlayClient';
import { PageTitle } from '../_components/PageTitle';

export default function PlayPage() {
  const params = useParams();
  const locale = params.locale as 'en' | 'ja';
  const t = useTranslations();
  const [aiMoveDisplay, setAiMoveDisplay] = useState<string | null>(null);

  const translations = {
    title: t('play.title'),
    newGame: t('play.newGame'),
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
    configureBoardAppearance: t('play.configureBoardAppearance'),
    save: t('play.save'),
    showBoard: t('play.showBoard'),
    hideBoard: t('play.hideBoard'),
  };

  return (
    <>
      <div className="mb-8">
        <PageTitle>{aiMoveDisplay || translations.title}</PageTitle>
      </div>
      <PlayClient locale={locale} translations={translations} onAiMoveChange={setAiMoveDisplay} />
    </>
  );
}
