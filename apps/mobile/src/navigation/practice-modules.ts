import type { PracticeModuleSlug } from "@blindfold-chess/features/practice-registry";

/**
 * How the mobile app presents a practice module it implements.
 *
 * @property slug - The module's kebab-case slug in the shared registry
 *   (`@blindfold-chess/features/practice-registry`). Typed against the
 *   registry, so a typo or a module that was removed there fails to compile
 *   here.
 * @property route - The module's route directory, when it differs from
 *   `slug`: the setup screen is `app/practice/<route>/index.tsx` on the root
 *   stack, and the session, result and training screens are
 *   `app/(session)/practice/<route>/`.
 * @property i18nKey - Namespace holding the module's strings: the list card
 *   reads `practice.<i18nKey>.title` / `.description`, the stack headers read
 *   `<i18nKey>.setup.title` / `.result.title`.
 * @property icon - The glyph on the practice list card.
 * @property hasTraining - The module also has an untimed `training` screen
 *   next to its timed session.
 * @property sessionHeader - The timed session sits under a stack header with
 *   the module's name and the ×; see `ModuleRoute`. Modules move to it one at
 *   a time, along with their setup screen's port to the web's layout
 *   (coordinate quiz, legal moves and square colors so far).
 * @property howToPlayOnSetup - The setup screen shows the how-to-play text
 *   itself (`HowToPlaySection`), so the help sheet leaves that page out; see
 *   `helpPagesFor`.
 */
export type MobilePracticeModule = {
  slug: PracticeModuleSlug;
  route?: string;
  i18nKey: string;
  icon: string;
  hasTraining?: boolean;
  sessionHeader?: boolean;
  howToPlayOnSetup?: boolean;
};

/**
 * The practice modules the mobile app implements, in the order the practice
 * tab lists them. The shared registry decides which modules exist and what
 * they are called in URLs and the database; this table only adds what is
 * mobile-specific (icon, i18n namespace, which screens exist). A registry
 * module mobile has not built is simply absent from it.
 *
 * The practice list (`(tabs)/practice/index.tsx`) reads it for the cards,
 * and `module-routes.ts` turns it into the stack screens that the root
 * stack (setup) and the `(session)` stack (session, result, training)
 * register, so a module added here gets its card and its screens together.
 */
export const MOBILE_PRACTICE_MODULES: readonly MobilePracticeModule[] = [
  {
    slug: "coordinate-quiz",
    i18nKey: "coordinateQuiz",
    icon: "🎯",
    hasTraining: true,
    sessionHeader: true,
    howToPlayOnSetup: true,
  },
  {
    slug: "legal-moves",
    i18nKey: "legalMoves",
    icon: "⚖️",
    hasTraining: true,
    sessionHeader: true,
    howToPlayOnSetup: true,
  },
  {
    slug: "board-symmetry",
    i18nKey: "boardSymmetry",
    icon: "🦋",
    hasTraining: true,
    sessionHeader: true,
    howToPlayOnSetup: true,
  },
  {
    slug: "square-colors",
    i18nKey: "squareColors",
    icon: "🎨",
    hasTraining: true,
    sessionHeader: true,
    howToPlayOnSetup: true,
  },
  {
    slug: "diagonal-quiz",
    i18nKey: "diagonalQuiz",
    icon: "↗️",
    hasTraining: true,
  },
  {
    slug: "route-planner",
    i18nKey: "routePlanner",
    icon: "📍",
    hasTraining: true,
  },
  {
    // Registered as `quadrant_anchors`, but routed as `quadrants` on both
    // platforms (the web page is /practice/quadrants too).
    slug: "quadrant-anchors",
    route: "quadrants",
    i18nKey: "quadrants",
    icon: "🧭",
    hasTraining: true,
  },
  { slug: "knight-tour", i18nKey: "knightTour", icon: "🐎" },
  {
    slug: "algebraic-notation",
    i18nKey: "algebraicNotation",
    icon: "🔤",
  },
  { slug: "fen", i18nKey: "fen", icon: "📝" },
  { slug: "position-memory", i18nKey: "positionMemory", icon: "🧠" },
  { slug: "recall", i18nKey: "recall", icon: "🔁" },
  { slug: "puzzle", i18nKey: "puzzle", icon: "🧩" },
];

/**
 * The route directory of a module, under `practice/` (the URL path
 * `/practice/<route>`). Build every navigation to a module with this rather
 * than with `slug`: the two differ for some modules.
 */
export function practiceModuleRoute(module: MobilePracticeModule): string {
  return module.route ?? module.slug;
}
