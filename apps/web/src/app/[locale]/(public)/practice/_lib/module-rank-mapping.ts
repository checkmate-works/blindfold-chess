import { ranksSeedData } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

/**
 * Returns the lowest-level rank that has a `challenge_score` requirement
 * referencing this `menuType`, or `null` if no rank requires it.
 *
 * Used by the practice list page to surface which rank a given practice
 * module contributes toward, alongside the Beginner / Intermediate /
 * Advanced section grouping.
 */
export function getRankSlugForMenuType(menuType: string): RankSlug | null {
  const sorted = [...ranksSeedData].sort((a, b) => a.level - b.level);
  const found = sorted.find((rank) => rank.requirements.some((req) => req.menuType === menuType));
  return (found?.slug as RankSlug | undefined) ?? null;
}
