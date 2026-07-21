import type { ReactNode } from 'react';

import Link from 'next/link';

import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

type Translator = (key: string, values?: Record<string, string | number | Date>) => string;

function getAdjacentRankSlug(currentSlug: RankSlug, step: -1 | 1): RankSlug | null {
  const index = ALL_RANK_SLUGS.indexOf(currentSlug);
  const adjacentIndex = index + step;
  return adjacentIndex >= 0 && adjacentIndex < ALL_RANK_SLUGS.length
    ? ALL_RANK_SLUGS[adjacentIndex]
    : null;
}

/**
 * Prev / next rank links, rendered on every `/dojo/ranks/[slug]` detail
 * page. Unlike the guides' `RankNavigation` (which skips ranks with no
 * guide content), every entry in `ALL_RANK_SLUGS` has a detail page, so
 * adjacency here is a plain array walk with no existence filtering.
 */
export function RankNavigation({
  locale,
  slug,
  t,
}: {
  locale: Locale;
  slug: RankSlug;
  t: Translator;
}): ReactNode {
  const prevSlug = getAdjacentRankSlug(slug, -1);
  const nextSlug = getAdjacentRankSlug(slug, 1);
  if (!prevSlug && !nextSlug) return null;

  return (
    <nav aria-label="Rank navigation" className="flex items-center justify-between gap-4">
      {prevSlug ? (
        <Link href={`/${locale}/dojo/ranks/${prevSlug}`} className={`text-sm ${TEXT_LINK_CLASSES}`}>
          ← {t('detail.prevRank', { rankName: t(`rankNames.${prevSlug}`) })}
        </Link>
      ) : (
        <span />
      )}
      {nextSlug ? (
        <Link href={`/${locale}/dojo/ranks/${nextSlug}`} className={`text-sm ${TEXT_LINK_CLASSES}`}>
          {t('detail.nextRank', { rankName: t(`rankNames.${nextSlug}`) })} →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
