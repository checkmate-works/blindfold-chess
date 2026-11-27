import {
  isRankSlug,
  type EarnedRankSlug,
  type ExamProblemKind,
  type RankSlug,
} from "@blindfold-chess/features/dojo-ranks";
import {
  examProblemSegment,
  parseMobileDojoExamResponse,
  parseMobileDojoResponse,
  parseMobileDojoStepsResponse,
  type ExamAnswer,
  type MobileDojoExamResponse,
  type MobileDojoStepsResponse,
} from "@blindfold-chess/features/dojo-journey";

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
  /** Step keys (`guide:…`, `exam:…`) the server has recorded for the user. */
  readonly completedSteps: readonly string[];
};

export type DojoApiError = { error: ApiFailure | "serverError" };

// Every body is read with `json().catch(() => undefined)` and checked by the
// shared parsers: a 2xx from a captive portal or a proxy is not proof of a
// body from our API, and a malformed one is treated like a failed request.

/** `GET /dojo`: the ranks held, best scores and completed steps. */
export async function fetchDojoProgress(): Promise<
  DojoProgress | DojoApiError
> {
  const response = await callMobileApi("/dojo");
  if (typeof response === "string") return { error: response };
  if (!response.ok) return { error: "serverError" };
  const body = parseMobileDojoResponse(
    await response.json().catch(() => undefined),
  );
  if (!body) return { error: "serverError" };
  return {
    achievedRanks: body.achievedRanks.filter(isRankSlug),
    bestScores: body.bestScores,
    completedSteps: body.completedSteps,
  };
}

/**
 * `POST /dojo/steps`: reports guide pages read. The caller keeps at most
 * `DOJO_STEPS_MAX` keys per request; the server answers for every key, as
 * recorded (`completed`, including ones recorded before) or refused
 * (`rejected`).
 */
export async function postGuideSteps(
  steps: readonly string[],
): Promise<MobileDojoStepsResponse | DojoApiError> {
  const response = await callMobileApi("/dojo/steps", {
    method: "POST",
    body: { steps },
  });
  if (typeof response === "string") return { error: response };
  if (!response.ok) return { error: "serverError" };
  const body = parseMobileDojoStepsResponse(
    await response.json().catch(() => undefined),
  );
  return body ?? { error: "serverError" };
}

/**
 * `POST /dojo/exams/<exam>/<problem>`: sends the raw answer (the recreated
 * FEN, or the player's moves in SAN) for the server to grade. The app never
 * sends a verdict; the server decides the pass and whether it is recorded.
 */
export async function submitExamProblem(
  exam: EarnedRankSlug,
  problem: ExamProblemKind,
  answer: ExamAnswer,
): Promise<MobileDojoExamResponse | DojoApiError> {
  const response = await callMobileApi(
    `/dojo/exams/${exam}/${examProblemSegment(problem)}`,
    { method: "POST", body: answer },
  );
  if (typeof response === "string") return { error: response };
  if (!response.ok) return { error: "serverError" };
  const body = parseMobileDojoExamResponse(
    await response.json().catch(() => undefined),
  );
  return body ?? { error: "serverError" };
}
