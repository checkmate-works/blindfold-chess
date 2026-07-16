'use client';

import { useCallback, useEffect } from 'react';

import { useRouter } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import { buildKataPath, buildRecallPath } from '../_lib';
import { useSharedGameLink } from './use-shared-game-link';

type RecallArgs = Parameters<typeof buildRecallPath>[0];

type Params = {
  locale: Locale;
  /** Review mode (`?finished=1`): skip prefetching the result route. */
  isFinishedView: boolean;
  gameId: string | undefined;
  // Recall path inputs (types derived from buildRecallPath).
  formattedPgn: RecallArgs['formattedPgn'];
  playerSide: RecallArgs['playerColor'];
  moves: RecallArgs['moves'];
  engineConfig: RecallArgs['engineConfig'];
  startingFen: RecallArgs['startingFen'];
};

type Result = {
  /** Navigate to the result page for the current game. */
  handleViewResult: () => void;
  /** Navigate to Recall — open to everyone, no sign-up required. */
  openRecall: () => void;
  /** Navigate to the Kata check — compare the opening against registered 型. */
  openKata: () => void;
  /** Publish this game (or open it if already published from this browser). */
  handleShare: () => void;
  /** Whether this game was already published from this browser. */
  isShared: boolean;
};

/**
 * The finished-game navigation hub for the play screen: it prefetches the
 * result route and exposes the actions the game-finished modal wires to —
 * "view result", Recall, Kata, and Share.
 */
export function useFinishedGameNavigation({
  locale,
  isFinishedView,
  gameId,
  formattedPgn,
  playerSide,
  moves,
  engineConfig,
  startingFen,
}: Params): Result {
  const router = useRouter();

  // Warm the result route ahead of the on-finish redirect. That redirect is a
  // programmatic (non-prefetched) navigation to a dynamic route, so without
  // this its `loading.tsx` shell — the result skeleton — only paints after a
  // server round-trip, leaving a blank gap. Prefetch keys on the pathname; the
  // `?gameId` query is irrelevant to the prefetched shell. Skipped in review
  // mode, which never redirects.
  useEffect(() => {
    if (isFinishedView) return;
    router.prefetch(`/${locale}/games/play/result`);
  }, [isFinishedView, locale, router]);

  // NOTE: game end no longer auto-redirects. `PlayClient` shows the
  // game-finished modal (Result / Game Review / Kata) over the finished board;
  // `handleViewResult` / `openRecall` below are the modal's actions. The
  // result route is still prefetched above so the Result card navigates
  // instantly.

  // Share routing (open the published game vs. the publish form) plus the
  // published-game id when this game was already shared from this browser —
  // shared with the result page (ResultClient) via useSharedGameLink.
  const { handleShare, isShared, sharedPublishedId } = useSharedGameLink({ locale, gameId });

  const handleViewResult = useCallback(() => {
    if (!gameId) return;
    // A published game's canonical review is the shared page (real comments /
    // chunks / likes), so go straight there instead of the local result screen
    // — which would only redirect there anyway (see ResultClient), flashing its
    // skeleton on the way. Unpublished games open the result screen as before.
    router.push(
      sharedPublishedId
        ? `/${locale}/games/shared/${sharedPublishedId}`
        : `/${locale}/games/play/result?gameId=${gameId}`
    );
  }, [router, locale, gameId, sharedPublishedId]);

  const openRecall = useCallback(() => {
    if (!gameId) return;
    router.push(
      buildRecallPath({
        locale,
        formattedPgn,
        playerColor: playerSide,
        moves,
        engineConfig,
        gameId,
        startingFen,
      })
    );
  }, [router, locale, formattedPgn, playerSide, moves, engineConfig, gameId, startingFen]);

  const openKata = useCallback(() => {
    if (!gameId) return;
    router.push(
      buildKataPath({
        locale,
        moves,
        playerColor: playerSide,
        gameId,
        startingFen,
      })
    );
  }, [router, locale, moves, playerSide, gameId, startingFen]);

  return {
    handleViewResult,
    openRecall,
    openKata,
    handleShare,
    isShared,
  };
}
