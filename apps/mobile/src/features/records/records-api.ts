import { MODULE_TO_SLUG } from "@blindfold-chess/features/practice-registry";

import { callMobileApi, type ApiFailure } from "../../auth/api-client";

export const RANK_PERIODS = ["all-time", "weekly", "monthly"] as const;
export type RankPeriod = (typeof RANK_PERIODS)[number];

/** One of the user's own leaderboard positions. */
export type OwnRank = {
  /** Registry module (`square_colors`, …). */
  module: string;
  /** The leaderboard within the module (`default`, `white`, `knight`, …). */
  key: string;
  rank: number;
};

export async function fetchOwnRanks(
  period: RankPeriod,
): Promise<OwnRank[] | { error: ApiFailure | "serverError" }> {
  const response = await callMobileApi(`/leaderboard/ranks?period=${period}`);
  if (typeof response === "string") return { error: response };
  if (!response.ok) return { error: "serverError" };
  const body = (await response.json().catch(() => undefined)) as
    { ranks?: unknown } | undefined;
  if (!Array.isArray(body?.ranks)) return { error: "serverError" };
  return body.ranks.filter(
    (r): r is OwnRank =>
      typeof r === "object" &&
      r !== null &&
      typeof (r as OwnRank).module === "string" &&
      typeof (r as OwnRank).key === "string" &&
      typeof (r as OwnRank).rank === "number",
  );
}

/** The practice slug (`square-colors`) of a registry module, if any. */
export function slugOfModule(module: string): string | undefined {
  return (MODULE_TO_SLUG as Record<string, string>)[module];
}
