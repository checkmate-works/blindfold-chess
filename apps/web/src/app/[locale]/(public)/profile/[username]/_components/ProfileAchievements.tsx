import { Link } from '@/i18n/routing';

import { slugToDisplayName } from '@/lib/achievements/display';
import { isMonthlyMetadata } from '@/lib/achievements/type-guards';
import type { UserAchievementRow } from '@/lib/db/achievement-queries';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  achievements: UserAchievementRow[];
  locale: string;
  /** Maximum number of badges to display. When omitted, all are shown. */
  limit?: number;
  /** Total count of achievements (needed to decide whether to show "View all"). */
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

const ICON_MAP: Record<string, string> = {
  'trophy-gold': '\u{1F947}',
  'trophy-silver': '\u{1F948}',
  'trophy-bronze': '\u{1F949}',
};

function getIconForKey(iconKey: string): string {
  return ICON_MAP[iconKey] ?? '\u{1F3C6}';
}

function formatYearMonth(year: number, month: number, locale: string): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfileAchievements({
  achievements,
  locale,
  limit,
  totalCount,
  username,
  labels,
}: Props) {
  const displayCount = totalCount ?? achievements.length;
  const hasMore = limit != null && username != null && displayCount > limit;

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

  // When limit is specified, show a flat list (no category grouping) of the most recent items
  const displayItems = limit != null ? achievements.slice(0, limit) : achievements;

  // Group by category (used only in full view)
  const grouped = new Map<string, UserAchievementRow[]>();
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
              const meta = item.metadata;
              const monthLabel = isMonthlyMetadata(meta)
                ? formatYearMonth(meta.year, meta.month, locale)
                : null;

              return (
                <div
                  key={`${item.slug}-${item.achievedAt.toISOString()}`}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors"
                >
                  {/* Icon */}
                  <span className="text-2xl leading-none" role="img" aria-label={item.iconKey}>
                    {getIconForKey(item.iconKey)}
                  </span>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {slugToDisplayName(item.slug)}
                    </p>
                    {monthLabel && (
                      <p className="text-xs text-muted-foreground mt-0.5">{monthLabel}</p>
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
            href={`/@/${username}/achievements`}
            locale={locale}
            className="text-sm text-primary hover:underline"
          >
            {labels.viewAll}
          </Link>
        </div>
      )}
    </div>
  );
}
