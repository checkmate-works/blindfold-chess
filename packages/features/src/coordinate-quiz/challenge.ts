/**
 * The coordinate quiz as a server-run challenge: settings validation,
 * leaderboard key, question generation and grading in one place.
 *
 * The server generates the whole question list up front and grades every
 * answer with these functions, and the session hook grades with the same
 * `grade`, so what the player sees judged on screen and what the server
 * records cannot drift apart. Pure (no React): it ships in the module's pure
 * barrel so server code can import it.
 */
import type { BoardOrientation, Square } from "@blindfold-chess/types";
import { BOARD_ORIENTATIONS } from "@blindfold-chess/types";

import type { ChallengeModuleDefinition } from "../challenge-attempt/types";
import { type RandomSource, isValidSquare } from "../common/utils";
import { CHALLENGE_TIME_LIMIT } from "../practice-registry/challenge-rules";
import { checkAnswer, generateSingleQuestion } from "./logic";
import type { CoordinateQuestion } from "./types";

/**
 * Settings a coordinate-quiz challenge is started with. The orientation is
 * validated as an enum member by `parseSettings`; nothing else is read.
 */
export type CoordinateQuizChallengeSettings = {
  /** Also the leaderboard key, so it must stay one of `BOARD_ORIENTATIONS`. */
  boardOrientation: BoardOrientation;
};

/**
 * How long the coordinate quiz shows its verdict after an answer, the same
 * after a right and a wrong one, in the challenge and in free play.
 *
 * It used to be the player's choice (300 / 600 / 900 ms). The challenge runs
 * on the server, which stops the clock for `feedbackMs` after receiving an
 * answer, and the next question appears once both the flash has ended and
 * the server's response has arrived. When the round trip is longer than the
 * flash, the difference is taken out of the time limit, so the shortest
 * setting could not absorb network delay and longer settings scored better.
 * The leaderboard is keyed by orientation only, so players on different
 * speeds were also ranked against each other. One fixed value puts everyone
 * on the same conditions.
 *
 * This is not an anti-cheat measure: a modified client can still read the
 * next question during the flash (see the module comment of
 * `challenge-attempt/transitions.ts`); the mean-thinking-time floor is what
 * guards against that.
 */
export const COORDINATE_QUIZ_FEEDBACK_MS = 600;

/**
 * How many of the most recent targets a new question avoids, so the same
 * square does not come up again within a few questions.
 */
export const COORDINATE_RECENT_SQUARE_WINDOW = 8;

/**
 * The recent-target list after `square` was asked: newest first, capped at
 * {@link COORDINATE_RECENT_SQUARE_WINDOW}. Shared by the session hook (one
 * question at a time) and `generateQuestions` (a whole list), so both apply
 * the same no-repeat rule.
 */
export function rememberRecentSquare(
  recent: readonly Square[],
  square: Square,
): Square[] {
  return [square, ...recent].slice(0, COORDINATE_RECENT_SQUARE_WINDOW);
}

/**
 * Mean thinking time per answer below which a run is not recorded.
 *
 * The best production run answered 78 questions in 60 seconds, a mean of
 * about 770 ms. 450 ms lets a human be about 1.7 times faster than that
 * record before the run is refused, while a bot answering with no thinking
 * time stays far below it.
 */
const MIN_MEAN_THINK_MS = 450;

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw);
}

function isOneOf<T extends string>(
  values: readonly T[],
  raw: unknown,
): raw is T {
  return typeof raw === "string" && (values as readonly string[]).includes(raw);
}

export const coordinateQuizChallengeDefinition: ChallengeModuleDefinition<
  CoordinateQuizChallengeSettings,
  CoordinateQuestion,
  Square
> = {
  /**
   * The orientation must be an enum member. Settings arrive from the client
   * and the orientation becomes the leaderboard key, so an unchecked string
   * would let anyone open a leaderboard of their own naming. Other fields are
   * ignored rather than refused: an older client, or settings saved before
   * the feedback speed was removed, still send a `feedbackSpeed`.
   */
  parseSettings: (raw) => {
    if (!isRecord(raw)) return null;
    const { boardOrientation } = raw;
    if (!isOneOf(BOARD_ORIENTATIONS, boardOrientation)) return null;
    return { boardOrientation };
  },

  /** The orientation string, the key existing coordinate-quiz rankings use. */
  leaderboardKey: (settings) => settings.boardOrientation,

  /**
   * `count` questions, each target avoiding the previous
   * {@link COORDINATE_RECENT_SQUARE_WINDOW} targets, with `"random"`
   * orientation resolved per question — the same rule the session hook
   * applies when it generates questions one at a time.
   */
  generateQuestions: (settings, count, rng: RandomSource = Math.random) => {
    const questions: CoordinateQuestion[] = [];
    let recent: Square[] = [];
    for (let i = 0; i < count; i++) {
      const question = generateSingleQuestion(
        settings.boardOrientation,
        recent,
        rng,
      );
      recent = rememberRecentSquare(recent, question.targetSquare);
      questions.push(question);
    }
    return questions;
  },

  /**
   * The tapped square. Any real square is a valid (possibly wrong) answer;
   * only a non-square value is malformed.
   */
  parseAnswer: (raw) =>
    typeof raw === "string" && isValidSquare(raw) ? raw : null,

  grade: (question, answer) => checkAnswer(answer, question.targetSquare),

  /** Fixed, the same for right and wrong answers. */
  feedbackMs: () => COORDINATE_QUIZ_FEEDBACK_MS,

  minMeanThinkMs: MIN_MEAN_THINK_MS,

  /**
   * At the mean-thinking-time floor a run fits at most
   * `60 s / MIN_MEAN_THINK_MS` answers (anything faster is refused anyway);
   * 10 more keep an honest run near the floor from running out of questions.
   */
  maxQuestions:
    Math.ceil((CHALLENGE_TIME_LIMIT * 1000) / MIN_MEAN_THINK_MS) + 10,
};
