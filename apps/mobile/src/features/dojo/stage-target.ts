import type { Href } from "expo-router";
import type {
  JourneyStage,
  JourneyStep,
  RankJourney,
} from "@blindfold-chess/features/dojo-journey";
import type { RankSlug } from "@blindfold-chess/features/dojo-ranks";

import { stepTarget } from "./next-step";

/** Where a stage cell takes the player: a screen of the app or a web page. */
export type StageTarget =
  | { readonly kind: "screen"; readonly href: Href }
  | { readonly kind: "web"; readonly path: string };

/**
 * The practice tab narrowed to `rank`'s practices. The list reads the
 * `rank` param once and then drops it from its params.
 */
export function practiceListHref(rank: RankSlug): Href {
  return { pathname: "/practice", params: { rank } };
}

/**
 * The step of `stage` a cell should open: the first one not done, or the
 * stage's first step once all are done (going back over a finished stage
 * starts from its beginning).
 */
function stageStep(
  journey: RankJourney,
  stage: JourneyStage,
): JourneyStep | undefined {
  const inStage = journey.steps.filter((step) => step.stage === stage);
  return inStage.find((step) => !step.done) ?? inStage[0];
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
 * - **Learn** opens the guide holding the first unread page (the rank's
 *   first guide once every page is read).
 * - **Practice** opens the practice tab narrowed to the rank, where each
 *   practice row shows which of its challenges are tried. It does not open
 *   one challenge's setup screen: a stage of several challenges has no
 *   single right one to open.
 * - **Exam** goes where the first unmet requirement's row goes (the first
 *   requirement once all are met) — an exam screen, a challenge's setup or,
 *   for a published game (1dan), a web page.
 *
 * Learn and exam reuse `stepTarget`, the routing the next-step button uses,
 * so a cell and the button never disagree about the same step.
 */
export function stageTarget(
  stage: JourneyStage,
  journey: RankJourney,
): StageTarget {
  if (stage === "practice") {
    return { kind: "screen", href: practiceListHref(journey.rank) };
  }
  const step = stageStep(journey, stage);
  // A stage without steps has no cell, so this is only a safe default.
  if (step === undefined) {
    return { kind: "screen", href: `/dojo/ranks/${journey.rank}` as Href };
  }
  const target = stepTarget(step);
  return target.kind === "web"
    ? { kind: "web", path: target.path }
    : { kind: "screen", href: target.pathname as Href };
}
