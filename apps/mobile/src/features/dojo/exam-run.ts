/**
 * One answer to a dojo exam problem, from the finished session to a verdict.
 *
 * @description
 * A run is either recorded or practice, decided by {@link examRunMode}:
 *
 * - **Recorded** — the answer itself (the recreated FEN, or the player's
 *   moves in SAN) goes to `POST /dojo/exams/<exam>/<problem>`. The server
 *   grades it and, on a pass, writes the problem's `exam:` step and grants
 *   the rank once every problem is passed. The app never reports a pass: a
 *   pass is evidence for a rank, so taking a client's word for it would let
 *   anyone calling the API directly earn ranks.
 * - **Practice** — the answer is graded on the device with the same
 *   `gradeExamProblem` the server runs, so the verdict reads the same, and
 *   nothing is written anywhere.
 *
 * A pass is recorded only for a signed-in player for whom the exam is the
 * rank right above their highest one, or a rank they already hold (2kyu
 * needs 3kyu held). Everyone else — signed out, or more than one rank below —
 * takes the exam as practice. The app reads the highest rank as covering
 * every rank below it, so recording a 2kyu pass for someone holding only
 * 5kyu would show 4kyu and 3kyu as done too.
 */
import {
  gradeExamProblem,
  isExamEligible,
  type ExamAnswer,
  type ExamProblem,
} from "@blindfold-chess/features/dojo-journey";
import {
  type EarnedRankSlug,
  type ExamProblemKind,
  type RankSlug,
} from "@blindfold-chess/features/dojo-ranks";

import { submitExamProblem } from "./dojo-api";

export type ExamRunMode = "record" | "practice";

/**
 * Whether a run can be recorded. Signed in with the account not loaded yet,
 * the highest rank is unknown, so the answer is sent and the server — which
 * knows the rank — decides; it answers `recorded: false` when it may not
 * record the pass.
 */
export function examRunMode({
  exam,
  signedIn,
  accountLoaded,
  highest,
}: {
  readonly exam: EarnedRankSlug;
  readonly signedIn: boolean;
  readonly accountLoaded: boolean;
  readonly highest: RankSlug | undefined;
}): ExamRunMode {
  if (!signedIn) return "practice";
  if (!accountLoaded) return "record";
  return isExamEligible(exam, highest) ? "record" : "practice";
}

export type ExamRunOutcome =
  /** The server graded the answer; `recorded` says whether it kept the pass. */
  | {
      readonly kind: "graded";
      readonly passed: boolean;
      readonly accuracy: number | null;
      readonly recorded: boolean;
      readonly grantedRanks: readonly string[];
    }
  /** The device graded the answer; nothing was recorded. */
  | {
      readonly kind: "practice";
      readonly passed: boolean;
      readonly accuracy: number | null;
    }
  /** The answer did not reach the server; it can be sent again. */
  | { readonly kind: "sendFailed" };

/**
 * Grades `answer` as `mode` says: recorded runs on the server, practice runs
 * on the device. A recorded run that cannot reach the server is
 * `sendFailed`, never graded on the device instead — a device verdict would
 * look like a pass the server never saw.
 */
export async function runExamProblem({
  exam,
  kind,
  problem,
  answer,
  mode,
}: {
  readonly exam: EarnedRankSlug;
  readonly kind: ExamProblemKind;
  readonly problem: ExamProblem;
  readonly answer: ExamAnswer;
  readonly mode: ExamRunMode;
}): Promise<ExamRunOutcome> {
  if (mode === "practice") {
    const { passed, accuracy } = gradeExamProblem(problem, answer);
    return { kind: "practice", passed, accuracy };
  }
  const result = await submitExamProblem(exam, kind, answer);
  if ("error" in result) return { kind: "sendFailed" };
  return {
    kind: "graded",
    passed: result.passed,
    accuracy: result.accuracy,
    recorded: result.recorded,
    grantedRanks: result.grantedRanks,
  };
}

/** The `dojo.exam.*` message a graded outcome shows. */
export type ExamVerdict =
  "problemPassed" | "problemFailed" | "passedUnrecorded";

export function examVerdict(
  outcome: Exclude<ExamRunOutcome, { kind: "sendFailed" }>,
): ExamVerdict {
  if (!outcome.passed) return "problemFailed";
  return outcome.kind === "graded" && outcome.recorded
    ? "problemPassed"
    : "passedUnrecorded";
}
