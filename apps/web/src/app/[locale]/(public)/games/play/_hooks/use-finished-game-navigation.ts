'use client';

import { useCallback, useEffect } from 'react';

import { useRouter } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import { buildPostmortemPath } from '../_lib';
import { useSharedGameLink } from './use-shared-game-link';

type PostmortemArgs = Parameters<typeof buildPostmortemPath>[0];

type Params = {
  locale: Locale;
  /** Review mode (`?finished=1`): skip prefetching the result route. */
  isFinishedView: boolean;
  gameId: string | undefined;
  // Postmortem path inputs (types derived from buildPostmortemPath).
  formattedPgn: PostmortemArgs['formattedPgn'];
  playerSide: PostmortemArgs['playerColor'];
  moves: PostmortemArgs['moves'];
  engineConfig: PostmortemArgs['engineConfig'];
  startingFen: PostmortemArgs['startingFen'];
};

type Result = {
  /** Navigate to the result page for the current game. */
  handleViewResult: () => void;
  /**
   * Navigate to the postmortem ("Recall"). Anonymous viewers are NOT gated
   * here — the members-only sign-up CTA is shown on the postmortem page itself,
   * so the prompt appears after navigating rather than over the finish modal.
   */
  openPostmortem: () => void;
  /** Publish this game (or open it if already published from this browser). */
  handleShare: () => void;
  /** Whether this game was already published from this browser. */
  isShared: boolean;
};

/**
 * The finished-game navigation hub for the play screen: it prefetches the
 * result route and exposes the actions the game-finished modal wires to —
 * "view result", the postmortem ("Recall"), and Share.
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
  // `handleViewResult` / `openPostmortem` below are the modal's actions. The
  // result route is still prefetched above so the Result card navigates
  // instantly.

  const handleViewResult = useCallback(() => {
    if (gameId) router.push(`/${locale}/games/play/result?gameId=${gameId}`);
  }, [router, locale, gameId]);

  const openPostmortem = useCallback(() => {
    if (!gameId) return;
    router.push(
      buildPostmortemPath({
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

  // Share routing (open the published game vs. the publish form), shared with
  // the result page (ResultClient) via useSharedGameLink.
  const { handleShare, isShared } = useSharedGameLink({ locale, gameId });

  return {
    handleViewResult,
    openPostmortem,
    handleShare,
    isShared,
  };
}
