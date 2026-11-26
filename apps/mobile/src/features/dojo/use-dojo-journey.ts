import { useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import {
  EARNED_RANK_SLUGS,
  isRankSlug,
  nextRankSlug,
  type EarnedRankSlug,
  type RankSlug,
} from "@blindfold-chess/features/dojo-ranks";
import {
  buildRankJourney,
  guideStepKey,
  type JourneyInput,
  type RankJourney,
} from "@blindfold-chess/features/dojo-journey";

import { useAuth } from "../../auth/use-auth";
import { GUIDE_CONTENT } from "../guides/generated/guides";
import {
  markGuestStep,
  markPendingStep,
  pendingStepsOf,
  useDeviceProgress,
  type DeviceProgress,
} from "./progress-store";
import {
  syncDojoProgress,
  useServerDojoProgress,
  type ServerDojoProgress,
  type SyncResult,
} from "./progress-sync";
import { parseHighestRank } from "./requirements";

/**
 * Pages per guide, read from the English copy of the bundled guides. Every
 * language has the same pages (the web's dictionaries share their key sets),
 * and one count for all languages keeps a page key meaning the same page
 * whatever language it was read in.
 */
export const GUIDE_PAGE_COUNTS: Readonly<Partial<Record<RankSlug, number>>> =
  Object.fromEntries(
    Object.entries(GUIDE_CONTENT.en.guides).flatMap(([rank, guide]) =>
      isRankSlug(rank) ? [[rank, guide.pages.length]] : [],
    ),
  );

/**
 * The journey input from the server's record and the device's marks.
 *
 * - Signed in (`userId` set): completed steps are the server's plus the
 *   user's own pending steps (read, not yet confirmed), and best scores are
 *   the server's. The server's record counts only when it was read for this
 *   same user. "Practised" also counts the challenges finished on this
 *   device while signed out (`guest.attempts`), which are never sent.
 * - Signed out: the guest's pages and challenges, and no best scores — a
 *   signed-out run is graded on the device and never reaches the server.
 */
export function composeJourneyInput({
  userId,
  highest,
  server,
  device,
}: {
  readonly userId: string | undefined;
  readonly highest: RankSlug | undefined;
  readonly server: ServerDojoProgress | undefined;
  readonly device: DeviceProgress;
}): JourneyInput {
  const attemptedChallenges = new Set(device.guest.attempts);
  if (userId === undefined) {
    return {
      highest,
      completedSteps: new Set(device.guest.steps),
      attemptedChallenges,
      bestScores: [],
      guidePageCounts: GUIDE_PAGE_COUNTS,
    };
  }
  const record = server?.userId === userId ? server : undefined;
  return {
    highest,
    completedSteps: new Set([
      ...(record?.completedSteps ?? []),
      ...pendingStepsOf(device, userId),
    ]),
    attemptedChallenges,
    bestScores: record?.bestScores ?? [],
    guidePageCounts: GUIDE_PAGE_COUNTS,
  };
}

export type DojoJourney = {
  /** The account's highest rank, from the server only; undefined signed out. */
  readonly highest: RankSlug | undefined;
  readonly signedIn: boolean;
  readonly journeyOf: (rank: EarnedRankSlug) => RankJourney;
  /** The rank to aim for next, or undefined once 1dan is held. */
  readonly nextRank: EarnedRankSlug | undefined;
  readonly nextJourney: RankJourney | undefined;
  /** Marks one page (1-based) of `rank`'s guide read. */
  readonly markGuidePage: (rank: RankSlug, page: number) => void;
  /** Syncs with the server again (after an exam pass, say). */
  readonly refresh: () => Promise<SyncResult | undefined>;
};

/**
 * The player's progress through the dojo, for every screen that shows it.
 *
 * @description
 * One hook so every screen reads the same input: the server's record
 * (`progress-sync.ts`) and the device's marks (`progress-store.ts`), put
 * together by {@link composeJourneyInput} and turned into each rank's
 * journey by the shared `buildRankJourney`. Signed in, it syncs whenever the
 * screen comes into focus and when the account appears (sign-in), so a page
 * read offline or a challenge just finished shows up.
 *
 * A page read while signed in goes into that user's pending steps first and
 * is sent from there, so it survives being offline. While the account is
 * still loading the user is not known, and a page turned then is not marked:
 * marking it as the guest's would give it to whoever signs in first.
 */
export function useDojoJourney(): DojoJourney {
  const { status, account } = useAuth();
  const signedIn = status === "signedIn";
  const userId = signedIn ? account?.userId : undefined;
  const highest = signedIn ? parseHighestRank(account?.highestRank) : undefined;
  const device = useDeviceProgress();
  const server = useServerDojoProgress();

  useFocusEffect(
    useCallback(() => {
      if (userId !== undefined) void syncDojoProgress(userId);
    }, [userId]),
  );

  const input = useMemo(
    () => composeJourneyInput({ userId, highest, server, device }),
    [userId, highest, server, device],
  );

  const journeys = useMemo(() => {
    const cache = new Map<EarnedRankSlug, RankJourney>();
    return (rank: EarnedRankSlug) => {
      let journey = cache.get(rank);
      if (!journey) {
        journey = buildRankJourney(rank, input);
        cache.set(rank, journey);
      }
      return journey;
    };
  }, [input]);

  const markGuidePage = useCallback(
    (rank: RankSlug, page: number) => {
      const key = guideStepKey(rank, page);
      if (status === "signedOut" || status === "unavailable") {
        void markGuestStep(key);
      } else if (userId !== undefined) {
        void markPendingStep(userId, key).then(() => syncDojoProgress(userId));
      }
    },
    [status, userId],
  );

  const refresh = useCallback(
    () =>
      userId === undefined
        ? Promise.resolve(undefined)
        : syncDojoProgress(userId),
    [userId],
  );

  return useMemo(() => {
    const nextRank = nextRankSlug(highest);
    return {
      highest,
      signedIn,
      journeyOf: journeys,
      nextRank,
      nextJourney: nextRank ? journeys(nextRank) : undefined,
      markGuidePage,
      refresh,
    };
  }, [highest, signedIn, journeys, markGuidePage, refresh]);
}

/** Every earned rank's journey, for screens that look across the ladder. */
export function allJourneys(
  journeyOf: (rank: EarnedRankSlug) => RankJourney,
): readonly RankJourney[] {
  return EARNED_RANK_SLUGS.map((rank) => journeyOf(rank as EarnedRankSlug));
}
