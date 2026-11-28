import type Ionicons from "@expo/vector-icons/Ionicons";
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
 * @property icon - The Ionicons line icon on the module's list rows (the
 *   practice tab, the home quick start), drawn
 *   in ink on the grey `ListIcon` tile. Emoji were dropped because they
 *   render as different pictures, in their own colours, depending on the OS
 *   and its font, so a list of them never looks like one set; line icons
 *   share a single stroke and take the theme's colour. The type is the
 *   glyph map's keys, so a name the icon font does not have fails to
 *   compile instead of rendering a blank box. SF Symbols were considered
 *   and left for later: they need `expo-symbols` and a native rebuild.
 * @property hasTraining - The module also has an untimed `training` screen
 *   next to its timed session.
 * @property sessionHeader - The timed session sits under a stack header with
 *   the module's name and the ×; see `ModuleRoute`. Every module has it now:
 *   each moved to it together with its setup screen's port to the web's
 *   layout.
 * @property howToPlayOnSetup - The setup screen shows the how-to-play text
 *   itself (`HowToPlaySection`), so the help sheet leaves that page out; see
 *   `helpPagesFor`.
 */
export type MobilePracticeModule = {
  slug: PracticeModuleSlug;
  route?: string;
  i18nKey: string;
  icon: keyof typeof Ionicons.glyphMap;
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
    icon: "locate-outline",
    hasTraining: true,
    sessionHeader: true,
    howToPlayOnSetup: true,
  },
  {
    slug: "legal-moves",
    i18nKey: "legalMoves",
    icon: "scale-outline",
    hasTraining: true,
    sessionHeader: true,
    howToPlayOnSetup: true,
  },
  {
    slug: "board-symmetry",
    i18nKey: "boardSymmetry",
    icon: "swap-horizontal-outline",
    hasTraining: true,
    sessionHeader: true,
    howToPlayOnSetup: true,
  },
  {
    slug: "square-colors",
    i18nKey: "squareColors",
    icon: "contrast-outline",
    hasTraining: true,
    sessionHeader: true,
    howToPlayOnSetup: true,
  },
  {
    slug: "diagonal-quiz",
    i18nKey: "diagonalQuiz",
    icon: "trending-up-outline",
    hasTraining: true,
    sessionHeader: true,
    howToPlayOnSetup: true,
  },
  {
    slug: "route-planner",
    i18nKey: "routePlanner",
    icon: "navigate-outline",
    hasTraining: true,
    sessionHeader: true,
    howToPlayOnSetup: true,
  },
  {
    // Registered as `quadrant_anchors`, but routed as `quadrants` on both
    // platforms (the web page is /practice/quadrants too).
    slug: "quadrant-anchors",
    route: "quadrants",
    i18nKey: "quadrants",
    icon: "grid-outline",
    hasTraining: true,
    sessionHeader: true,
    howToPlayOnSetup: true,
  },
  {
    slug: "knight-tour",
    i18nKey: "knightTour",
    icon: "footsteps-outline",
    sessionHeader: true,
  },
  {
    slug: "algebraic-notation",
    i18nKey: "algebraicNotation",
    icon: "text-outline",
    sessionHeader: true,
    howToPlayOnSetup: true,
  },
  {
    slug: "fen",
    i18nKey: "fen",
    icon: "code-slash-outline",
    sessionHeader: true,
  },
  {
    slug: "position-memory",
    i18nKey: "positionMemory",
    icon: "eye-off-outline",
    sessionHeader: true,
  },
  {
    slug: "recall",
    i18nKey: "recall",
    icon: "repeat-outline",
    sessionHeader: true,
  },
  {
    slug: "puzzle",
    i18nKey: "puzzle",
    icon: "extension-puzzle-outline",
    sessionHeader: true,
  },
];

/**
 * The route directory of a module, under `practice/` (the URL path
 * `/practice/<route>`). Build every navigation to a module with this rather
 * than with `slug`: the two differ for some modules.
 */
export function practiceModuleRoute(module: MobilePracticeModule): string {
  return module.route ?? module.slug;
}
