import type { Href } from "expo-router";
import type {
  JourneyStage,
  RankJourney,
} from "@blindfold-chess/features/dojo-journey";
import type { RankSlug } from "@blindfold-chess/features/dojo-ranks";

/**
 * The learn tab, whose first section lists every guide with how far it is
 * read. A tab, so it is switched to with `router.navigate` rather than
 * pushed over the current screen.
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
 * stack; `RankStageProgress` opens all three with `router.navigate`, which
 * switches to a tab rather than stacking a second copy of it, and pushes
 * the requirements screen like any other root-stack screen.
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
