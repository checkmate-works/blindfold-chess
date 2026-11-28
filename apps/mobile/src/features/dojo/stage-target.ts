import type { Href, ImperativeRouter } from "expo-router";
import type {
  JourneyStage,
  RankJourney,
} from "@blindfold-chess/features/dojo-journey";
import type { RankSlug } from "@blindfold-chess/features/dojo-ranks";

/**
 * The learn tab, whose first section lists every guide with how far it is
 * read. A tab, so it is switched to ({@link openTab})
 * rather than pushed over the current screen.
 */
export const GUIDE_LIST_HREF: Href = "/learn";

/**
 * The practice tab narrowed to `rank`'s practices. The list reads the
 * `rank` param once and then drops it from its params.
 */
export function practiceListHref(rank: RankSlug): Href {
  return { pathname: "/practice", params: { rank } };
}

/** The screen listing `rank`'s requirements alone, with how many are met. */
export function requirementsHref(rank: RankSlug): Href {
  return `/dojo/requirements/${rank}` as Href;
}

/** `rank`'s own screen: its card, stages, requirements and guide. */
export function rankDetailHref(rank: RankSlug): Href {
  return `/dojo/ranks/${rank}` as Href;
}

/**
 * Where pressing one stage cell of a rank's progress (`RankStageProgress`)
 * leads.
 *
 * @description
 * The destination is decided here rather than inside the component, because
 * the same cells sit on the home tab, the dojo tab and the rank screen, and
 * a component choosing on its own would sooner or later send the same cell
 * to different places on different screens. Every cell can be pressed, on
 * every rank: the rank screen shows progress for ranks that are not the
 * current one too, and a row of cells where only some respond would look
 * the same as one where all do.
 *
 * A cell is the way into its whole stage, so every cell opens the stage's
 * list, where the player sees what in it is done and picks what to do;
 * going straight to the one next thing is the next-step button's job
 * (`nextStepOf`), and a cell doing the same would only repeat it.
 *
 * - **Learn** opens the learn tab, where the guides are listed with how
 *   far each is read and each opens at its first unread page. The stage
 *   can span two guides (5kyu reads the unranked guide and its own), so
 *   there is no single guide to open.
 * - **Practice** opens the practice tab narrowed to the rank, where each
 *   practice row shows which of its challenges are tried. A stage of
 *   several challenges has no single right setup screen to open.
 * - **Exam** opens the rank's requirements screen
 *   (`dojo/requirements/[rank]`): only that rank's requirements, each
 *   marked once met and opening where it is met (a challenge's setup, the
 *   exam, or the web for 1dan's published game). Going to the first unmet
 *   requirement's screen instead would hide which ones are already passed,
 *   and on a rank of several requirements would choose one for the player.
 *
 * Practice and learn are tabs and the requirements screen sits on the root
 * stack; `RankStageProgress` opens the tabs with `openTab` (`navigate`
 * from inside the tabs, `dismissTo` from a root-stack screen such as the
 * rank screen, where `navigate` would stack a second set of tabs) and
 * pushes the requirements screen.
 */
export function stageTarget(stage: JourneyStage, journey: RankJourney): Href {
  switch (stage) {
    case "learn":
      return GUIDE_LIST_HREF;
    case "practice":
      return practiceListHref(journey.rank);
    case "exam":
      return requirementsHref(journey.rank);
  }
}

/**
 * Opens the tab at `href` from wherever the stage cells are.
 *
 * @description
 * The cells sit both inside the tabs (the home and dojo tabs) and above
 * them (the rank screen, pushed on the root stack), and neither call works
 * from both:
 *
 * - From a root-stack screen, `router.navigate` reuses a route only when it
 *   is the one on top, so it pushes a second set of tabs over the screen.
 *   `router.dismissTo` pops back to the tabs already underneath and switches
 *   to the tab.
 * - From inside the tabs, `router.dismissTo` does nothing at all. expo-router
 *   sends its `POP_TO` to the deepest navigator the current and target
 *   routes share, which here is the tab navigator, and the tab router has no
 *   handling for `POP_TO`; the action is dropped with only a dev-build
 *   warning ("was not handled by any navigator"). `router.navigate` switches
 *   the tab.
 *
 * `router.canDismiss()` tells the two apart: it is true when a stack in the
 * focused branch holds more than one route, which on these screens means
 * the rank screen sits on the root stack above the tabs (each tab's own
 * stack holds only its entry screen). It is read when the cell is pressed,
 * not during render, so it reflects the stack as it is at that moment.
 */
export function openTab(
  router: Pick<ImperativeRouter, "canDismiss" | "dismissTo" | "navigate">,
  href: Href,
): void {
  if (router.canDismiss()) router.dismissTo(href);
  else router.navigate(href);
}
