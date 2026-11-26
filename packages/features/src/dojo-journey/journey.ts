/**
 * A rank's journey in the dojo: the steps that lead to it, grouped into three
 * stages — learn (read the guides), practice (try the rank's challenges) and
 * exam (meet the rank's requirements) — and how far a player has come.
 *
 * @description
 * Progress such as "2 / 5" is never stored. What a rank asks the player to do
 * is code (the guides, {@link RANK_REQUIREMENTS}); what the database keeps is
 * only the set of things a player has finished (step keys, best scores, the
 * ranks held). {@link buildRankJourney} puts the two together on every call.
 * Storing the denominator — a progress percentage per rank, say — would need
 * a data migration every time a guide gains or loses a page; deriving it
 * means a new page simply shows up as one more step to do.
 */
import {
  type EarnedRankSlug,
  RANK_REQUIREMENTS,
  type RankRequirement,
  type RankSlug,
  type RankStanding,
  rankStanding,
} from "../dojo-ranks/ranks";
import {
  MAX_GUIDE_PAGES,
  challengeKey,
  examStepKey,
  guideStepKey,
} from "./steps";

export type JourneyStage = "learn" | "practice" | "exam";

/** The stages in the order a player is guided through them. */
const STAGE_ORDER: readonly JourneyStage[] = ["learn", "practice", "exam"];

export type JourneyStep =
  | {
      stage: "learn";
      kind: "guidePage";
      guideRank: RankSlug;
      /** 1-based. */
      page: number;
      done: boolean;
    }
  | {
      stage: "practice";
      kind: "challenge";
      menuType: string;
      leaderboardKey: string;
      done: boolean;
    }
  | {
      stage: "exam";
      kind: "requirement";
      requirement: RankRequirement;
      done: boolean;
      /**
       * The player's best score on a `challenge_score` requirement's
       * leaderboard, from `bestScores`: what a requirement row compares with
       * its `minScore` ("best 38 / needed 40"). Absent for other
       * requirements and when there is no score (signed out, or never
       * finished), so a missing record never reads as a score of 0.
       */
      bestScore?: number;
    };

/** What a player has finished, as read from the server or the device. */
export type JourneyInput = {
  /** The server's highest rank for the player; undefined when signed out. */
  highest: RankSlug | undefined;
  /** Step keys (`guide:…`, `exam:…`) the player has completed. */
  completedSteps: ReadonlySet<string>;
  /** {@link challengeKey}s the player has finished at least once. */
  attemptedChallenges: ReadonlySet<string>;
  bestScores: readonly {
    menuType: string;
    leaderboardKey: string;
    score: number;
  }[];
  /** How many pages each rank's guide has; a missing rank has none. */
  guidePageCounts: Readonly<Partial<Record<RankSlug, number>>>;
};

export type RankJourney = {
  rank: EarnedRankSlug;
  standing: RankStanding;
  /** Every step, learn first, then practice, then exam. */
  steps: readonly JourneyStep[];
  /** Done and total per stage, in stage order. A stage with no steps is left out. */
  stages: readonly { stage: JourneyStage; done: number; total: number }[];
};

/**
 * The guides the learn stage of each rank goes through, in reading order.
 *
 * 5kyu starts with the unranked guide as well as its own: the unranked guide
 * introduces algebraic notation, which 5kyu's coordinate challenge assumes.
 * 4kyu to 1kyu read their own guide. 1dan has no guide, so it has no learn
 * stage.
 */
export const LEARN_GUIDES: Readonly<
  Record<EarnedRankSlug, readonly RankSlug[]>
> = {
  "5kyu": ["mukyu", "5kyu"],
  "4kyu": ["4kyu"],
  "3kyu": ["3kyu"],
  "2kyu": ["2kyu"],
  "1kyu": ["1kyu"],
  "1dan": [],
};

/** Pages of a guide, ignoring counts that are not a positive whole number. */
function pageCountOf(input: JourneyInput, guide: RankSlug): number {
  const count = input.guidePageCounts[guide] ?? 0;
  if (!Number.isInteger(count) || count < 1) return 0;
  return Math.min(count, MAX_GUIDE_PAGES);
}

function bestScoreOf(
  input: JourneyInput,
  menuType: string,
  leaderboardKey: string,
): number | undefined {
  let best: number | undefined;
  for (const row of input.bestScores) {
    if (row.menuType !== menuType || row.leaderboardKey !== leaderboardKey) {
      continue;
    }
    if (best === undefined || row.score > best) best = row.score;
  }
  return best;
}

