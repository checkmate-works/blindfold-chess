/**
 * The square-colours drill as a server-run challenge: settings validation,
 * leaderboard key, question generation and grading in one place.
 *
 * The server generates the whole question list up front and grades every
 * answer with these functions, and the session hook grades with the same
 * `grade`, so what the player sees judged on screen and what the server
 * records cannot drift apart. Pure (no React): it ships in the module's pure
 * barrel so server code can import it.
 */
import type { Square } from "@blindfold-chess/types";

import type { ChallengeModuleDefinition } from "../challenge-attempt/types";
import { type RandomSource, generateSquareSequence } from "../common/utils";
import { CHALLENGE_TIME_LIMIT } from "../practice-registry/challenge-rules";
import { getSquareColor } from "./logic";
import type { SquareColor } from "./types";

/**
 * The drill has no variant: every challenge plays the same game and shares
 * one leaderboard.
 */
export type SquareColorsChallengeSettings = Record<string, never>;

const SQUARE_COLORS: readonly SquareColor[] = ["light", "dark"];

/** Feedback flash after every answer, matching `useTimedSession`'s default. */
const FEEDBACK_MS = 500;

/**
 * Mean thinking time per answer below which a run is not recorded.
 *
 * The best production run answered 130 questions in 60 seconds, a mean of
 * about 460 ms. 300 ms lets a human be about 1.5 times faster than that
 * record before the run is refused, while a bot answering with no thinking
 * time stays far below it.
 */
const MIN_MEAN_THINK_MS = 300;

export const squareColorsChallengeDefinition: ChallengeModuleDefinition<
  SquareColorsChallengeSettings,
  Square,
  SquareColor
> = {
  /**
   * Any object is accepted and normalised to `{}`: there is nothing to choose,
   * so no field can steer the questions or the leaderboard key.
   */
  parseSettings: (raw) =>
    typeof raw === "object" && raw !== null && !Array.isArray(raw) ? {} : null,

  /** The single leaderboard existing square-colours rankings use. */
  leaderboardKey: () => "default",

  /** `count` squares by the same rule the session hook draws its batches with. */
  generateQuestions: (_settings, count, rng: RandomSource = Math.random) =>
    generateSquareSequence(count, rng),

  /**
   * The colour the player picked. Either colour is a valid (possibly wrong)
   * answer; anything else is malformed.
   */
  parseAnswer: (raw) =>
    typeof raw === "string" &&
    (SQUARE_COLORS as readonly string[]).includes(raw)
      ? (raw as SquareColor)
      : null,

  grade: (question, answer) => getSquareColor(question) === answer,

  feedbackMs: () => FEEDBACK_MS,

  minMeanThinkMs: MIN_MEAN_THINK_MS,

  /**
   * At the mean-thinking-time floor a run fits at most
   * `60 s / MIN_MEAN_THINK_MS` answers (anything faster is refused anyway);
   * 10 more keep an honest run near the floor from running out of questions.
   */
  maxQuestions:
    Math.ceil((CHALLENGE_TIME_LIMIT * 1000) / MIN_MEAN_THINK_MS) + 10,
};
