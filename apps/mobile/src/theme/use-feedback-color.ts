import { useTheme } from "./ThemeProvider";

/**
 * The colour a per-question verdict is drawn in: green when the answer was
 * right, red when it was wrong, and the muted foreground while no answer has
 * been given yet.
 *
 * The three-way shape is the point. `isCorrect` is `boolean | null`, and the
 * null arm is not "neither of the above" — it is the un-answered state, which
 * has to render as ordinary text rather than as a verdict. Three question
 * components each wrote the ternary out, so a fourth was free to reach for a
 * two-way `correct ? green : red` and colour an unanswered question red.
 */
export function useFeedbackColor(isCorrect: boolean | null): string {
  const { colors, feedbackColors } = useTheme();

  if (isCorrect === true) return feedbackColors.success;
  if (isCorrect === false) return feedbackColors.error;
  return colors.mutedForeground;
}
