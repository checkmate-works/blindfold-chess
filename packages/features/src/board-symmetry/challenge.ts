/**
 * Board symmetry as a server-run challenge module.
 *
 * Question generation and grading for a recorded challenge live here, as
 * pure functions, so the server that runs an attempt and the session hook
 * that plays it share one rule for what is asked and what counts as right.
 * Everything a question or answer holds is plain JSON, since both are
 * stored on the attempt row and sent over the wire.
 */
import { FILES, RANKS } from "@blindfold-chess/types";

import type { ChallengeModuleDefinition } from "../challenge-attempt/types";
import { flashFeedbackDuration } from "../common/flash-policy";
import { CHALLENGE_TIME_LIMIT } from "../practice-registry/challenge-rules";
import { checkSymmetryAnswer, generateProblem } from "./logic";
import type { BoardSymmetryProblem } from "./types";

/** Board symmetry has no variants: every run plays the same leaderboard. */
export type BoardSymmetryChallengeSettings = Record<string, never>;

/** The square the player picked, as the file and rank buttons they pressed. */
export type BoardSymmetryChallengeAnswer = { file: string; rank: string };

/**
 * Fastest mean thinking time per answer a recorded run may have.
 *
 * The best production run scored 48 in 60 s, about 1250 ms per answer; 600 ms
 * lets a player be roughly twice as fast as that before a run is refused,
 * while a bot answering with no thinking time stays well below it.
 */
const MIN_MEAN_THINK_MS = 600;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Board symmetry challenge definition.
 *
 * Settings are any object and always reduce to `{}`, keyed `'default'`, which
 * is the key existing board symmetry rankings were recorded under. Questions
 * are drawn with the same `generateProblem` the local session uses. An answer
 * must name a file and a rank the board offers; anything else is a broken
 * request rather than a wrong answer.
 */
export const boardSymmetryChallengeDefinition: ChallengeModuleDefinition<
  BoardSymmetryChallengeSettings,
  BoardSymmetryProblem,
  BoardSymmetryChallengeAnswer
> = {
  parseSettings: (raw) => (isPlainObject(raw) ? {} : null),
  leaderboardKey: () => "default",
  generateQuestions: (_settings, count, rng) =>
    Array.from({ length: Math.max(0, count) }, () => generateProblem(rng)),
  parseAnswer: (raw) => {
    if (!isPlainObject(raw)) return null;
    const { file, rank } = raw;
    if (typeof file !== "string" || typeof rank !== "string") return null;
    if (!(FILES as readonly string[]).includes(file)) return null;
    if (!(RANKS as readonly string[]).includes(rank)) return null;
    return { file, rank };
  },
  grade: (question, answer) =>
    checkSymmetryAnswer(answer.file, answer.rank, question).isCorrect,
  feedbackMs: (_settings, correct) => flashFeedbackDuration(correct),
  minMeanThinkMs: MIN_MEAN_THINK_MS,
  maxQuestions:
    Math.ceil((CHALLENGE_TIME_LIMIT * 1000) / MIN_MEAN_THINK_MS) + 10,
};
