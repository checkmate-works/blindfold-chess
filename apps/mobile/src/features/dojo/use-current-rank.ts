import { useMemo } from "react";
import type { RankSlug } from "@blindfold-chess/features/dojo-ranks";

import { useDojoJourney } from "./use-dojo-journey";

export type CurrentRank = {
  /** The account's highest rank, as the server has it. */
  readonly highest: RankSlug | undefined;
  readonly signedIn: boolean;
};

/**
 * The player's standing in the dojo: the rank held.
 *
 * @description
 * The rank is the server's only (the account's `highestRank` from `GET /me`).
 * Nothing done on the device raises it: an exam pass counts once the server
 * has graded and recorded it, and the server's `user_ranks` is the one place
 * a rank is kept. This keeps the app and the web showing the same rank, and
 * a mark the device made can never be mistaken for a rank the server did not
 * grant.
 *
 * Which steps and requirements are done is the rank's journey
 * (`useDojoJourney`); a screen that shows them reads the journey directly
 * instead of this hook, so it syncs once.
 */
export function useCurrentRank(): CurrentRank {
  const { highest, signedIn } = useDojoJourney();
  return useMemo(() => ({ highest, signedIn }), [highest, signedIn]);
}
