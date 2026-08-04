import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';
import { HiTrophy } from 'react-icons/hi2';

import { type UserAchievementGroup, countTotalEarned } from '@/lib/db/achievement-queries';
import type { RankSlug } from '@/lib/db/data/ranks';

import { BeltRankBadge } from '@/app/[locale]/(public)/dojo/_components/BeltRankBadge';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  username: string;
  locale: Locale;
  /** Highest rank actually held, or `null` for an unranked (mukyu) member. */
  rankSlug: RankSlug | null;
  /** One entry per badge definition, most recently earned first. */
  achievements: UserAchievementGroup[];
};

/**
 * The "what this member has earned" band: belt rank and achievement badges,
 * pinned directly under the identity header, above the tab row. Renders
 * nothing for a member with neither.
 *
 * @design Why this is not a section further down the page
 * The timeline below it scrolls forever, so anything placed after it is
 * unreachable in practice. Achievements used to sit at the bottom of the
 * profile; a standing summary at the top is what makes them survive the move
 * to a timeline — and it puts a member's rank on screen without a scroll,
 * which the tab layout never did.
 *
 * Navigation into the archives is the tab row's job, not this band's — the two
 * used to share the space, one as counts and one as tabs, which made the same
 * destinations look like two different controls.
 *
 * @design Both badges are the app's shared vocabulary
 * The rank reuses `BeltRankBadge` so a member's belt looks the same here as on
 * the practice and games pages. The achievements badge leads with the same
 * trophy the achievement notification uses, and says what it is: a bare row of
 * medal emoji read as decoration rather than as the way into the achievements
 * page, which is where the link had effectively gone.
 */
export async function ProfileStatsBand({ username, locale, rankSlug, achievements }: Props) {
  const [t, tRanks] = await Promise.all([
    getTranslations({ locale, namespace: 'publicProfile' }),
    getTranslations({ locale, namespace: 'ranks' }),
  ]);

  const achievementCount = countTotalEarned(achievements);

  if (!rankSlug && achievementCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {rankSlug && (
        <BeltRankBadge
          slug={rankSlug}
          label={tRanks(`rankNames.${rankSlug}` as 'rankNames.1dan')}
          locale={locale}
          meaning="held"
        />
      )}

      {achievementCount > 0 && (
        <Link
          href={`/u/${username}/achievements`}
          locale={locale}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold leading-none text-muted-foreground shadow-sm transition-colors hover:border-foreground/20 hover:text-foreground"
        >
          <HiTrophy className="size-3.5 text-amber-500" aria-hidden />
          {t('achievementsSection')}
          <span className="tabular-nums">{achievementCount}</span>
        </Link>
      )}
    </div>
  );
}
