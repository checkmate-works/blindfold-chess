/**
 * Play Page (プレイ画面)
 *
 * @description
 * The main blindfold chess game screen where users play against Stockfish AI.
 * The board is hidden by default to train visualization skills. Users input
 * moves in algebraic notation while mentally tracking the position.
 *
 * @flow
 * 1. Game Setup: Configure player color, AI skill level (1-20) on /games/new
 * 2. Active Play: Input moves via text or dropdown, AI responds automatically
 *    - Board visibility toggle for checking position
 *    - Move history with navigation to review positions
 *    - Undo and resign options available
 * 3. Game End: Win/loss/draw result displayed, option to start new game
 *    or proceed to postmortem (game review)
 */
'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

import { PageTitle } from '../_components/PageTitle';
import type { Locale } from '../_lib/types';
import { PlayClient } from './_components/PlayClient';

export default function PlayPage() {
  const params = useParams();
  const locale = params.locale as Locale;
  const t = useTranslations('play');
  const [aiMoveDisplay, setAiMoveDisplay] = useState<string | null>(null);

  return (
    <>
      <div className="mb-8">
        <PageTitle>{aiMoveDisplay || t('title')}</PageTitle>
      </div>
      <PlayClient locale={locale} onAiMoveChange={setAiMoveDisplay} />
    </>
  );
}
