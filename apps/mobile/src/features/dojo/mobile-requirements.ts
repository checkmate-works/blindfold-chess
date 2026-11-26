import {
  RANK_REQUIREMENTS,
  RANK_SLUGS,
  nextRankSlug,
  type EarnedRankSlug,
  type RankRequirement,
  type RankSlug,
} from "@blindfold-chess/features/dojo-ranks";

import type { BestScore } from "./dojo-api";
import { DOJO_EXAMS } from "./exams";

/** Pass the app's exam for a rank (`exams.ts`). */
export type DojoExamRequirement = {
  readonly type: "dojo_exam";
  readonly rank: EarnedRankSlug;
};

/** A requirement as the app asks it: the shared ones, or an app exam. */
export type MobileRankRequirement = RankRequirement | DojoExamRequirement;

/**
 * What the app asks for each rank: the shared requirements, except where
 * the app has its own exam, which replaces them (2kyu's posting becomes
 * solving). The web keeps asking the shared ones.
 */
export function mobileRankRequirements(
  slug: EarnedRankSlug,
): readonly MobileRankRequirement[] {
  return DOJO_EXAMS[slug]
    ? [{ type: "dojo_exam", rank: slug }]
    : RANK_REQUIREMENTS[slug];
}

/** What the app knows about the player's progress. */
export type ProgressFacts = {
  readonly bestScores: readonly BestScore[];
  readonly passedExams: ReadonlySet<RankSlug>;
};

/**
 * Whether a requirement is met, or `undefined` when the app cannot tell
 * (posting and publishing are judged on the web; holding the rank is the
 * only sign of them the app sees).
 */
export function isRequirementMet(
  requirement: MobileRankRequirement,
  facts: ProgressFacts,
): boolean | undefined {
  switch (requirement.type) {
    case "challenge_score":
      return facts.bestScores.some(
        (s) =>
          s.menuType === requirement.menuType &&
          s.leaderboardKey === requirement.leaderboardKey &&
          s.score >= requirement.minScore,
      );
    case "dojo_exam":
      return facts.passedExams.has(requirement.rank);
    default:
      return undefined;
  }
}

/**
 * The rank the app shows: the account's highest, raised through any rank
 * right above it whose app exam was passed on this device. Only the next
 * rank up counts, so an exam passed early does not skip the ranks below it.
 */
export function effectiveHighestRank(
  serverHighest: RankSlug | undefined,
  passedExams: ReadonlySet<RankSlug>,
): RankSlug | undefined {
  let highest = serverHighest;
  for (let step = 0; step < RANK_SLUGS.length; step++) {
    const next = nextRankSlug(highest);
    if (!next || !DOJO_EXAMS[next] || !passedExams.has(next)) break;
    highest = next;
  }
  return highest;
}
