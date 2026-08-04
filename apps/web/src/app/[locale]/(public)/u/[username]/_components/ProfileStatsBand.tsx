import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { getAchievementIconEmoji } from '@/lib/achievements/display';
import { type UserAchievementGroup, countTotalEarned } from '@/lib/db/achievement-queries';
import type { RankSlug } from '@/lib/db/data/ranks';

import { getBeltColorHex, isWhiteBelt } from '@/app/[locale]/(public)/dojo/ranks/_lib/belt-colors';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  username: string;
  locale: Locale;
  /** Highest rank actually held, or `null` for an unranked (mukyu) member. */
  rankSlug: RankSlug | null;
  /** One entry per badge definition, most recently earned first. */
  achievements: UserAchievementGroup[];
};

/** Achievement icons shown inline before the count spills into "view all". */
const ICON_PREVIEW_LIMIT = 5;

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
 */
export async function ProfileStatsBand({ username, locale, rankSlug, achievements }: Props) {
  const [t, tRanks] = await Promise.all([
    getTranslations({ locale, namespace: 'publicProfile' }),
    getTranslations({ locale, namespace: 'ranks' }),
  ]);

  const beltColor = rankSlug ? getBeltColorHex(rankSlug) : null;
  const previewIcons = achievements.slice(0, ICON_PREVIEW_LIMIT);
  const achievementCount = countTotalEarned(achievements);

  if (!rankSlug && achievementCount === 0) {
    return null;
  }

  return (
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
  );
}
