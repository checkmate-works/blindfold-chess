import type { ExamProblemKind } from '@blindfold-chess/features/dojo-ranks';

import { MUKYU_SLUG, ranksSeedData } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

/**
 * Maps an `exam_problem` requirement's `problem` to the practice module
 * `menuType` whose card represents that kind of problem. Lets such ranks
 * surface on the matching practice cards the same way `challenge_score`
 * ranks do.
 *
 * - `position_memory` → `position_memory`, `puzzle` → `puzzle`: 2kyu's exam
 *   is one position-memory problem and one puzzle, so the 2kyu badge shows
 *   on both the Position Memory and Puzzle cards.
 */
const EXAM_PROBLEM_TO_MENU_TYPE: Record<ExamProblemKind, string> = {
  position_memory: 'position_memory',
  puzzle: 'puzzle',
};

/**
 * Introductory modules that surface the Mukyu (無級) badge.
 *
 * Mukyu is the UI-only default rank (see {@link MUKYU_SLUG}): it has no
 * requirements in `ranksSeedData`, so requirement matching can never
 * discover it. Algebraic notation and quadrant anchors are the foundational
 * skills associated with Mukyu ("being ready to start training"), so they
 * are mapped explicitly.
 */
const MUKYU_MENU_TYPES = new Set(['algebraic_notation', 'quadrant_anchors']);

/**
 * Returns the lowest-level rank that this practice module contributes toward,
 * or `null` if no rank requires it.
 *
 * A rank is linked to a module when it has either:
 * - a `challenge_score` requirement naming this `menuType`, or
 * - an `exam_problem` requirement whose `problem` maps to this `menuType`
 *   (see {@link EXAM_PROBLEM_TO_MENU_TYPE}).
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
      if (req.type === 'exam_problem') return EXAM_PROBLEM_TO_MENU_TYPE[req.problem] === menuType;
      return false;
    })
  );
  return (found?.slug as RankSlug | undefined) ?? null;
}
