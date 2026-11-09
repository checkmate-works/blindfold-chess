import type { Locale } from "@blindfold-chess/types";

import type {
  AlgebraicNotationOptionState,
  AlgebraicNotationQuestion,
} from "./types";

export function isCorrectAnswer(
  question: AlgebraicNotationQuestion,
  option: string,
): boolean {
  return option === question.correctAnswer;
}

/** The question prompt in `locale`, or English when it has no translation. */
export function getQuestionDescription(
  question: AlgebraicNotationQuestion,
  locale: Locale,
): string {
  return question.description[locale] ?? question.description.en ?? "";
}

/** The explanation bullets in `locale`, or English when it has none. */
export function getQuestionExplanation(
  question: AlgebraicNotationQuestion,
  locale: Locale,
): string[] {
  return question.explanation[locale] ?? question.explanation.en ?? [];
}

/**
 * Classifies `option` for rendering. `selectedAnswer` is only meaningful once
 * `answered` is true; before that every option is `idle`.
 */
export function getOptionState(
  question: AlgebraicNotationQuestion,
  option: string,
  selectedAnswer: string,
  answered: boolean,
): AlgebraicNotationOptionState {
  if (!answered) return "idle";
  const correct = isCorrectAnswer(question, option);
  if (option === selectedAnswer) {
    return correct ? "selectedCorrect" : "selectedIncorrect";
  }
  return correct ? "revealedCorrect" : "dimmed";
}

/** Whole-number percentage of correct answers; 0 for an empty session. */
export function getScorePercentage(score: number, total: number): number {
  return total > 0 ? Math.round((score / total) * 100) : 0;
}
