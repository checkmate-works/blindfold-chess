import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { getAchievementIconEmoji } from '@/lib/achievements/display';
import { type UserAchievementGroup, countTotalEarned } from '@/lib/db/achievement-queries';
import type { RankSlug } from '@/lib/db/data/ranks';

import { getBeltColorHex, isWhiteBelt } from '@/app/[locale]/(public)/dojo/ranks/_lib/belt-colors';
import { FOCUS_RING_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { type ProfileArchive, profileArchiveHref } from '../_lib/profile-archive-href';

type Props = {
  username: string;
  locale: Locale;
  /** Highest rank actually held, or `null` for an unranked (mukyu) member. */
  rankSlug: RankSlug | null;
  /** One entry per badge definition, most recently earned first. */
  achievements: UserAchievementGroup[];
  postsCount: number;
  problemsCount: number;
  gamesCount: number;
};

/** Achievement icons shown inline before the count spills into "view all". */
const ICON_PREVIEW_LIMIT = 5;

/**
 * The "who this member is" band: belt rank, achievement badges, and the size
 * of each archive — pinned directly under the identity header, above the
 * timeline.
 *
 * @design Why this is not a section further down the page
 * The timeline below it scrolls forever, so anything placed after it is
 * unreachable in practice. Achievements used to sit at the bottom of the
 * profile; a standing summary at the top is what makes them survive the move
 * to a timeline — and it puts a member's rank on screen without a scroll,
 * which the tab layout never did.
 *
 * Counts double as the navigation into the archives, replacing the tab row
 * the timeline no longer carries.
 */
export async function ProfileStatsBand({
  username,
  locale,
  rankSlug,
  achievements,
  postsCount,
  problemsCount,
  gamesCount,
}: Props) {
  const [t, tRanks] = await Promise.all([
    getTranslations({ locale, namespace: 'publicProfile' }),
    getTranslations({ locale, namespace: 'ranks' }),
  ]);

  const beltColor = rankSlug ? getBeltColorHex(rankSlug) : null;
  const previewIcons = achievements.slice(0, ICON_PREVIEW_LIMIT);
  const achievementCount = countTotalEarned(achievements);

  const counts: { archive: ProfileArchive; label: string; value: number }[] = [
    { archive: 'topics', label: t('topicsTab'), value: postsCount },
    { archive: 'problems', label: t('problemsTab'), value: problemsCount },
    { archive: 'games', label: t('gamesTab'), value: gamesCount },
  ];

  return (
    <div className="space-y-3" data-tour-id="profile-stats-band">
      {(rankSlug || achievementCount > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {rankSlug && beltColor && (
            <Link
              href="/dojo/ranks"
              locale={locale}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-foreground/20"
            >
              <span
                className={`inline-block size-2.5 rounded-full ${
                  isWhiteBelt(beltColor) ? 'border border-border' : ''
                }`}
                style={{ backgroundColor: beltColor }}
                aria-hidden
              />
              {tRanks(`rankNames.${rankSlug}` as 'rankNames.1dan')}
            </Link>
          )}

          {achievementCount > 0 && (
            <Link
              href={`/u/${username}/achievements`}
              locale={locale}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
              aria-label={t('achievementsSection')}
            >
              <span aria-hidden>
                {previewIcons.map((a) => getAchievementIconEmoji(a.iconKey)).join('')}
              </span>
              <span className="tabular-nums">{achievementCount}</span>
            </Link>
          )}
        </div>
      )}

      <nav
        className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground"
        aria-label={t('archivesAriaLabel')}
      >
        {counts.map((count) => (
          <Link
            key={count.archive}
            href={profileArchiveHref(username, count.archive)}
            locale={locale}
            className={`rounded-sm transition-colors hover:text-foreground ${FOCUS_RING_CLASSES}`}
          >
            <span className="font-semibold text-foreground tabular-nums">{count.value}</span>{' '}
            {count.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
