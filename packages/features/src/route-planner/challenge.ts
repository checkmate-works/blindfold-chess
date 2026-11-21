/**
 * Route planner as a server-run challenge module.
 *
 * Question generation and grading for a recorded challenge live here, as
 * pure functions, so the server that runs an attempt and the session hook
 * that plays it share one rule for what is asked and what counts as right.
 * Everything a question or answer holds is plain JSON, since both are
 * stored on the attempt row and sent over the wire.
 */
import type { Square } from "@blindfold-chess/types";

import type { ChallengeModuleDefinition } from "../challenge-attempt/types";
import { flashFeedbackDuration } from "../common/flash-policy";
import { isValidSquare } from "../common/utils";
import { CHALLENGE_TIME_LIMIT } from "../practice-registry/challenge-rules";
import { evaluateAttempt } from "./attempt";
import { generateProblem } from "./generate";
import type { RoutePlannerPieceType, RoutePlannerProblem } from "./types";

/**
 * The pieces a route planner challenge can be played with, by the name the
 * challenge screen puts in its `piece` parameter and the leaderboard is keyed
 * by. Rook and queen exist in free practice only.
 */
export const ROUTE_PLANNER_CHALLENGE_PIECES = {
  knight: "n",
  bishop: "b",
} as const satisfies Record<string, RoutePlannerPieceType>;

export type RoutePlannerChallengePiece =
  keyof typeof ROUTE_PLANNER_CHALLENGE_PIECES;

export type RoutePlannerChallengeSettings = {
  selectedPiece: RoutePlannerChallengePiece;
};

/**
 * One answer: the squares the player entered (the goal square may be left
 * off; grading appends it), or a skip, which is always wrong.
 */
export type RoutePlannerChallengeAnswer =
  { path: Square[] } | { skipped: true };

/**
 * Fastest mean thinking time per answer a recorded run may have.
 *
 * The best production run scored 13 in 60 s, about 4600 ms per answer, and
 * each answer is a multi-square path; 2000 ms lets a player be a little over
 * twice as fast as that before a run is refused, while a bot answering with
 * no thinking time stays well below it.
 */
const MIN_MEAN_THINK_MS = 2000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isChallengePiece(value: unknown): value is RoutePlannerChallengePiece {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(ROUTE_PLANNER_CHALLENGE_PIECES, value)
  );
}

/**
 * Route planner challenge definition.
 *
 * `selectedPiece` must be one of {@link ROUTE_PLANNER_CHALLENGE_PIECES}: the
 * leaderboard key is that name, so accepting any string would let a request
 * open a ranking of its own. The names match the keys existing rankings were
 * recorded under. Each question is drawn with the same `generateProblem` the
 * local session uses, restricted to the one chosen piece.
 *
 * A path parses when it is an array of real squares — the board only lets the
 * player enter squares, so anything else is a broken request — and is graded
 * by `evaluateAttempt`, which normalises and validates it the way the screen
 * does. A skip parses and is graded wrong. An object carrying both a path and
 * a skip flag is ambiguous and does not parse.
 */
export const routePlannerChallengeDefinition: ChallengeModuleDefinition<
  RoutePlannerChallengeSettings,
  RoutePlannerProblem,
  RoutePlannerChallengeAnswer
> = {
  parseSettings: (raw) => {
    if (!isPlainObject(raw)) return null;
    const { selectedPiece } = raw;
    return isChallengePiece(selectedPiece) ? { selectedPiece } : null;
  },
  leaderboardKey: (settings) => settings.selectedPiece,
  generateQuestions: (settings, count, rng) => {
    const pieces = [ROUTE_PLANNER_CHALLENGE_PIECES[settings.selectedPiece]];
    return Array.from({ length: Math.max(0, count) }, () =>
      generateProblem(pieces, rng),
    );
  },
  parseAnswer: (raw) => {
    if (!isPlainObject(raw)) return null;
    if ("skipped" in raw) {
      return raw.skipped === true && !("path" in raw)
        ? { skipped: true }
        : null;
    }
    const { path } = raw;
    if (!Array.isArray(path)) return null;
    const squares: Square[] = [];
    for (const square of path) {
      if (typeof square !== "string" || !isValidSquare(square)) return null;
      squares.push(square);
    }
    return { path: squares };
  },
  grade: (question, answer) => {
    if ("skipped" in answer) return false;
    return evaluateAttempt(
      question.piece,
      question.start,
      answer.path,
      question.end,
    ).success;
  },
  feedbackMs: (_settings, correct) => flashFeedbackDuration(correct),
  minMeanThinkMs: MIN_MEAN_THINK_MS,
  maxQuestions:
    Math.ceil((CHALLENGE_TIME_LIMIT * 1000) / MIN_MEAN_THINK_MS) + 10,
};
