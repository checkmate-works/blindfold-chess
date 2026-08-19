'use client';

import type { RankSlug } from '@/lib/db/data/ranks';
import type { FinishedGameEvidence } from '@/lib/games/guest-promotion';
import { classifyGuestPromotionQualification } from '@/lib/games/guest-promotion';

import { usePromotionTarget } from '@/app/[locale]/(public)/games/_hooks/use-promotion-target';

type Args = FinishedGameEvidence & {
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
export function usePublishPromotion({ enabled, ...evidence }: Args): RankSlug | null {
  const qualification = enabled ? classifyGuestPromotionQualification(evidence) : null;

  return usePromotionTarget(qualification);
}
