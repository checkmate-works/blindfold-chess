import type {
  ChallengeAnswerResponse,
  RemoteChallengePort,
} from "@blindfold-chess/features/challenge-attempt";
import type { ChallengeMenuType } from "@blindfold-chess/features/practice-registry";

import { callMobileApi, errorCodeOf } from "../../auth/api-client";

export type BeginResult<Q> =
  | { kind: "recorded"; attemptId: string; remote: RemoteChallengePort<Q> }
  /** Plays locally, unrecorded: signed out, no backend, or banned. */
  | { kind: "unrecorded" }
  | { kind: "error"; reason: "rateLimited" | "failed" };

/**
 * Starts a recorded challenge through the mobile API — the app's
 * counterpart of the web's `useChallengeAttempt` start. The returned port
 * plugs into the shared session hooks' remote mode: the server supplies and
 * grades every question.
 */
export async function beginChallenge<Q>(
  menuType: ChallengeMenuType,
  settings: unknown,
): Promise<BeginResult<Q>> {
  const response = await callMobileApi("/challenges", {
    method: "POST",
    body: { menuType, settings },
  });
  if (response === "signedOut" || response === "unavailable") {
    return { kind: "unrecorded" };
  }
  if (response === "offline") return { kind: "error", reason: "failed" };
  if (!response.ok) {
    const code = await errorCodeOf(response);
    if (code === "banned") return { kind: "unrecorded" };
    return {
      kind: "error",
      reason: code === "rateLimited" ? "rateLimited" : "failed",
    };
  }
  const body = (await response.json()) as {
    attemptId: string;
    first: { sequence: number; question: Q };
  };
  const { attemptId } = body;
  return {
    kind: "recorded",
    attemptId,
    remote: {
      first: body.first,
      // Throws on a failed request: the session hook retries a thrown
      // answer a few times (the server replays a resent answer), then ends
      // the run as `remoteFailed`.
      submitAnswer: async (sequence, answer) => {
        const result = await callMobileApi(`/challenges/${attemptId}/answers`, {
          method: "POST",
          body: { sequence, answer },
        });
        if (typeof result === "string" || !result.ok) {
          throw new Error(
            `answer not delivered (${typeof result === "string" ? result : result.status})`,
          );
        }
        return (await result.json()) as ChallengeAnswerResponse<Q>;
      },
    },
  };
}

export type FinishResult =
  | { kind: "recorded"; grantedRanks: unknown[] }
  | { kind: "notRecorded" }
  | { kind: "failed" };

const MAX_PENDING_RESENDS = 5;
const PENDING_RESEND_MARGIN_MS = 100;
const FAILURE_RESEND_DELAYS_MS = [500, 1000, 2000, 4000, 8000];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Finishes a recorded challenge, as the web's `useChallengeResultSave`
 * does: resend while the server says `pending` (its clock has not run out
 * yet), and on a failed request with backoff. Finish is idempotent, so
 * resending is safe.
 */
export async function finishChallenge(
  attemptId: string,
): Promise<FinishResult> {
  let pending = 0;
  let failures = 0;
  for (;;) {
    const response = await callMobileApi(`/challenges/${attemptId}/finish`, {
      method: "POST",
    });
    if (typeof response === "string" || !response.ok) {
      if (response === "signedOut") return { kind: "failed" };
      if (failures >= FAILURE_RESEND_DELAYS_MS.length)
        return { kind: "failed" };
      await wait(FAILURE_RESEND_DELAYS_MS[failures++]);
      continue;
    }
    const body = (await response.json()) as
      | { status: "pending"; remainingMs: number }
      | { status: "done"; success: true; grantedRanks: unknown[] }
      | { status: "done"; success: false; error: string };
    if (body.status === "pending") {
      if (pending >= MAX_PENDING_RESENDS) return { kind: "failed" };
      pending += 1;
      await wait(body.remainingMs + PENDING_RESEND_MARGIN_MS);
      continue;
    }
    if (body.success)
      return { kind: "recorded", grantedRanks: body.grantedRanks };
    return { kind: "notRecorded" };
  }
}
