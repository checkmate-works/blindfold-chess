/**
 * The bands the practice list is divided into, in the order they are listed.
 *
 * The order is load-bearing: the filter offers them in it, and the grid shows
 * its sections in it.
 *
 * Introduction comes last even though it is where a complete beginner starts.
 * It is not a harder band than Expert — it is not on the difficulty scale at
 * all. The three modules in it (algebraic notation, FEN, quadrant anchors)
 * teach how to read and name what the other bands then ask you to do, so they
 * are reference material rather than a step in the progression, and the list
 * treats them as an appendix. See {@link DIFFICULTY_RUNGS} for how that
 * distinction is drawn.
 *
 * Five bands is more than a phone fits in one row of filter options, in any
 * locale. That is a layout problem and it is solved in the layout — the
 * filter wraps its options onto two rows — rather than by merging bands:
 * collapsing Introduction into Beginner and Expert into Advanced was tried
 * (2026-09) and lost real distinctions to save a line of height.
 */
export const PRACTICE_LEVELS = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
  'introduction',
] as const;

export type PracticeLevel = (typeof PRACTICE_LEVELS)[number];

/**
 * The bands that ARE steps on the difficulty scale, easiest first.
 *
 * `PracticeLevelDots` draws a band as its position here — one dot lit for
 * Beginner, all four for Expert — so a band missing from this list has no
 * position to draw and gets no dots. That is exactly the claim being made
 * about Introduction: it is a kind of practice, not a level of one.
 */
export const DIFFICULTY_RUNGS = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
] as const satisfies readonly PracticeLevel[];

/** A band's step on the difficulty scale, or -1 for one that is not on it. */
export function difficultyRung(level: PracticeLevel): number {
  return (DIFFICULTY_RUNGS as readonly PracticeLevel[]).indexOf(level);
}

export function isPracticeLevel(value: string): value is PracticeLevel {
  return (PRACTICE_LEVELS as readonly string[]).includes(value);
}
