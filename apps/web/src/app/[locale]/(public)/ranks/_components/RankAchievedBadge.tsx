'use client';

import { useEffect, useState } from 'react';

import { HiCheckCircle } from 'react-icons/hi2';

import type { RankSlug } from '@/lib/db/data/ranks';

import { useAuth } from '@/app/[locale]/_contexts/AuthContext';

import { getCurrentUserAchievedRankSlugs } from '../_actions/getCurrentUserAchievedRankSlugs';

type Props = {
  slug: RankSlug;
  label: string;
};

/**
 * Achievement checkmark for the rank detail page (`/ranks/[slug]`).
 *
 * Client-fetched, same pattern as `RanksGrid`: the detail page itself stays
 * statically generated (`generateStaticParams`), and per-user achievement
 * state is overlaid after hydration. Renders nothing for anonymous
 * visitors or when this specific rank isn't achieved.
 *
 * Uses the EFFECTIVE achieved set (`getCurrentUserAchievedRankSlugs` /
 * `resolveEffectiveAchievedSlugs`): a 1dan holder sees this checkmark on
 * the 5kyu–1kyu detail pages too, not just 1dan's own page — consistent
 * with the ranks grid and dojo curriculum checkmarks.
 */
export function RankAchievedBadge({ slug, label }: Props) {
  const { user, isLoading: authLoading } = useAuth();
  const [isAchieved, setIsAchieved] = useState(false);

  useEffect(() => {
    if (authLoading || !user) {
      setIsAchieved(false);
      return;
    }
    let cancelled = false;
    getCurrentUserAchievedRankSlugs()
      .then((slugs) => {
        if (!cancelled) setIsAchieved(slugs.includes(slug));
      })
      .catch(() => {
        // Non-load-bearing: failures just leave the badge hidden.
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, slug]);

  if (!isAchieved) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"
      data-testid="rank-achieved-badge"
    >
      <HiCheckCircle className="size-4 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
