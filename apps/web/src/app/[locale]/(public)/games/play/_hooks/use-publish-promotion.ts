'use client';

import type { FinalGameOutcome } from '@blindfold-chess/types';

import type { RankSlug } from '@/lib/db/data/ranks';
import { classifyGuestPromotionQualification } from '@/lib/games/guest-promotion';
import type { MoveOperationLog, PreferenceChangeLogEntry } from '@/lib/games/saved-game-types';

import { usePromotionTarget } from '@/app/[locale]/(public)/games/_hooks/use-promotion-target';
import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Args = {
  /** The player's terminal result. Only a win can promote. */
  result: FinalGameOutcome | null;
  /**
   * The START-OF-GAME settings snapshot, not the live folded value: this is
   * what publish persists to `games.play_settings`, and the server grades that
   * column. Anything else would let the two disagree.
   */
  initialPerGamePrefs: PerGamePreferences | undefined;
  /** Mid-game preference edits, as the play surface records them. */
  preferenceChangeLog: readonly PreferenceChangeLogEntry[] | undefined;
  /** Per-move aid counts — source of the peek total for the 1dan bar. */
  operationLogs: readonly MoveOperationLog[] | undefined;
  /** Half-moves played. */
  moveCount: number;
  /** Gate the round-trip until the game is actually over. */
  enabled: boolean;
};

/**
 * Whether publishing THIS game would promote the player, and to what.
 *
 * The rank is earned at publish, not at checkmate — the game lives in
 * localStorage until then, so winning alone grants nothing. Without this the
 * player is told "you win", sent to a screen where publishing looks optional,
 * and never learns the rank was one click away.
 *
 * Composes two independent halves: `classifyGuestPromotionQualification`
 * (the same classifier the guest pitch uses — client-side, cheap, and run
 * first so most finished games, which satisfy no rank's game requirement,
 * never cost a round-trip) and `usePromotionTarget` (the server-backed half:
 * which of those ranks the signed-in caller has not earned yet). Ranks are
 * granted independently (skip-grants allowed), so the promise holds for any
 * player, even one with no ranks at all.
 *
 * Returns the rank's slug, or null until confirmed — so the UI defaults to
 * promising nothing.
 */
export function usePublishPromotion({
  result,
  initialPerGamePrefs,
  preferenceChangeLog,
  operationLogs,
  moveCount,
  enabled,
}: Args): RankSlug | null {
  const qualification = enabled
    ? classifyGuestPromotionQualification({
        result,
        playSettings: initialPerGamePrefs,
        changeLog: preferenceChangeLog,
        operationLogs,
        moveCount,
      })
    : null;

  return usePromotionTarget(qualification);
}
