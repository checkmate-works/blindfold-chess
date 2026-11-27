import type Ionicons from "@expo/vector-icons/Ionicons";
import type { TFunction } from "i18next";
import { challengeNameKey } from "@blindfold-chess/features/dojo-ranks";
import {
  firstUndoneStep,
  type JourneyStep,
  type RankJourney,
} from "@blindfold-chess/features/dojo-journey";

import {
  guidePath,
  requirementLabel,
  requirementTarget,
  type RequirementTarget,
} from "./requirements";
import { guidePageHref } from "../guides/reading-progress";

/** One suggestion of what to do next: a button's copy, glyph and route. */
export type NextStep = {
  readonly label: string;
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly target: RequirementTarget;
};

/**
 * Where one step of a journey leads: the screen the next-step button opens
 * for it. The stage cells (`stageTarget`) do not use this: a cell stands
 * for its whole stage, so each opens the stage's list (the learn tab's
 * guides, the practice tab, the rank's requirements screen), and the
 * requirement rows there route each requirement as the button would.
 *
 * - A guide page opens its guide at that very page (`?page=`), so the
 *   button picks up where the player stopped rather than at the start.
 * - A challenge opens the module's setup screen, the same one its challenge
 *   requirement opens.
 * - A requirement goes where its requirement row goes.
 */
export function stepTarget(step: JourneyStep): RequirementTarget {
  switch (step.kind) {
    case "guidePage":
      return {
        kind: "practice",
        // A learn step exists only for a guide with pages, so the guide is
        // bundled; the dojo tab is a fallback that cannot strand the player.
        pathname:
          guidePath(step.guideRank) === undefined
            ? "/dojo"
            : (guidePageHref(step.guideRank, step.page) as string),
      };
    case "challenge":
      return requirementTarget({
        type: "challenge_score",
        menuType: step.menuType,
        leaderboardKey: step.leaderboardKey,
        minScore: 0,
      });
    case "requirement":
      return requirementTarget(step.requirement);
  }
}

function stepAction(
  step: JourneyStep,
  journey: RankJourney,
  t: TFunction,
): NextStep {
  switch (step.kind) {
    case "guidePage": {
      const learn = journey.stages.find((s) => s.stage === "learn");
      const started = (learn?.done ?? 0) > 0;
      return {
        label: t(
          started ? "home.nextStep.guideContinue" : "home.nextStep.guideStart",
        ),
        icon: "book-outline",
        target: stepTarget(step),
      };
    }
    case "challenge":
      return {
        label: t("home.nextStep.challenge", {
          // ranks.challengeNames.square_colors, ranks.challengeNames.coordinate_quiz_white, …
          challengeName: t(
            `ranks.challengeNames.${challengeNameKey(step.menuType, step.leaderboardKey)}`,
          ),
        }),
        icon: "stopwatch-outline",
        target: stepTarget(step),
      };
    case "requirement": {
      const target = stepTarget(step);
      return {
        label: requirementLabel(step.requirement, t),
        icon:
          target.kind === "web"
            ? "open-outline"
            : step.requirement.type === "exam_problem"
              ? "school-outline"
              : "trophy-outline",
        target,
      };
    }
  }
}

/**
 * What the player should do next on `journey`'s rank, as a button.
 *
 * @description
 * The step is `firstUndoneStep(journey)` and nothing else: the first step
 * not done, looking through learn, then practice, then exam. Every screen
 * that suggests a next step goes through that one function, because two
 * screens choosing on their own would end up pointing the player at
 * different steps. The order is guidance only — the player can open any
 * stage at any time, and nothing here locks a later one.
 *
 * - A guide page opens that guide (`/dojo/guides/<guideRank>?page=<n>`) at
 *   the page itself. It reads "Read the guide" until a page of the rank's learn stage
 *   is done, and "Continue the guide" after.
 * - A challenge to try opens the module's setup screen, where the challenge
 *   starts.
 * - A requirement is worded and routed as its requirement row is.
 *
 * Undefined when every step is done (the rank is held, or every
 * requirement is met and the server has not granted the rank yet).
 */
export function nextStepOf(
  journey: RankJourney,
  t: TFunction,
): NextStep | undefined {
  const step = firstUndoneStep(journey);
  return step ? stepAction(step, journey, t) : undefined;
}
