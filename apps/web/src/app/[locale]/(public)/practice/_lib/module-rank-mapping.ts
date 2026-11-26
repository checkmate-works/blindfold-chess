import { rankForPracticeMenuType } from '@blindfold-chess/features/dojo-ranks';

import type { RankSlug } from '@/lib/db/data/ranks';

/**
 * Returns the rank this practice module belongs to, or `null` if no rank asks
 * for it.
 *
 * Which rank a practice belongs to is decided by the shared
 * `rankForPracticeMenuType` (derived from the rank requirements, with the
 * introductory modules mapped to Mukyu), so the web's badges and the app's
 * rank filter always agree. This wrapper only adapts its `undefined` to the
 * `null` the practice list page expects.
 *
 * Used by the practice list page to surface which rank a given practice
 * module contributes toward, alongside the Beginner / Intermediate /
 * Advanced section grouping.
 */
export function getRankSlugForMenuType(menuType: string): RankSlug | null {
  return rankForPracticeMenuType(menuType) ?? null;
}
