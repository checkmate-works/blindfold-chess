import type { RankSlug } from "@blindfold-chess/features/dojo-ranks";

import { useAuth } from "../../auth/use-auth";
import { parseHighestRank } from "./requirements";

/**
 * The player's highest rank and whether it comes from an account. Signed out
 * (or before the account loads) there is no rank: the ladder starts at mukyu
 * and the first goal is 5kyu, which is also where a new account stands.
 */
export function useCurrentRank(): {
  readonly highest: RankSlug | undefined;
  readonly signedIn: boolean;
} {
  const { status, account } = useAuth();
  return {
    highest: parseHighestRank(account?.highestRank),
    signedIn: status === "signedIn",
  };
}
