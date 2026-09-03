/**
 * How every score delta in the app is written: `+2`, `−7`, `±0`.
 *
 * Signed counts rather than ▲/▼ glyphs or percentages: a challenge score is
 * a handful of correct answers, so a percentage swings wildly (1 → 3 is
 * +200%, 0 → anything is undefined), and a bare triangle left it unclear
 * whether "▼7" was the amount lost or a value. A signed count reads as "two
 * more than last time" next to the value it compares against. The minus is
 * U+2212 so it matches the plus in width and weight; a hyphen-minus is
 * visibly narrower beside a digit.
 *
 * `fractionDigits` rounds before deciding the sign, so a delta of 0.04 shown
 * to one decimal is `±0`, never `+0.0`.
 */
export function formatSignedDelta(delta: number, fractionDigits = 0): string {
  const factor = 10 ** fractionDigits;
  const rounded = Math.round(delta * factor) / factor;
  if (rounded === 0) return '±0';
  const magnitude = Math.abs(rounded).toFixed(fractionDigits);
  return rounded > 0 ? `+${magnitude}` : `−${magnitude}`;
}

export type DeltaTone = 'up' | 'down' | 'flat';

/** The tone a delta is coloured with; agrees with {@link formatSignedDelta}'s rounding. */
export function signedDeltaTone(delta: number, fractionDigits = 0): DeltaTone {
  const factor = 10 ** fractionDigits;
  const rounded = Math.round(delta * factor) / factor;
  if (rounded === 0) return 'flat';
  return rounded > 0 ? 'up' : 'down';
}

/** Text colour classes per tone, shared so every delta reads the same. */
export const DELTA_TONE_CLASSES: Record<DeltaTone, string> = {
  up: 'text-success',
  down: 'text-destructive',
  flat: 'text-muted-foreground',
};
