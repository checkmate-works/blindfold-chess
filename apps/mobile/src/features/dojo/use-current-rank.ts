import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import type { RankSlug } from "@blindfold-chess/features/dojo-ranks";

import { useAuth } from "../../auth/use-auth";
import { fetchDojoProgress, type BestScore } from "./dojo-api";
import {
  effectiveHighestRank,
  isRequirementMet,
  type MobileRankRequirement,
} from "./mobile-requirements";
import { usePassedExams } from "./passed-exams";
import { parseHighestRank } from "./requirements";

export type CurrentRank = {
  /** The rank shown: the account's, raised by exams passed on the device. */
  readonly highest: RankSlug | undefined;
  readonly signedIn: boolean;
  /** Met, not met, or `undefined` when the app cannot tell. */
  readonly isMet: (requirement: MobileRankRequirement) => boolean | undefined;
};

/**
 * The player's standing in the dojo.
 *
 * @description
 * The rank comes from the account (`GET /me`, via `useAuth`) and the best
 * challenge scores from `GET /dojo`, re-read whenever the screen comes back
 * into focus so a challenge just finished shows up. Signed out there is no
 * rank and no recorded score — a signed-out run is graded on the device and
 * never reaches the server — so only the device's own exam passes count.
 * Those passes raise the shown rank by the exam's rank (see
 * `effectiveHighestRank`); the account's rank on the server is unchanged.
 */
export function useCurrentRank(): CurrentRank {
  const { status, account } = useAuth();
  const signedIn = status === "signedIn";
  const passedExams = usePassedExams();
  const [bestScores, setBestScores] = useState<readonly BestScore[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!signedIn) {
        setBestScores([]);
        return;
      }
      let active = true;
      void fetchDojoProgress().then((result) => {
        // A failed read keeps the last scores; the rows then show as not met,
        // which is also what a fresh account sees.
        if (active && !("error" in result)) setBestScores(result.bestScores);
      });
      return () => {
        active = false;
      };
    }, [signedIn]),
  );

  return useMemo(() => {
    const facts = { bestScores, passedExams };
    return {
      highest: effectiveHighestRank(
        parseHighestRank(account?.highestRank),
        passedExams,
      ),
      signedIn,
      isMet: (requirement) => isRequirementMet(requirement, facts),
    };
  }, [account?.highestRank, bestScores, passedExams, signedIn]);
}
