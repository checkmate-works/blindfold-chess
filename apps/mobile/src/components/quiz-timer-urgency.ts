/** How close a timed quiz is to running out, which picks the timer's colour. */
export type QuizTimerUrgency = "normal" | "warning" | "critical";

/**
 * Classifies the fraction of the time limit still remaining (1 at the start,
 * 0 when time is up): under 20% left is `critical`, under 40% is `warning`,
 * anything else `normal`.
 *
 * Kept free of React Native imports so the thresholds can be unit-tested
 * without rendering `QuizTimer`.
 */
export function getQuizTimerUrgency(
  remainingFraction: number,
): QuizTimerUrgency {
  if (remainingFraction < 0.2) return "critical";
  if (remainingFraction < 0.4) return "warning";
  return "normal";
}
