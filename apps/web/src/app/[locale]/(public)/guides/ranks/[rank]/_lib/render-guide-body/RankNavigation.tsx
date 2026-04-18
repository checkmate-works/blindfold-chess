import type { ReactNode } from 'react';

import { buildGuidePath } from '@/lib/guides';

import type { GuideContext } from './context';

/**
 * Prev / next rank guide links, rendered on the last page of a flat guide
 * and on every chapter body page. Either side collapses silently when there
 * is no adjacent guided rank — e.g. mukyu has no previous, 3kyu currently
 * has no next because 2kyu has no guide content yet.
 */
export function RankNavigation({ ctx }: { ctx: GuideContext }): ReactNode {
  const { locale, tGuides, prevRank, nextRank } = ctx;
  if (!prevRank && !nextRank) return null;

  return (
    <nav
      aria-label="Rank guide navigation"
      className="mt-6 flex items-center justify-between gap-4"
    >
      {prevRank ? (
        <a
          href={buildGuidePath(locale, prevRank.slug, { kind: 'root' })}
          className="text-sm text-link-primary hover:underline"
        >
          ← {tGuides('navigation.prevRank', { rankName: prevRank.rankName })}
        </a>
      ) : (
        <span />
      )}
      {nextRank ? (
        <a
          href={buildGuidePath(locale, nextRank.slug, { kind: 'root' })}
          className="text-sm text-link-primary hover:underline"
        >
          {tGuides('navigation.nextRank', { rankName: nextRank.rankName })} →
        </a>
      ) : (
        <span />
      )}
    </nav>
  );
}
