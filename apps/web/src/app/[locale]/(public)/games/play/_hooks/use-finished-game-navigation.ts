'use client';

import { useCallback, useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useAuthGuard } from '@/app/[locale]/_hooks/use-auth-guard';
import type { Locale } from '@/app/[locale]/_lib/types';

import { buildPostmortemPath } from '../_lib';

type PostmortemArgs = Parameters<typeof buildPostmortemPath>[0];

type Params = {
  locale: Locale;
  /** Whether the game has reached a terminal result. */
  isFinished: boolean;
  /** Review mode (`?finished=1`): suppress the auto-redirect to the result page. */
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
  /** Open the postmortem, gated behind the members-only auth prompt. */
  openPostmortem: () => void;
  isAuthModalOpen: boolean;
  closeAuthModal: () => void;
};

/**
 * The finished-game navigation hub for the play screen, extracted from
 * `PlayClient`: it auto-redirects to the result page when a game ends (unless
 * the page is in `?finished=1` review mode), and exposes the cross-links out of
 * the finished-game review — "view result" and the members-only postmortem,
 * which routes anonymous viewers through the auth-guard sign-up prompt.
 */
export function useFinishedGameNavigation({
  locale,
  isFinished,
  isFinishedView,
  gameId,
  formattedPgn,
  playerSide,
  moves,
  engineConfig,
  startingFen,
}: Params): Result {
  const router = useRouter();
  const { guardAction, isModalOpen, closeModal } = useAuthGuard();

  // Redirect to result page when the game ends — UNLESS we are intentionally
  // reviewing a finished game (`finished=1`), in which case we stay here and
  // render the read-only FinishedGamePanel.
  useEffect(() => {
    if (isFinishedView) return;
    if (isFinished && gameId) {
      router.replace(`/${locale}/games/play/result?gameId=${gameId}`);
    }
  }, [isFinishedView, isFinished, gameId, locale, router]);

  const handleViewResult = useCallback(() => {
    if (gameId) router.push(`/${locale}/games/play/result?gameId=${gameId}`);
  }, [router, locale, gameId]);

  const handleOpenPostmortem = useCallback(() => {
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

  const openPostmortem = useCallback(
    () => guardAction(handleOpenPostmortem),
    [guardAction, handleOpenPostmortem]
  );

  return {
    handleViewResult,
    openPostmortem,
    isAuthModalOpen: isModalOpen,
    closeAuthModal: closeModal,
  };
}
