import type Ionicons from "@expo/vector-icons/Ionicons";
import type { TFunction } from "i18next";
import {
  firstUndoneStep,
  type JourneyStep,
  type RankJourney,
} from "@blindfold-chess/features/dojo-journey";

import {
  requirementLabel,
  requirementTarget,
  type RequirementTarget,
} from "./requirements";

/** One suggestion of what to do next: a button's copy, glyph and route. */
export type NextStep = {
  readonly label: string;
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly target: RequirementTarget;
};

/**
 * The `ranks.challengeNames.*` key of a challenge leaderboard: the module
 * alone for its default board, the module and board otherwise. The same
 * key `requirementLabel` names a challenge requirement with.
 */
function challengeNameKey(menuType: string, leaderboardKey: string): string {
  return leaderboardKey === "default"
    ? menuType
    : `${menuType}_${leaderboardKey}`;
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
        // Always the guide's first page: the guide screen does not reopen
        // at the page the player stopped at.
        target: {
          kind: "practice",
          pathname: `/dojo/guides/${step.guideRank}`,
        },
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
        // The same setup screen the challenge requirement opens.
        target: requirementTarget({
          type: "challenge_score",
          menuType: step.menuType,
          leaderboardKey: step.leaderboardKey,
          minScore: 0,
        }),
      };
    case "requirement": {
      const target = requirementTarget(step.requirement);
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
 * - A guide page opens that guide (`/dojo/guides/<guideRank>`) from its first
 *   page. It reads "Read the guide" until a page of the rank's learn stage
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
