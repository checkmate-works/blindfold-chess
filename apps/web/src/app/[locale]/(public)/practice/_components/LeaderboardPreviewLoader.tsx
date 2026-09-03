'use client';

import { useEffect, useState } from 'react';

import type { LeaderboardModule } from '@/app/[locale]/(public)/leaderboard/_lib/types';

import { getLeaderboardPreview } from '../_actions/getLeaderboardPreview';
import type { LeaderboardPreviewData } from '../_lib/resolveLeaderboardWithFallback';
import { LeaderboardPreview } from './LeaderboardPreview';

type Props = {
  module: LeaderboardModule;
  defaultKey: string;
  locale: string;
};

/**
 * Fetch the practice landing page's TOP3 teaser after hydration and hand it to
 * {@link LeaderboardPreview}.
 *
 * Fetched after hydration so the landing pages read no leaderboard data
 * during their static render; {@link getLeaderboardPreview} explains why that
 * matters. A side effect is that the teaser is live rather than up to a
 * minute stale.
 *
 * Nothing renders until the rows arrive. The teaser sits below the fold under
 * the related-articles block, and `LeaderboardPreview` already renders nothing
 * for an empty board, so a placeholder would be reserving space that is
 * legitimately empty on a module nobody has played yet.
 */
export function LeaderboardPreviewLoader({ module, defaultKey, locale }: Props) {
  const [data, setData] = useState<LeaderboardPreviewData | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLeaderboardPreview(module, defaultKey)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        // A failed teaser is not worth surfacing: the page's actual content is
        // the practice module above it, and the "view more" link the teaser
        // would have carried is duplicated in the global navigation.
      });
    return () => {
      cancelled = true;
    };
  }, [module, defaultKey]);

  if (!data) return null;

  return (
    <LeaderboardPreview
      rows={data.rows}
      detailPath={data.detailPath}
      period={data.period}
      locale={locale}
    />
  );
}
