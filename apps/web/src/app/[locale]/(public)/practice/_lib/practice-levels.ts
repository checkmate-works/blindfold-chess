/**
 * The difficulty bands the practice list is divided into, easiest first.
 *
 * Their order is load-bearing: `PracticeLevelDots` draws a level as its
 * position in this list (one dot lit for the first, all three for the last),
 * and the filter lists them in this order.
 */
export const PRACTICE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

export type PracticeLevel = (typeof PRACTICE_LEVELS)[number];

export function isPracticeLevel(value: string): value is PracticeLevel {
  return (PRACTICE_LEVELS as readonly string[]).includes(value);
}
