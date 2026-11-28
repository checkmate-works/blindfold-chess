import { MODULE_TO_SLUG } from "@blindfold-chess/features/practice-registry";

import type { RankPeriod } from "./records-api";

/**
 * The web path of one challenge leaderboard
 * (`/leaderboard/score/<period>/<module-slug>/<key>`), for `openWebPage`.
 * The full board, with other players' names, lives only on the web: the
 * app shows no other user, so it links out instead of drawing the board.
 * `undefined` for a module the registry has no slug for, which has no page.
 */
export function leaderboardPath(
  period: RankPeriod,
  module: string,
  key: string,
): string | undefined {
  const slug = (MODULE_TO_SLUG as Record<string, string>)[module];
  if (!slug) return undefined;
  return `/leaderboard/score/${period}/${slug}/${encodeURIComponent(key)}`;
}
