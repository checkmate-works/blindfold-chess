import { useMemo } from "react";
import type {
  RankRequirement,
  RankSlug,
} from "@blindfold-chess/features/dojo-ranks";

import { allJourneys, useDojoJourney } from "./use-dojo-journey";

export type CurrentRank = {
  /** The account's highest rank, as the server has it. */
  readonly highest: RankSlug | undefined;
  readonly signedIn: boolean;
  /**
   * Whether a requirement is met, read from the exam stage of the rank's
   * journey; `undefined` for a requirement that is not one of the shared
   * `RANK_REQUIREMENTS`.
   */
  readonly isMet: (requirement: RankRequirement) => boolean | undefined;
};

/**
 * The player's standing in the dojo: the rank held and which requirements
 * are met.
 *
 * @description
 * The rank is the server's only (the account's `highestRank` from `GET /me`).
 * Nothing done on the device raises it: an exam pass counts once the server
 * has graded and recorded it, and the server's `user_ranks` is the one place
 * a rank is kept. This keeps the app and the web showing the same rank, and
 * a mark the device made can never be mistaken for a rank the server did not
 * grant.
 *
 * `isMet` answers from the journeys `useDojoJourney` builds, matching the
 * requirement objects of `RANK_REQUIREMENTS` by identity.
 */
export function useCurrentRank(): CurrentRank {
  const { highest, signedIn, journeyOf } = useDojoJourney();

  return useMemo(() => {
    const met = new Map<RankRequirement, boolean>();
    for (const journey of allJourneys(journeyOf)) {
      for (const step of journey.steps) {
        if (step.kind === "requirement") met.set(step.requirement, step.done);
      }
    }
    return {
      highest,
      signedIn,
      isMet: (requirement) => met.get(requirement),
    };
  }, [highest, signedIn, journeyOf]);
}
