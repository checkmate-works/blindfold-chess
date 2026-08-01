import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/routing';

import { getAchievementDisplayName, getAchievementIconEmoji } from '@/lib/achievements/display';
import { isMonthlyMetadata } from '@/lib/achievements/type-guards';
import type { UserAchievementGroup } from '@/lib/db/achievement-queries';

import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  /** One entry per badge definition — see `UserAchievementGroup`. */
  achievements: UserAchievementGroup[];
  locale: string;
  /** Maximum number of badges to display. When omitted, all are shown. */
  limit?: number;
  /** Total badges earned, counting repeat wins. Defaults to the group count. */
  totalCount?: number;
  /** Username for building the "View all" link. */
  username?: string;
  labels: {
    sectionTitle: string;
    noAchievements: string;
    categoryNames: Record<string, string>;
    /** Label for the "View all" link. Only required when limit is set. */
    viewAll?: string;
  };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatYearMonth(year: number, month: number, locale: string): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
}

/**
 * Month labels for every grant in a group, newest first (the query already
 * orders `occurrences` that way). Grants whose metadata carries no year/month
 * — any future non-monthly category — are skipped rather than rendered blank.
 */
function monthLabelsOf(group: UserAchievementGroup, locale: string): string[] {
  return group.occurrences
    .filter(isMonthlyMetadata)
    .map((meta) => formatYearMonth(meta.year, meta.month, locale));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export async function ProfileAchievements({
  achievements,
  locale,
  limit,
  totalCount,
  username,
  labels,
}: Props) {
  // Root-scoped translator so `getAchievementDisplayName` can resolve
  // full-path keys like `Achievements.monthlyLeaderboard.name`. Also used for
  // the per-card count/history strings, which take an interpolated value and
  // so cannot be passed down as a plain `labels` string.
  const tRoot = await getTranslations({ locale });
  const displayCount = totalCount ?? achievements.length;
  const hasMore = limit != null && username != null && achievements.length > limit;

  if (achievements.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-base md:text-lg font-medium border-b border-border pb-2 leading-normal">
          {labels.sectionTitle}
        </h2>
        <p className="py-8 text-center text-muted-foreground">{labels.noAchievements}</p>
      </div>
    );
  }

  const displayItems = limit != null ? achievements.slice(0, limit) : achievements;

  // Group by category, preserving the query's most-recently-earned-first order.
  const grouped = new Map<string, UserAchievementGroup[]>();
  for (const achievement of displayItems) {
    const list = grouped.get(achievement.category) ?? [];
    list.push(achievement);
    grouped.set(achievement.category, list);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base md:text-lg font-medium border-b border-border pb-2 leading-normal">
        {labels.sectionTitle}{' '}
        <span className="text-muted-foreground font-normal">{displayCount}</span>
      </h2>

      {Array.from(grouped.entries()).map(([category, items]) => (
        <div key={category} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {labels.categoryNames[category] ?? category}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((item) => {
              const monthLabels = monthLabelsOf(item, locale);
              const isRepeat = item.timesEarned > 1;

              return (
                <div
                  key={item.slug}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors"
                >
                  {/* Icon */}
                  <span className="text-2xl leading-none" role="img" aria-label={item.iconKey}>
                    {getAchievementIconEmoji(item.iconKey)}
                  </span>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 text-sm font-medium text-foreground truncate">
                        {getAchievementDisplayName(item, tRoot)}
                      </p>
                      {isRepeat && (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                          {tRoot('publicProfile.achievementTimesEarned', {
                            count: item.timesEarned,
                          })}
                        </span>
                      )}
                    </div>

                    {monthLabels[0] && (
                      <p className="text-xs text-muted-foreground mt-0.5">{monthLabels[0]}</p>
                    )}

                    {/* Repeat wins collapse into a native disclosure so the
                        card stays one line tall until the reader opens it. */}
                    {isRepeat && monthLabels.length > 1 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                          {tRoot('publicProfile.achievementEarnedMonths')}
                        </summary>
                        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                          {monthLabels.map((label, index) => (
                            <li key={`${item.slug}-${label}-${index}`}>{label}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {hasMore && labels.viewAll && (
        <div className="text-center">
          <Link
            href={`/u/${username}/achievements`}
            locale={locale}
            className={`text-sm ${TEXT_LINK_CLASSES}`}
          >
            {labels.viewAll}
          </Link>
        </div>
      )}
    </div>
  );
}
