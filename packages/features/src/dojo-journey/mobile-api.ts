/**
 * The response shapes of the mobile dojo API, and parsers the app runs on a
 * response body before trusting it.
 *
 * @description
 * The server builds these responses and the app reads them; keeping the types
 * here makes both sides compile against one contract. Each parser returns
 * undefined when the body does not match the shape, rather than a partly
 * filled value, so the app treats a malformed response like a failed request.
 */

/** The player's dojo record: ranks held, best challenge scores, completed step keys. */
export type MobileDojoResponse = {
  achievedRanks: string[];
  bestScores: { menuType: string; leaderboardKey: string; score: number }[];
  completedSteps: string[];
};

/**
 * The most guide step keys one request may report. A client reports the
 * pages it has read since its last sync, which never comes close; the cap
 * bounds the work one request can ask of the server.
 */
export const DOJO_STEPS_MAX = 100;

/**
 * The answer to reporting guide step keys: the keys now recorded (including
 * ones already recorded before) and the keys refused, such as `exam:` keys or
 * malformed ones.
 */
export type MobileDojoStepsResponse = {
  completed: string[];
  rejected: string[];
};

/**
 * The answer to submitting an exam answer. `recorded` is true when the pass
 * was written or had been written before; a correct answer from a player who
 * may not have it recorded is graded only. `grantedRanks` are the ranks this
 * submission earned and `highestRank` the player's highest rank afterwards.
 */
export type MobileDojoExamResponse = {
  passed: boolean;
  accuracy: number | null;
  recorded: boolean;
  grantedRanks: string[];
  highestRank: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isBestScore(
  value: unknown,
): value is MobileDojoResponse["bestScores"][number] {
  return (
    isRecord(value) &&
    typeof value.menuType === "string" &&
    typeof value.leaderboardKey === "string" &&
    typeof value.score === "number" &&
    Number.isFinite(value.score)
  );
}

export function parseMobileDojoResponse(
  body: unknown,
): MobileDojoResponse | undefined {
  if (!isRecord(body)) return undefined;
  const { achievedRanks, bestScores, completedSteps } = body;
  if (
    !isStringArray(achievedRanks) ||
    !Array.isArray(bestScores) ||
    !bestScores.every(isBestScore) ||
    !isStringArray(completedSteps)
  ) {
    return undefined;
  }
  return {
    achievedRanks: [...achievedRanks],
    bestScores: bestScores.map(({ menuType, leaderboardKey, score }) => ({
      menuType,
      leaderboardKey,
      score,
    })),
    completedSteps: [...completedSteps],
  };
}

export function parseMobileDojoStepsResponse(
  body: unknown,
): MobileDojoStepsResponse | undefined {
  if (!isRecord(body)) return undefined;
  const { completed, rejected } = body;
  if (!isStringArray(completed) || !isStringArray(rejected)) return undefined;
  return { completed: [...completed], rejected: [...rejected] };
}

export function parseMobileDojoExamResponse(
  body: unknown,
): MobileDojoExamResponse | undefined {
  if (!isRecord(body)) return undefined;
  const { passed, accuracy, recorded, grantedRanks, highestRank } = body;
  if (
    typeof passed !== "boolean" ||
    !(
      accuracy === null ||
      (typeof accuracy === "number" && Number.isFinite(accuracy))
    ) ||
    typeof recorded !== "boolean" ||
    !isStringArray(grantedRanks) ||
    !(highestRank === null || typeof highestRank === "string")
  ) {
    return undefined;
  }
  return {
    passed,
    accuracy,
    recorded,
    grantedRanks: [...grantedRanks],
    highestRank,
  };
}
