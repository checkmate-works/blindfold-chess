import {
  EARNED_RANK_SLUGS,
  MUKYU_SLUG,
  RANK_REQUIREMENTS,
  type RankRequirement,
  type RankSlug,
} from "./ranks";

/**
 * The introductory practices, which belong to mukyu (無級).
 *
 * Mukyu has no requirements, so it can never be derived from
 * {@link RANK_REQUIREMENTS}. Reading algebraic notation and finding the
 * quadrant anchors are what "being ready to start training" means, so these
 * two practices are attached to mukyu explicitly. They are the only practices
 * whose rank is written down instead of derived.
 */
const MUKYU_MENU_TYPES: ReadonlySet<string> = new Set([
  "algebraic_notation",
  "quadrant_anchors",
]);

/**
 * Whether a requirement asks for work done in the practice `menuType`.
 *
 * A `challenge_score` requirement names its practice directly. An
 * `exam_problem` requirement names the kind of problem instead, and each kind
 * is set by the practice of the same name (`position_memory`, `puzzle`), so
 * the problem kind is compared with the menu type as-is.
 */
function requirementNamesPractice(
  requirement: RankRequirement,
  menuType: string,
): boolean {
  switch (requirement.type) {
    case "challenge_score":
      return requirement.menuType === menuType;
    case "exam_problem":
      return requirement.problem === menuType;
    default:
      return false;
  }
}

/**
 * The rank a practice belongs to: the lowest rank whose requirements ask for
 * it, `mukyu` for the introductory practices, or `undefined` when no rank asks
 * for it.
 *
 * @description
 * This is the single place that decides which rank a practice is "for". The
 * web's practice list badges and the app's rank filter both read it, so the
 * two cannot disagree, and neither keeps its own table.
 *
 * The answer is derived from {@link RANK_REQUIREMENTS} rather than listed, so
 * changing a rank's requirements moves the practice to its new rank
 * everywhere at once. Earned ranks are scanned lowest first, and the first
 * one with a requirement naming the practice wins — a practice asked for by
 * several ranks belongs to the lowest of them, where the user first meets it.
 * Only the introductory practices (algebraic notation, quadrant anchors) are
 * mapped by hand, to mukyu, because mukyu has no requirements to derive from.
 *
 * With the current requirements: coordinate quiz and square colours are
 * 5kyu, legal moves 4kyu, route planner 3kyu, and position memory and puzzle
 * 2kyu (through the 2kyu exam problems).
 *
 * @param menuType The practice's `menuType` in snake_case (`square_colors`,
 *   `legal_moves`, …), as used by challenge leaderboards.
 */
export function rankForPracticeMenuType(
  menuType: string,
): RankSlug | undefined {
  if (MUKYU_MENU_TYPES.has(menuType)) return MUKYU_SLUG;
  return EARNED_RANK_SLUGS.find((slug) =>
    RANK_REQUIREMENTS[slug].some((requirement) =>
      requirementNamesPractice(requirement, menuType),
    ),
  );
}
