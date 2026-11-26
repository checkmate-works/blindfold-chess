import type { TFunction } from "i18next";
import {
  isRankSlug,
  type RankRequirement,
  type RankSlug,
} from "@blindfold-chess/features/dojo-ranks";
import { MODULE_TO_SLUG } from "@blindfold-chess/features/practice-registry";

import { hasGuide } from "../guides/content";
import {
  MOBILE_PRACTICE_MODULES,
  practiceModuleRoute,
} from "../../navigation/practice-modules";

/**
 * Where a requirement row takes the player: a practice module's setup
 * screen or a rank's exam in the app, or a page of the web app for what the
 * app does not do (publishing games, the social side the first mobile
 * release leaves out).
 */
export type RequirementTarget =
  | { readonly kind: "practice"; readonly pathname: string }
  | { readonly kind: "web"; readonly path: string };

/** Where a published game starts on the web. */
const NEW_GAME_PATH = "/games/new/standard";

/**
 * The in-app guide (教本) of a rank, when it has one: the ranks are the ones
 * the bundled copy of the web's guides holds. 1dan has none — its
 * requirement is a whole game, which the ranks below already prepare for.
 */
export function guidePath(slug: RankSlug): string | undefined {
  return hasGuide(slug) ? `/dojo/guides/${slug}` : undefined;
}

export function requirementTarget(
  requirement: RankRequirement,
): RequirementTarget {
  switch (requirement.type) {
    case "exam_problem":
      // Every problem of a rank's exam is listed on one screen.
      return { kind: "practice", pathname: `/dojo/exams/${requirement.exam}` };
    case "challenge_score": {
      const slug = (MODULE_TO_SLUG as Record<string, string>)[
        requirement.menuType
      ];
      const module = MOBILE_PRACTICE_MODULES.find((m) => m.slug === slug);
      // A challenge the app has no module for falls back to the web page of
      // the practice, so the row still leads somewhere.
      return module
        ? {
            kind: "practice",
            pathname: `/practice/${practiceModuleRoute(module)}`,
          }
        : { kind: "web", path: `/practice/${slug ?? ""}` };
    }
    case "game_publish_win":
    case "game_publish_win_hidden_board":
      return { kind: "web", path: NEW_GAME_PATH };
  }
}

/**
 * A requirement as one line of copy, in the web's wording
 * (`ranks.requirement.*`, copied from the web dictionary).
 */
export function requirementLabel(
  requirement: RankRequirement,
  t: TFunction,
): string {
  switch (requirement.type) {
    case "exam_problem":
      return t("ranks.requirement.examProblem", {
        rank: t(`ranks.names.${requirement.exam}`),
        // ranks.requirement.examProblemNames.position_memory / .puzzle
        problem: t(`ranks.requirement.examProblemNames.${requirement.problem}`),
      });
    case "challenge_score": {
      // ranks.challengeNames.square_colors, ranks.challengeNames.legal_moves_king, …
      const nameKey =
        requirement.leaderboardKey === "default"
          ? requirement.menuType
          : `${requirement.menuType}_${requirement.leaderboardKey}`;
      return t("ranks.requirement.challengeScore", {
        challengeName: t(`ranks.challengeNames.${nameKey}`),
        minScore: requirement.minScore,
      });
    }
    case "game_publish_win":
      return t("ranks.requirement.gamePublishWin");
    case "game_publish_win_hidden_board":
      return t("ranks.requirement.gamePublishWinHiddenBoard", {
        maxPeeks: requirement.maxPeeks,
      });
  }
}

/** The account's highest rank as a known slug (the server sends a string). */
export function parseHighestRank(
  value: string | null | undefined,
): RankSlug | undefined {
  return isRankSlug(value) ? value : undefined;
}
