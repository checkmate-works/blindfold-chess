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
import type { Locale } from '../_lib/types';
import { PlayPageClient } from './_components/PlayPageClient';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export default async function PlayPage({ params }: Props) {
  const { locale } = await params;

  return <PlayPageClient locale={locale} />;
}
