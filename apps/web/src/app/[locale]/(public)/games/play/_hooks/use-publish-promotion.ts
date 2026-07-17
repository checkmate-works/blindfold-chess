'use client';

import { useEffect, useState } from 'react';

import type { RankSlug } from '@/lib/db/data/ranks';
import { isConstrainedPlaySettings } from '@/lib/games/play-settings-constraint';

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
 * Split across the boundary along what each side knows: the server owns the
 * belt progression (is this rank next? is it earned by playing?), the client
 * owns the game. The game half reuses `isConstrainedPlaySettings` — the very
 * predicate the server evaluator runs against the published row — so the
 * promise made here and the grant made later cannot drift apart.
 *
 * Returns the rank's slug, or null until confirmed — so the UI defaults to
 * promising nothing.
 */
export function usePublishPromotion({
  result,
  initialPerGamePrefs,
  enabled,
}: Args): RankSlug | null {
  const [target, setTarget] = useState<RankSlug | null>(null);

  // Cheap local disqualifiers first — most finished games are not a constrained
  // win, and those must not cost a round-trip.
  const gameQualifies = result === 'win' && isConstrainedPlaySettings(initialPerGamePrefs);

  useEffect(() => {
    if (!enabled || !gameQualifies) {
      setTarget(null);
      return;
    }

    let cancelled = false;
    getPublishPromotionTarget()
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
  }, [enabled, gameQualifies]);

  return target;
}
