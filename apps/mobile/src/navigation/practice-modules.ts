import type { PracticeModuleSlug } from "@blindfold-chess/features/practice-registry";

/**
 * How the mobile app presents a practice module it implements.
 *
 * @property slug - The module's kebab-case slug in the shared registry
 *   (`@blindfold-chess/features/practice-registry`). Typed against the
 *   registry, so a typo or a module that was removed there fails to compile
 *   here.
 * @property route - The route directory under `(tabs)/practice/`, when it
 *   differs from `slug`.
 * @property i18nKey - Namespace holding the module's strings: the list card
 *   reads `practice.<i18nKey>.title` / `.description`, the stack headers read
 *   `<i18nKey>.setup.title` / `.result.title`.
 * @property icon - The glyph on the practice list card.
 * @property hasTraining - The module also has an untimed `training` screen
 *   next to its timed session.
 */
export type MobilePracticeModule = {
  slug: PracticeModuleSlug;
  route?: string;
  i18nKey: string;
  icon: string;
  hasTraining?: boolean;
};

/**
 * The practice modules the mobile app implements, in the order the practice
 * tab lists them. The shared registry decides which modules exist and what
 * they are called in URLs and the database; this table only adds what is
 * mobile-specific (icon, i18n namespace, which screens exist) and leaves out
 * the modules mobile has not built yet (position memory, puzzle, recall, …).
 *
 * The practice list (`(tabs)/practice/index.tsx`) and the practice stack
 * (`(tabs)/practice/_layout.tsx`) both read it, so a module added here gets
 * its card and its screens together.
 */
export const MOBILE_PRACTICE_MODULES: readonly MobilePracticeModule[] = [
  { slug: "coordinate-quiz", i18nKey: "coordinateQuiz", icon: "♟" },
  {
    slug: "legal-moves",
    i18nKey: "legalMoves",
    icon: "♞",
  },
  { slug: "board-symmetry", i18nKey: "boardSymmetry", icon: "🦋" },
  {
    slug: "square-colors",
    i18nKey: "squareColors",
    icon: "🎨",
  },
  {
    slug: "diagonal-quiz",
    i18nKey: "diagonalQuiz",
    icon: "↗",
  },
  { slug: "route-planner", i18nKey: "routePlanner", icon: "♞" },
  {
    // Registered as `quadrant_anchors`, but routed as `quadrants` on both
    // platforms (the web page is /practice/quadrants too).
    slug: "quadrant-anchors",
    route: "quadrants",
    i18nKey: "quadrants",
    icon: "⊞",
  },
  { slug: "knight-tour", i18nKey: "knightTour", icon: "♘" },
  {
    slug: "algebraic-notation",
    i18nKey: "algebraicNotation",
    icon: "✎",
  },
  { slug: "fen", i18nKey: "fen", icon: "♜" },
];

/** The route directory of a module under `(tabs)/practice/`. */
export function practiceModuleRoute(module: MobilePracticeModule): string {
  return module.route ?? module.slug;
}
