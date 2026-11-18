/**
 * Diagonal quiz as a server-run challenge module.
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
import { generateSquareSequence } from "../common/utils";
import { CHALLENGE_TIME_LIMIT } from "../practice-registry/challenge-rules";
import { EXCLUDED_QUIZ_SQUARES, scoreDiagonalAnswer } from "./logic";

/** The diagonal quiz has no variants: every run plays the same leaderboard. */
export type DiagonalQuizChallengeSettings = Record<string, never>;

/** The two diagonals as the player typed them, e.g. `"a1-h8"`. */
export type DiagonalQuizChallengeAnswer = {
  diagonal: string;
  antiDiagonal: string;
};

/**
 * Fastest mean thinking time per answer a recorded run may have.
 *
 * The best production run scored 24 in 60 s, 2500 ms per answer, and each
 * answer is two typed diagonals; 1200 ms lets a player be roughly twice as
 * fast as that before a run is refused, while a bot answering with no
 * thinking time stays well below it.
 */
const MIN_MEAN_THINK_MS = 1200;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Diagonal quiz challenge definition.
 *
 * Settings are any object and always reduce to `{}`, keyed `'default'`, which
 * is the key existing diagonal quiz rankings were recorded under. The squares
 * come from the same `generateSquareSequence` call (minus the single-diagonal
 * corner squares) the local session buffers from. Both answers are free text
 * the player types, so any pair of strings parses — a malformed diagonal is a
 * wrong answer, graded by `scoreDiagonalAnswer` like on screen — and only a
 * non-string field is a broken request.
 */
export const diagonalQuizChallengeDefinition: ChallengeModuleDefinition<
  DiagonalQuizChallengeSettings,
  Square,
  DiagonalQuizChallengeAnswer
> = {
  parseSettings: (raw) => (isPlainObject(raw) ? {} : null),
  leaderboardKey: () => "default",
  generateQuestions: (_settings, count, rng) =>
    generateSquareSequence(count, rng, EXCLUDED_QUIZ_SQUARES),
  parseAnswer: (raw) => {
    if (!isPlainObject(raw)) return null;
    const { diagonal, antiDiagonal } = raw;
    if (typeof diagonal !== "string" || typeof antiDiagonal !== "string") {
      return null;
    }
    return { diagonal, antiDiagonal };
  },
  grade: (question, answer) =>
    scoreDiagonalAnswer(question, answer.diagonal, answer.antiDiagonal)
      .isCorrect,
  feedbackMs: (_settings, correct) => flashFeedbackDuration(correct),
  minMeanThinkMs: MIN_MEAN_THINK_MS,
  maxQuestions:
    Math.ceil((CHALLENGE_TIME_LIMIT * 1000) / MIN_MEAN_THINK_MS) + 10,
};
