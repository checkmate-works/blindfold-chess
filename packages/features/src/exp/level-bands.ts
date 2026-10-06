/**
 * Coarse level tiers for reporting on how far players have progressed.
 *
 * Exp only accrues from completed practice challenges, so a player's level
 * is effectively a usage counter. Individual levels are too fine to read as
 * a distribution: the level curve (`requiredExp = 100 * level^1.5`) means a
 * handful of sessions clears Lv1–4, while every further tier takes several
 * times the previous one. The tiers below therefore widen roughly
 * geometrically, so that each one answers a different question — "tried
 * it", "comes back", "regular", "heavy", "power user" — instead of
 * slicing the same long tail into equal-width bins that are almost all
 * empty. The boundaries in Exp terms: Lv5 ≈ 1,100, Lv10 ≈ 3,200,
 * Lv20 ≈ 8,900, Lv50 ≈ 35,000.
 *
 * Lv0 is its own tier: it is a player who has saved at least one result
 * but has not yet earned the 100 Exp that Lv1 requires.
 */
export type LevelBand = {
  /** URL-safe identifier (used as a query-string filter value). */
  id: string;
  /** Lowest level in the tier, inclusive. */
  min: number;
  /** Highest level in the tier, inclusive; `null` means open-ended. */
  max: number | null;
};

export const LEVEL_BANDS: readonly LevelBand[] = [
  { id: "0", min: 0, max: 0 },
  { id: "1-4", min: 1, max: 4 },
  { id: "5-9", min: 5, max: 9 },
  { id: "10-19", min: 10, max: 19 },
  { id: "20-49", min: 20, max: 49 },
  { id: "50plus", min: 50, max: null },
];

/**
 * The tier that contains `level`. Levels below the first tier (negative
 * input) collapse into the first one so the function is total.
 */
export function getLevelBand(level: number): LevelBand {
  const band = LEVEL_BANDS.find(
    (b) => level >= b.min && (b.max === null || level <= b.max),
  );
  return band ?? LEVEL_BANDS[0];
}

/** Whether `id` names one of {@link LEVEL_BANDS}. */
export function isLevelBandId(id: string): boolean {
  return LEVEL_BANDS.some((b) => b.id === id);
}
