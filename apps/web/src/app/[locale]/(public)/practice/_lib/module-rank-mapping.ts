import { MUKYU_SLUG, ranksSeedData } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

/**
 * Maps a `position_submission_count` requirement's `positionType` to the
 * practice module `menuType` whose card represents submitting that kind of
 * position. Lets such ranks surface on the matching practice card the same
 * way `challenge_score` ranks do.
 *
 * - `memory` → `position_memory`: 2kyu is earned by submitting a
 *   position-memory problem, so it surfaces on the Position Memory card.
 */
const POSITION_TYPE_TO_MENU_TYPE: Record<'memory' | 'puzzle', string> = {
  memory: 'position_memory',
  puzzle: 'puzzle',
};

/**
 * Introductory modules that surface the Mukyu (無級) badge.
 *
 * Mukyu is the UI-only default rank (see {@link MUKYU_SLUG}): it has no
 * `challenge_score` / `position_submission_count` requirements in
 * `ranksSeedData`, so requirement matching can never discover it. Algebraic
 * notation and quadrant anchors are the foundational skills associated with
 * Mukyu ("being ready to start training"), so they are mapped explicitly.
 */
const MUKYU_MENU_TYPES = new Set(['algebraic_notation', 'quadrant_anchors']);

/**
 * Returns the lowest-level rank that this practice module contributes toward,
 * or `null` if no rank requires it.
 *
 * A rank is linked to a module when it has either:
 * - a `challenge_score` requirement naming this `menuType`, or
 * - a `position_submission_count` requirement whose `positionType` maps to this
 *   `menuType` (see {@link POSITION_TYPE_TO_MENU_TYPE}).
 *
 * Introductory modules ({@link MUKYU_MENU_TYPES}) map to Mukyu (無級), which is
 * UI-only and therefore absent from `ranksSeedData`.
 *
 * Used by the practice list page to surface which rank a given practice
 * module contributes toward, alongside the Beginner / Intermediate /
 * Advanced section grouping.
 */
export function getRankSlugForMenuType(menuType: string): RankSlug | null {
  if (MUKYU_MENU_TYPES.has(menuType)) return MUKYU_SLUG;
  const sorted = [...ranksSeedData].sort((a, b) => a.level - b.level);
  const found = sorted.find((rank) =>
    rank.requirements.some((req) => {
      if (req.type === 'challenge_score') return req.menuType === menuType;
      if (req.type === 'position_submission_count')
        return POSITION_TYPE_TO_MENU_TYPE[req.positionType] === menuType;
      return false;
    })
  );
  return (found?.slug as RankSlug | undefined) ?? null;
}
