'use client';

import type { GuestPromotionQualification } from '@/lib/games/guest-promotion';
import { classifyGuestPromotionQualification } from '@/lib/games/guest-promotion';
import type { MoveOperationLog, PreferenceChangeLogEntry } from '@/lib/games/saved-game-types';

import { useAuth } from '@/app/[locale]/_contexts/AuthContext';
import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Args = {
  /** The player's terminal result. Only a win can qualify. */
  result: 'win' | 'loss' | 'draw' | null;
  /** The START-OF-GAME settings snapshot — what publish would persist. */
  initialPerGamePrefs: PerGamePreferences | undefined;
  /** Mid-game preference edits, as the play surface records them. */
  preferenceChangeLog: readonly PreferenceChangeLogEntry[] | undefined;
  /** Per-move aid counts — source of the peek total. */
  operationLogs: readonly MoveOperationLog[] | undefined;
  /** Half-moves played. */
  moveCount: number;
  /** Gate until the game is actually over. */
  enabled: boolean;
};

/**
 * The signed-out sibling of `usePublishPromotion`: which rank requirement
 * this finished game satisfies, for the guest pitch in the finish modal.
 *
 * `usePublishPromotion` answers "would publishing promote YOU right now?" —
 * a question only the server can answer, and only for a signed-in player one
 * rung away. For a guest there is no progression to consult, so this hook
 * answers the weaker question entirely client-side: "does this game satisfy
 * the 1kyu / 1dan game requirement?" The pitch built on it must stay honest —
 * progression is linear from 5kyu, so the copy promises "counts when you get
 * there", never "you'll be promoted".
 *
 * Returns null for confirmed signed-in users (the server-backed promotion
 * owns them). Provisional users (signed in, no profile) are included: their
 * publishes are anonymous too, so the same pitch applies.
 */
export function useGuestPromotion({
  result,
  initialPerGamePrefs,
  preferenceChangeLog,
  operationLogs,
  moveCount,
  enabled,
}: Args): GuestPromotionQualification | null {
  const { user, isProvisional, isLoading } = useAuth();

  if (!enabled || isLoading) return null;
  if (user !== null && !isProvisional) return null;

  return classifyGuestPromotionQualification({
    result,
    playSettings: initialPerGamePrefs,
    changeLog: preferenceChangeLog,
    operationLogs,
    moveCount,
  });
}
