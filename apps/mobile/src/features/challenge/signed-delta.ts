/**
 * A change against the last run in the app-wide signed-count form the web
 * uses (`+2`, `−7` with a minus sign, `±0`), with its tone for the colour.
 * The web's `formatSignedDelta` / `signedDeltaTone` say the same for whole
 * numbers; this is the whole-number case only, since a score is a count.
 */
export function formatSignedDelta(delta: number): string {
  const rounded = Math.round(delta);
  if (rounded === 0) return "±0";
  return rounded > 0 ? `+${rounded}` : `−${Math.abs(rounded)}`;
}

export type DeltaTone = "up" | "down" | "flat";

export function signedDeltaTone(delta: number): DeltaTone {
  const rounded = Math.round(delta);
  if (rounded === 0) return "flat";
  return rounded > 0 ? "up" : "down";
}
