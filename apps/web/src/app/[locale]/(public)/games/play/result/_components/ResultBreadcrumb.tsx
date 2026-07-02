'use client';

import { engineConfigToUrlParams } from '@/lib/engines';

import { BreadcrumbContent } from '@/app/[locale]/_components/Breadcrumb';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useLoadGame } from '../_hooks/useLoadGame';

type Props = {
  locale: Locale;
  /** The finished game's localStorage id (from `?gameId`). */
  gameId: string | undefined;
  /** "Games" — links to the games list. */
  gamesLabel: string;
  /** "Game" — links back to the finished-game view. */
  gameLabel: string;
  /** Current page label ("Game Review"). */
  resultLabel: string;
  brandName: string;
};

/**
 * Result-screen breadcrumb: `Games > Game > Review`. The middle "Game" step
 * links back to the finished-game view (`/games/play?…&finished=1`) — the screen
 * from which Recall (postmortem) is reachable — so the result screen itself no
 * longer needs prominent postmortem / open-game buttons; this review is the main
 * destination and the game is one tap away here.
 *
 * The finished-game URL needs the game's colour + engine, which the play screen
 * reads from the URL rather than the saved record, and those live only in
 * localStorage — so the link is built client-side from the loaded game. Until it
 * loads (or if it can't be found) the Game step falls back to the games list, so
 * the breadcrumb is always navigable.
 */
export function ResultBreadcrumb({
  locale,
  gameId,
  gamesLabel,
  gameLabel,
  resultLabel,
  brandName,
}: Props) {
  const loadState = useLoadGame(gameId ?? null);

  let gameHref = '/games';
  if (loadState.status === 'loaded' && gameId) {
    const { game } = loadState;
    const params = new URLSearchParams({
      color: game.playerColor,
      ...engineConfigToUrlParams(game.engineConfig),
      moves: JSON.stringify(game.moves),
      gameId,
      finished: '1',
    });
    gameHref = `/games/play?${params.toString()}`;
  }

  return (
    <BreadcrumbContent
      items={[
        { label: gamesLabel, href: '/games' },
        { label: gameLabel, href: gameHref },
        { label: resultLabel },
      ]}
      locale={locale}
      brandName={brandName}
      density="compact"
    />
  );
}
