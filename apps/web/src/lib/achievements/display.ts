import type { InterpolatingTranslator } from '@/i18n/translator';

/**
 * Derive a display-friendly badge name from slug.
 * Example: "monthly-coordinate_quiz-white-1st" -> "Monthly Coordinate Quiz White 1st"
 *
 * Kept as the universal fallback when i18n lookups fail or when the achievement
 * category has no structured i18n keys yet. Callers should prefer
 * `getAchievementDisplayName` which delegates to this on miss.
 */
export function slugToDisplayName(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Achievement icon emoji lookup
// ---------------------------------------------------------------------------

/**
 * Central mapping from `achievements.iconKey` values to emoji glyphs.
 * Mirrors the seeds in `src/lib/db/data/achievements.ts` (trophy-gold/silver/bronze).
 * Any future icon keys should be added here so all renderers stay in sync.
 */
export const ACHIEVEMENT_ICON_EMOJI: Record<string, string> = {
  'trophy-gold': '🥇',
  'trophy-silver': '🥈',
  'trophy-bronze': '🥉',
};

/** Resolve an emoji for an achievement `iconKey`, falling back to 🏆. */
export function getAchievementIconEmoji(iconKey: string): string {
  return ACHIEVEMENT_ICON_EMOJI[iconKey] ?? '🏆';
}

// ---------------------------------------------------------------------------
// Localized achievement display name
// ---------------------------------------------------------------------------

type AchievementLike = { slug: string; category: string };

type ParsedMonthlyLeaderboardSlug = {
  menuType: string;
  leaderboardKey: string;
  placement: string;
};

/**
 * Parse a slug produced by `generateMonthlyLeaderboardSeeds()`:
 *   `monthly-${menuType}-${leaderboardKey}-${placement}`
 *
 * `menuType` and `leaderboardKey` are data-driven identifiers that may contain
 * underscores (e.g., `coordinate_quiz`) but never dashes, so splitting on `-`
 * yields exactly four segments. Returns `null` for any slug that does not match.
 */
function parseMonthlyLeaderboardSlug(slug: string): ParsedMonthlyLeaderboardSlug | null {
  const parts = slug.split('-');
  if (parts.length !== 4) return null;
  const [prefix, menuType, leaderboardKey, placement] = parts;
  if (prefix !== 'monthly') return null;
  if (!menuType || !leaderboardKey || !placement) return null;
  return { menuType, leaderboardKey, placement };
}

/**
 * Next-intl's configured `getMessageFallback` (see `src/i18n/error-handling.ts`)
 * returns the fully qualified key path ("Achievements.monthlyLeaderboard.name")
 * when a translation is missing. This helper detects that condition so we can
 * fall back to `slugToDisplayName`.
 */
function isMissingTranslation(resolved: string, key: string): boolean {
  return resolved === key;
}

/**
 * Resolve a localized display name for an achievement.
 *
 * - For `monthly_leaderboard` category, parses the slug and interpolates
 *   `Achievements.monthlyLeaderboard.name` with already-translated sub-parts.
 * - For every other category, or if any sub-key is missing, falls back to
 *   `slugToDisplayName(achievement.slug)` so callers never render a raw key path.
 *
 * The `t` function is injected by the caller, letting admin (fixed `en`) and
 * user-facing pages (user locale) share a single implementation without this
 * module depending on `next-intl` directly.
 */
export function getAchievementDisplayName(
  achievement: AchievementLike,
  t: InterpolatingTranslator
): string {
  // Non-monthly-leaderboard categories fall back until keys are added.
  if (achievement.category !== 'monthly_leaderboard') {
    return slugToDisplayName(achievement.slug);
  }

  const parsed = parseMonthlyLeaderboardSlug(achievement.slug);
  if (!parsed) return slugToDisplayName(achievement.slug);

  try {
    const menuTypeKey = `Achievements.monthlyLeaderboard.menuType.${parsed.menuType}`;
    const leaderboardKeyKey = `Achievements.monthlyLeaderboard.leaderboardKey.${parsed.leaderboardKey}`;
    const placementKey = `Achievements.monthlyLeaderboard.placement.${parsed.placement}`;

    const menuType = t(menuTypeKey);
    const leaderboardKey = t(leaderboardKeyKey);
    const placement = t(placementKey);

    if (
      isMissingTranslation(menuType, menuTypeKey) ||
      isMissingTranslation(leaderboardKey, leaderboardKeyKey) ||
      isMissingTranslation(placement, placementKey)
    ) {
      return slugToDisplayName(achievement.slug);
    }

    const nameKey = 'Achievements.monthlyLeaderboard.name';
    const name = t(nameKey, { menuType, leaderboardKey, placement });
    if (isMissingTranslation(name, nameKey)) {
      return slugToDisplayName(achievement.slug);
    }
    return name;
  } catch {
    return slugToDisplayName(achievement.slug);
  }
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
