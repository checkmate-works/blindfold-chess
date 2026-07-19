'use client';

import { useEffect, useState } from 'react';

import type { RankSlug } from '@/lib/db/data/ranks';
import type { GuestPromotionQualification } from '@/lib/games/guest-promotion';

import { getPublishPromotionTarget } from '@/app/[locale]/(public)/ranks/_actions/getPublishPromotionTarget';
import { useAuth } from '@/app/[locale]/_contexts/AuthContext';

/**
 * Given a rank requirement a game already satisfies, resolve whether the
 * signed-in caller still lacks that rank — the server-backed half of a
 * publish promotion promise. Shared by `usePublishPromotion` (this game,
 * about to be published) and `PublishNudgeBanner` (an already-finished,
 * still-unpublished game).
 *
 * Auth-gated client-side before ever calling the server: `getOptionalUser` +
 * profile-required on the server would return null anyway for a signed-out
 * or provisional caller, so skipping the round-trip here saves a wasted
 * fetch for exactly the guest-pitch audience this release targets. This is
 * the precise complement of `useGuestPromotion`'s `user !== null &&
 * !isProvisional` gate — together the two fully partition every caller with
 * no overlap and no gap.
 *
 * Resolution is atomic: the returned rank is only ever reported alongside
 * the `qualification` it was resolved for. If `qualification` changes while
 * a previous fetch is still in flight (e.g. the banner's "best game"
 * changes), the stale rank is never shown next to the new game's CTA — the
 * hook reports null until the fetch for the CURRENT qualification lands.
 */
export function usePromotionTarget(
  qualification: GuestPromotionQualification | null
): RankSlug | null {
  const { user, hasProfile, isLoading } = useAuth();
  const skip = isLoading || user == null || !hasProfile;

  const [resolved, setResolved] = useState<{
    qualification: GuestPromotionQualification;
    rank: RankSlug | null;
  } | null>(null);

  useEffect(() => {
    if (skip || !qualification) {
      setResolved(null);
      return;
    }

    let cancelled = false;
    getPublishPromotionTarget(qualification)
      .then((rank) => {
        if (!cancelled) setResolved({ qualification, rank });
      })
      .catch(() => {
        // Non-load-bearing: on failure the caller just sees no promise.
      });

    return () => {
      cancelled = true;
    };
  }, [skip, qualification]);

  if (!qualification || resolved?.qualification !== qualification) return null;
  return resolved.rank;
}
