/**
 * Derive a display-friendly badge name from slug.
 * Example: "monthly-coordinate_quiz-white-1st" -> "Monthly Coordinate Quiz White 1st"
 *
 * TODO: This is a provisional display-name generator. In the future, badge
 * display names should be defined in i18n message files and looked up by slug.
 * At that point this function can serve as a fallback or be removed entirely.
 */
export function slugToDisplayName(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Build the achievement category name mapping from a translation function.
 *
 * The translation function `t` is expected to resolve keys like
 * `achievementCategory.monthly_leaderboard`, etc.
 */
export function getAchievementCategoryNames(t: (key: string) => string): Record<string, string> {
  return {
    monthly_leaderboard: t('achievementCategory.monthly_leaderboard'),
    cumulative: t('achievementCategory.cumulative'),
    streak: t('achievementCategory.streak'),
    one_shot: t('achievementCategory.one_shot'),
    social: t('achievementCategory.social'),
    ai_defeat: t('achievementCategory.ai_defeat'),
  };
}
