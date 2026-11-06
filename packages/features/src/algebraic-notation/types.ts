import type { Locale } from "@blindfold-chess/types";

/**
 * One multiple-choice question: which spelling of SAN matches the move
 * played from `fenBefore`.
 *
 * `description` and `explanation` are `Partial<Record<Locale, _>>` so that a
 * locale can be added to `SUPPORTED_LOCALES` before the question data has
 * strings for it. Read them through `getQuestionDescription` /
 * `getQuestionExplanation`, which fall back to English.
 */
export type AlgebraicNotationQuestion = {
  id: number;
  description: Partial<Record<Locale, string>>;
  fenBefore: string;
  fenAfter: string;
  /** The option that counts as correct; always one of `options`. */
  correctAnswer: string;
  options: string[];
  explanation: Partial<Record<Locale, string[]>>;
  /**
   * The move in plain SAN, used to animate the board. It can differ from
   * `correctAnswer`: the en passant question answers `bxc3 e.p.` while the
   * move itself is `bxc3`.
   */
  move: string;
};

/** What a finished session reports: answers right out of questions asked. */
export type AlgebraicNotationResult = {
  score: number;
  total: number;
};

/**
 * How one answer option should be drawn.
 *
 * - `idle`: nothing answered yet.
 * - `selectedCorrect` / `selectedIncorrect`: the option the player picked.
 * - `revealedCorrect`: the right answer, shown after a wrong pick.
 * - `dimmed`: any other option once the question is answered.
 */
export type AlgebraicNotationOptionState =
  | "idle"
  | "selectedCorrect"
  | "selectedIncorrect"
  | "revealedCorrect"
  | "dimmed";