function isRequirementMet(
  requirement: RankRequirement,
  input: JourneyInput,
): boolean {
  switch (requirement.type) {
    case "challenge_score": {
      const best = bestScoreOf(
        input,
        requirement.menuType,
        requirement.leaderboardKey,
      );
      return best !== undefined && best >= requirement.minScore;
    }
    case "exam_problem":
      return input.completedSteps.has(
        examStepKey(requirement.exam, requirement.problem),
      );
    // Published games are not part of the input: they are only known to be
    // met once the server has granted the rank, which marks every step done.
    case "game_publish_win":
    case "game_publish_win_hidden_board":
      return false;
  }
}

/**
 * Builds `rank`'s journey from what the player has finished.
 *
 * - **Learn**: one step per page of each guide in {@link LEARN_GUIDES},
 *   done when its `guide:` step key is in `completedSteps`.
 * - **Practice**: one step per `challenge_score` requirement of the rank —
 *   "have you finished this challenge at least once", at any score. It is
 *   done when the challenge's {@link challengeKey} is in
 *   `attemptedChallenges` (the device's own mark, for signed-out players) or
 *   `bestScores` has a row for the same `(menuType, leaderboardKey)` (a
 *   signed-in player's server record). Counting the unit the scores are
 *   already recorded under means no new table is needed. A rank with no
 *   challenge requirement has no practice stage.
 * - **Exam**: the rank's requirements themselves, one step each — in chess,
 *   reaching a challenge's bar or passing an exam problem is the exam. A
 *   challenge is done once its best score reaches `minScore`, an exam
 *   problem once its `exam:` step key is completed; a published game counts
 *   only through the rank being held. With one requirement this reads as
 *   passed / not yet, with several as "n / N". A challenge's step also
 *   carries the best score behind it (`bestScore`), when there is one.
 *
 * Holding the rank marks every step done, whatever the input says: the rank
 * is the proof, and guides or requirements added after it was earned must
 * not reopen it.
 *
 * Keys in the input that name no step of this rank (another rank's pages,
 * pages past the guide's end, unknown keys) are ignored, so they never count
 * towards a stage.
 */
export function buildRankJourney(
  rank: EarnedRankSlug,
  input: JourneyInput,
): RankJourney {
  const standing = rankStanding(rank, input.highest);
  const held = standing === "achieved";
  const steps: JourneyStep[] = [];

  for (const guideRank of LEARN_GUIDES[rank]) {
    const pages = pageCountOf(input, guideRank);
    for (let page = 1; page <= pages; page++) {
      steps.push({
        stage: "learn",
        kind: "guidePage",
        guideRank,
        page,
        done: held || input.completedSteps.has(guideStepKey(guideRank, page)),
      });
    }
  }

  const requirements = RANK_REQUIREMENTS[rank];
  for (const requirement of requirements) {
    if (requirement.type !== "challenge_score") continue;
    const { menuType, leaderboardKey } = requirement;
    steps.push({
      stage: "practice",
      kind: "challenge",
      menuType,
      leaderboardKey,
      done:
        held ||
        input.attemptedChallenges.has(challengeKey(menuType, leaderboardKey)) ||
        bestScoreOf(input, menuType, leaderboardKey) !== undefined,
    });
  }

  for (const requirement of requirements) {
    const bestScore =
      requirement.type === "challenge_score"
        ? bestScoreOf(input, requirement.menuType, requirement.leaderboardKey)
        : undefined;
    steps.push({
      stage: "exam",
      kind: "requirement",
      requirement,
      done: held || isRequirementMet(requirement, input),
      ...(bestScore === undefined ? {} : { bestScore }),
    });
  }

  const stages = STAGE_ORDER.flatMap((stage) => {
    const inStage = steps.filter((step) => step.stage === stage);
    if (inStage.length === 0) return [];
    return [
      {
        stage,
        done: inStage.filter((step) => step.done).length,
        total: inStage.length,
      },
    ];
  });

  return { rank, standing, steps, stages };
}

/**
 * The step to suggest next: the first one not done, looking at learn, then
 * practice, then exam. Undefined once every step is done, which is always the
 * case for a rank the player holds.
 *
 * Every screen that points the player somewhere asks this function, so two
 * screens never point at different steps. The order is a suggestion only;
 * nothing stops a player from taking the exam before reading the guide.
 */
export function firstUndoneStep(journey: RankJourney): JourneyStep | undefined {
  for (const stage of STAGE_ORDER) {
    const step = journey.steps.find((s) => s.stage === stage && !s.done);
    if (step) return step;
  }
  return undefined;
}

/** The stage of {@link firstUndoneStep}, or undefined when every step is done. */
export function currentStage(journey: RankJourney): JourneyStage | undefined {
  return firstUndoneStep(journey)?.stage;
}
