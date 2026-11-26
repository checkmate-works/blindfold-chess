import {
  isRankSlug,
  type RankSlug,
} from "@blindfold-chess/features/dojo-ranks";

import { callMobileApi, type ApiFailure } from "../../auth/api-client";

/** The user's best score on one challenge leaderboard. */
export type BestScore = {
  readonly menuType: string;
  readonly leaderboardKey: string;
  readonly score: number;
};

export type DojoProgress = {
  /** The ranks the account holds, as granted (not the ladder below the top). */
  readonly achievedRanks: readonly RankSlug[];
  readonly bestScores: readonly BestScore[];
};

/** `GET /dojo`: what the dojo needs to mark each requirement met or not. */
export async function fetchDojoProgress(): Promise<
  DojoProgress | { error: ApiFailure | "serverError" }
> {
  const response = await callMobileApi("/dojo");
  if (typeof response === "string") return { error: response };
  if (!response.ok) return { error: "serverError" };
  const body = (await response.json().catch(() => undefined)) as
    { achievedRanks?: unknown; bestScores?: unknown } | undefined;
  if (!Array.isArray(body?.achievedRanks) || !Array.isArray(body.bestScores)) {
    return { error: "serverError" };
  }
  return {
    achievedRanks: body.achievedRanks.filter(isRankSlug),
    bestScores: body.bestScores.filter(
      (s): s is BestScore =>
        typeof s === "object" &&
        s !== null &&
        typeof (s as BestScore).menuType === "string" &&
        typeof (s as BestScore).leaderboardKey === "string" &&
        typeof (s as BestScore).score === "number",
    ),
  };
}
