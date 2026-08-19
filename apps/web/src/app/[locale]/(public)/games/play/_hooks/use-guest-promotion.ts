'use client';

import type {
  FinishedGameEvidence,
  GuestPromotionQualification,
} from '@/lib/games/guest-promotion';
import { classifyGuestPromotionQualification } from '@/lib/games/guest-promotion';

import { useAuth } from '@/app/[locale]/_contexts/AuthContext';

type Args = FinishedGameEvidence & {
  /** Gate until the game is actually over. */
  enabled: boolean;
};

/**
 * The signed-out sibling of `usePublishPromotion`: which rank requirement
 * this finished game satisfies, for the guest pitch in the finish modal.
 *
 * `usePublishPromotion` answers "would publishing promote YOU right now?" —
 * which needs the server (has this user already earned the rank?). For a
 * guest there is no account to consult, so this hook answers entirely
 * client-side: "does this game satisfy the 1kyu / 1dan game requirement?"
 * Ranks are granted independently (skip-grants allowed), so the pitch can
 * promise promotion outright: sign up, publish, and the rank is granted —
 * no lower ranks needed.
 *
 * Returns null for confirmed signed-in users (the server-backed promotion
 * owns them). Provisional users (signed in, no profile) are included: their
 * publishes are anonymous too, so the same pitch applies.
 */
export function useGuestPromotion({
  enabled,
  ...evidence
}: Args): GuestPromotionQualification | null {
  const { user, isProvisional, isLoading } = useAuth();

  if (!enabled || isLoading) return null;
  if (user !== null && !isProvisional) return null;

  return classifyGuestPromotionQualification(evidence);
}
