import type { Href } from "expo-router";
import {
  LEARN_GUIDES,
  type RankJourney,
} from "@blindfold-chess/features/dojo-journey";
import {
  EARNED_RANK_SLUGS,
  type EarnedRankSlug,
  type RankSlug,
} from "@blindfold-chess/features/dojo-ranks";

import { practiceListHref } from "../dojo/stage-target";
import { guidePageHref, guideReadingProgress } from "./reading-progress";

/**
 * Where the guide screen's last-page button leads once a guide is read.
 *
 * - `guide`: another guide of the same learn stage, opened at its first
 *   unread page. `href` replaces the guide screen, so finishing one guide
 *   and starting the next does not leave a guide under a guide.
 * - `practice`: the practice tab. `href` is a tab's path, reached by
 *   dismissing the guide screen back to the tabs rather than pushing a
 *   second set of tabs over it.
 */
export type AfterGuide =
  | { readonly kind: "guide"; readonly rank: RankSlug; readonly href: Href }
  | { readonly kind: "practice"; readonly href: Href };

/**
 * The rank whose learn stage reads `guide`, by `LEARN_GUIDES`: the unranked
 * guide and 5kyu's own both belong to 5kyu. Undefined for a guide that no
 * rank's learn stage reads.
 */
export function learnStageRankOf(guide: RankSlug): EarnedRankSlug | undefined {
  return EARNED_RANK_SLUGS.find((rank) =>
    LEARN_GUIDES[rank as EarnedRankSlug].includes(guide),
  ) as EarnedRankSlug | undefined;
}

/** Pages of `guide` that `journey`'s learn stage has, read or not. */
function pageCountIn(journey: RankJourney, guide: RankSlug): number {
  return journey.steps.filter(
    (step) => step.kind === "guidePage" && step.guideRank === guide,
  ).length;
}

/**
 * Where a player goes after finishing `guide`, the next step of the learn
 * stage the guide belongs to.
 *
 * @description
 * Reading a guide is one part of a rank's learn stage, and the stage is the
 * way to the rank's practice, so finishing a guide leads on to whatever the
 * stage still asks for rather than leaving the player on the last page:
 *
 * 1. Another guide of the stage with a page still unread, at its first
 *    unread page. The guides after this one, in the stage's reading order,
 *    come first; a guide before it that was skipped comes after them, so
 *    the stage is not called finished while one of its guides is unread.
 * 2. Otherwise the stage is read through, and the practice tab narrowed to
 *    the rank is next — the stage that follows learn.
 *
 * `guide` itself is never a candidate: the player has just finished it, and
 * the page marked a moment ago may not have reached `journeyOf` yet (the
 * mark is written asynchronously), so reading its pages from the journey
 * could send the player back into the guide they just closed. Every page of
 * it counts as read here, including any the player skipped past.
 *
 * A held rank's steps are all done, so its guides lead straight to its
 * practice list. A guide that no rank's learn stage reads leads to the
 * practice tab as a whole: there is no stage to continue, and practice is
 * still the step that follows reading.
 */
export function afterGuide(
  guide: RankSlug,
  journeyOf: (rank: EarnedRankSlug) => RankJourney,
): AfterGuide {
  const owner = learnStageRankOf(guide);
  if (!owner) return { kind: "practice", href: "/practice" as Href };

  const journey = journeyOf(owner);
  const stageGuides = LEARN_GUIDES[owner];
  const at = stageGuides.indexOf(guide);
  const candidates = [
    ...stageGuides.slice(at + 1),
    ...stageGuides.slice(0, at),
  ];
  for (const candidate of candidates) {
    const { firstUnreadPage } = guideReadingProgress(
      [journey],
      candidate,
      pageCountIn(journey, candidate),
    );
    if (firstUnreadPage !== undefined) {
      return {
        kind: "guide",
        rank: candidate,
        href: guidePageHref(candidate, firstUnreadPage),
      };
    }
  }
  return { kind: "practice", href: practiceListHref(owner) };
}
