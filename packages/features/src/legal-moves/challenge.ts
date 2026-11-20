/**
 * The legal-moves drill as a server-run challenge: settings validation,
 * leaderboard key, question generation and grading in one place.
 *
 * The server generates the whole question list up front and grades every
 * answer with these functions, and the session hook grades with the same
 * `grade`, so what the player sees judged on screen and what the server
 * records cannot drift apart. Pure (no React): it ships in the module's pure
 * barrel so server code can import it.
 */
import type { ChallengeModuleDefinition } from "../challenge-attempt/types";
import { DEFAULT_FEEDBACK_MS } from "../common/flash-policy";
import type { RandomSource } from "../common/utils";
import { CHALLENGE_TIME_LIMIT } from "../practice-registry/challenge-rules";
import { generateBalancedMoveQuestions, isLegalMove } from "./logic";
import type { MoveQuestion, PieceType } from "./types";

/**
 * What a legal-moves challenge is played with: one named piece, or `random`
 * for every piece mixed. These strings are also the leaderboard keys.
 */
export const LEGAL_MOVES_PIECE_SELECTIONS = [
  "king",
  "queen",
  "rook",
  "bishop",
  "knight",
  "random",
] as const;

export type LegalMovesPieceSelection =
  (typeof LEGAL_MOVES_PIECE_SELECTIONS)[number];

export type LegalMovesChallengeSettings = {
  selectedPiece: LegalMovesPieceSelection;
};

const PIECES_BY_SELECTION: Record<
  LegalMovesPieceSelection,
  readonly PieceType[]
> = {
  king: ["k"],
  queen: ["q"],
  rook: ["r"],
  bishop: ["b"],
  knight: ["n"],
  // The order only decides which rng draw picks which piece; it matches the
  // order the challenge screen has always passed for `random`.
  random: ["k", "q", "r", "b", "n"],
};

/**
 * The piece types a selection drills: the named piece alone, or all five for
 * `random`. Both the server (question generation) and the challenge screen
 * (local play) resolve the selection through this, so they ask about the same
 * pieces. Returns a fresh array the caller may keep.
 */
export function legalMovesPiecesForSelection(
  selection: LegalMovesPieceSelection,
): PieceType[] {
  return [...PIECES_BY_SELECTION[selection]];
}

/**
 * Mean thinking time per answer below which a run is not recorded.
 *
 * The best production run answered 100 questions in 60 seconds, a mean of
 * about 600 ms. 350 ms lets a human be about 1.7 times faster than that
 * record before the run is refused, while a bot answering with no thinking
 * time stays far below it.
 */
const MIN_MEAN_THINK_MS = 350;

export const legalMovesChallengeDefinition: ChallengeModuleDefinition<
  LegalMovesChallengeSettings,
  MoveQuestion,
  boolean
> = {
  /**
   * `selectedPiece` must be one of {@link LEGAL_MOVES_PIECE_SELECTIONS}.
   * Settings arrive from the client and the selection becomes the
   * leaderboard key, so an unchecked string would let anyone open a
   * leaderboard of their own naming.
   */
  parseSettings: (raw) => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return null;
    }
    const { selectedPiece } = raw as Record<string, unknown>;
    if (
      typeof selectedPiece !== "string" ||
      !(LEGAL_MOVES_PIECE_SELECTIONS as readonly string[]).includes(
        selectedPiece,
      )
    ) {
      return null;
    }
    return { selectedPiece: selectedPiece as LegalMovesPieceSelection };
  },

  /** The selection string, the key existing legal-moves rankings use. */
  leaderboardKey: (settings) => settings.selectedPiece,

  /**
   * `count` questions, half legal and half illegal, by the same generator the
   * session hook fills its buffer with.
   */
  generateQuestions: (settings, count, rng: RandomSource = Math.random) =>
    generateBalancedMoveQuestions(
      count,
      legalMovesPiecesForSelection(settings.selectedPiece),
      rng,
    ),

  /**
   * The player's claim that the move is legal (`true`) or illegal (`false`).
   * Only a non-boolean is malformed.
   */
  parseAnswer: (raw) => (typeof raw === "boolean" ? raw : null),

  grade: (question, answer) =>
    answer === isLegalMove(question.from, question.to, question.piece),

  feedbackMs: () => DEFAULT_FEEDBACK_MS,

  minMeanThinkMs: MIN_MEAN_THINK_MS,

  /**
   * At the mean-thinking-time floor a run fits at most
   * `60 s / MIN_MEAN_THINK_MS` answers (anything faster is refused anyway);
   * 10 more keep an honest run near the floor from running out of questions.
   */
  maxQuestions:
    Math.ceil((CHALLENGE_TIME_LIMIT * 1000) / MIN_MEAN_THINK_MS) + 10,
};
