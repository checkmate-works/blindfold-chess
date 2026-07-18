'use client';

import { useEffect, useState } from 'react';

import type { RankSlug } from '@/lib/db/data/ranks';
import { classifyGuestPromotionQualification } from '@/lib/games/guest-promotion';
import type { MoveOperationLog, PreferenceChangeLogEntry } from '@/lib/games/saved-game-types';

import { getPublishPromotionTarget } from '@/app/[locale]/(public)/ranks/_actions/getPublishPromotionTarget';
import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Args = {
  /** The player's terminal result. Only a win can promote. */
  result: 'win' | 'loss' | 'draw' | null;
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
 * Split across the boundary along what each side knows: the client owns the
 * game and classifies which rank requirement it satisfies (the same
 * `classifyGuestPromotionQualification` the guest pitch uses — so the two
 * pitches and the server evaluator cannot drift apart); the server owns the
 * achievement state and answers which of those ranks is still unearned.
 * Ranks are granted independently (skip-grants allowed), so the promise
 * holds for any player, even one with no ranks at all.
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
  const [target, setTarget] = useState<RankSlug | null>(null);

  // Cheap local disqualifier first — most finished games satisfy no rank's
  // game requirement, and those must not cost a round-trip.
  const qualification = classifyGuestPromotionQualification({
    result,
    playSettings: initialPerGamePrefs,
    changeLog: preferenceChangeLog,
    operationLogs,
    moveCount,
  });

  useEffect(() => {
    if (!enabled || !qualification) {
      setTarget(null);
      return;
    }

    let cancelled = false;
    getPublishPromotionTarget(qualification)
      .then((next) => {
        if (!cancelled) setTarget(next);
      })
      .catch(() => {
        // Non-load-bearing: on failure the player just gets the ordinary finish
        // modal, and publishing still grants the rank. Better a missed nudge
        // than a broken end-of-game screen.
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, qualification]);

  return target;
}
