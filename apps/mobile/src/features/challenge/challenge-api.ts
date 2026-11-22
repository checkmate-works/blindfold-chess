import type {
  ChallengeAnswerResponse,
  RemoteChallengePort,
} from "@blindfold-chess/features/challenge-attempt";
import type { ChallengeMenuType } from "@blindfold-chess/features/practice-registry";

import { callMobileApi, errorCodeOf } from "../../auth/api-client";

// A 2xx is not proof of a JSON body from our API: a captive portal or a
// proxy can answer with an HTML page and a 200. Every body below is read
// with `response.json().catch(() => undefined)` and checked for the fields
// this module uses before it is trusted; a body that fails the check is
// handled like a failed request. Letting `json()` reject instead would leave
// the caller's promise unhandled — the challenge gate has no `.catch`, so it
// would sit on its loading state for good.

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** `{ sequence, question }`; the question's own shape is the menu's business. */
function isQuestionSlot(v: unknown): boolean {
  return isRecord(v) && typeof v.sequence === "number" && "question" in v;
}

function isBeginBody<Q>(
  v: unknown,
): v is { attemptId: string; first: { sequence: number; question: Q } } {
  return (
    isRecord(v) && typeof v.attemptId === "string" && isQuestionSlot(v.first)
  );
}

function isAnswerResponse<Q>(v: unknown): v is ChallengeAnswerResponse<Q> {
  if (!isRecord(v)) return false;
  if (v.status === "expired" || v.status === "rejected") return true;
  return (
    v.status === "accepted" &&
    typeof v.correct === "boolean" &&
    typeof v.elapsedMs === "number" &&
    (v.feedbackExtensionMs === undefined ||
      typeof v.feedbackExtensionMs === "number") &&
    (v.next === null || isQuestionSlot(v.next))
  );
}

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
 *
 * Never rejects. A 2xx whose body is not JSON, or lacks a string
 * `attemptId` and a `first` question with a numeric `sequence`, resolves to
 * `{ kind: "error", reason: "failed" }`, the same as an unreachable server.
 *
 * The port's `submitAnswer` is the one exception, on purpose: it throws on a
 * failed request and on a 2xx it cannot read (not JSON, or not one of the
 * `accepted` / `expired` / `rejected` shapes), because the shared session
 * hook retries a thrown answer and ends the run as `remoteFailed` after the
 * last attempt. Returning a value there would skip the retries.
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
  const body: unknown = await response.json().catch(() => undefined);
  if (!isBeginBody<Q>(body)) return { kind: "error", reason: "failed" };
  const { attemptId } = body;
  return {
    kind: "recorded",
    attemptId,
    remote: {
      first: body.first,
      // Throws on a failed request or an unreadable 2xx: the session hook
      // retries a thrown answer a few times (the server replays a resent
      // answer), then ends the run as `remoteFailed`.
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
        const answerBody: unknown = await result.json().catch(() => undefined);
        if (!isAnswerResponse<Q>(answerBody)) {
          throw new Error(`answer response unreadable (${result.status})`);
        }
        return answerBody;
      },
    },
  };
}

export type FinishResult =
  | { kind: "recorded"; grantedRanks: { slug: string }[] }
  | { kind: "notRecorded" }
  | { kind: "failed" };

const MAX_PENDING_RESENDS = 5;
const PENDING_RESEND_MARGIN_MS = 100;
const FAILURE_RESEND_DELAYS_MS = [500, 1000, 2000, 4000, 8000];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type FinishBody =
  | { status: "pending"; remainingMs: number }
  | { status: "done"; success: true; grantedRanks: { slug: string }[] }
  | { status: "done"; success: false };

/** The finish body, or undefined when it is not one this client can act on. */
function readFinishBody(v: unknown): FinishBody | undefined {
  if (!isRecord(v)) return undefined;
  if (v.status === "pending") {
    return typeof v.remainingMs === "number"
      ? { status: "pending", remainingMs: v.remainingMs }
      : undefined;
  }
  if (v.status !== "done") return undefined;
  if (v.success === false) return { status: "done", success: false };
  if (v.success !== true || !Array.isArray(v.grantedRanks)) return undefined;
  return {
    status: "done",
    success: true,
    // A rank entry without a slug cannot be shown; drop it, keep the rest.
    grantedRanks: v.grantedRanks.filter(
      (r: unknown): r is { slug: string } =>
        isRecord(r) && typeof r.slug === "string",
    ),
  };
}

/**
 * Finishes a recorded challenge, as the web's `useChallengeResultSave`
 * does: resend while the server says `pending` (its clock has not run out
 * yet), and on a failed request with backoff. Finish is idempotent, so
 * resending is safe.
 *
 * Never rejects. A 2xx whose body is not JSON or not a `pending` / `done`
 * body counts as a failed request — resent with the same backoff, then
 * `{ kind: "failed" }` — since a captive portal or proxy page can be gone
 * by a later try, and resending finish is safe.
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
    if (response === "signedOut") return { kind: "failed" };
    const body =
      typeof response === "string" || !response.ok
        ? undefined
        : readFinishBody(await response.json().catch(() => undefined));
    if (body === undefined) {
      if (failures >= FAILURE_RESEND_DELAYS_MS.length)
        return { kind: "failed" };
      await wait(FAILURE_RESEND_DELAYS_MS[failures++]);
      continue;
    }
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
