import type { UserAchievementRow } from '@/lib/db/achievement-queries';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  achievements: UserAchievementRow[];
  locale: string;
  labels: {
    sectionTitle: string;
    noAchievements: string;
    categoryNames: Record<string, string>;
    achievedOn: string;
  };
};

type MonthlyLeaderboardMetadata = {
  year: number;
  month: number;
  score?: number;
  placement?: number;
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

function isMonthlyMetadata(metadata: unknown): metadata is MonthlyLeaderboardMetadata {
  if (typeof metadata !== 'object' || metadata === null) return false;
  const m = metadata as Record<string, unknown>;
  return typeof m.year === 'number' && typeof m.month === 'number';
}

function formatYearMonth(year: number, month: number, locale: string): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
}

function formatDate(date: Date, locale: string): string {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Derive a display-friendly badge name from slug.
 * Example: "monthly-coordinate_quiz-white-1st" -> "Monthly Coordinate Quiz White 1st"
 *
 * TODO: This is a provisional display-name generator. In the future, badge
 * display names should be defined in i18n message files and looked up by slug.
 * At that point this function can serve as a fallback or be removed entirely.
 */
function slugToDisplayName(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfileAchievements({ achievements, locale, labels }: Props) {
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

  // Group by category
  const grouped = new Map<string, UserAchievementRow[]>();
  for (const achievement of achievements) {
    const list = grouped.get(achievement.category) ?? [];
    list.push(achievement);
    grouped.set(achievement.category, list);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base md:text-lg font-medium border-b border-border pb-2 leading-normal">
        {labels.sectionTitle}{' '}
        <span className="text-muted-foreground font-normal">{achievements.length}</span>
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
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {labels.achievedOn} {formatDate(item.achievedAt, locale)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
