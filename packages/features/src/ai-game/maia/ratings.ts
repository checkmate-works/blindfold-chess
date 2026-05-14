/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Maia rating catalog — the discrete set of Elo values exposed to the
 * user when Maia is selected. Mirrors the official maiachess.com
 * "Play Maia" picker (600..2600 in 200-Elo steps).
 *
 * Maia 3 was trained primarily on the 1100..1900 distribution. Ratings
 * below 1100 and above 1900 are extrapolations and the network's
 * predictions degrade outside the trained band, but we still expose
 * them so the user-facing menu matches the upstream UI byte-for-byte.
 *
 * The full continuous `MaiaElo` type (any number) remains the engine's
 * input — `MaiaRating` is just the UI-side subset we let the user pick.
 */

import type { MaiaElo } from "./types";

export const MAIA_RATINGS = [
  600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600,
] as const;

export type MaiaRating = (typeof MAIA_RATINGS)[number];

/**
 * Default Maia rating shown in the dropdown — the middle of the
 * catalog, comfortably inside Maia's trained 1100..1900 band and
 * approximating the median rated player.
 */
export const DEFAULT_MAIA_RATING: MaiaRating = 1600;

/**
 * Narrows an arbitrary number to a {@link MaiaRating} iff it appears in
 * the official catalog. Used when parsing URL params or persisted
 * settings so we never construct a Maia opponent at an off-catalog Elo
 * that the rest of the UI cannot represent.
 */
export function isMaiaRating(value: number): value is MaiaRating {
  return (MAIA_RATINGS as readonly number[]).includes(value);
}

/**
 * Widens a {@link MaiaRating} to {@link MaiaElo} for engine handoff.
 * Currently a no-op, but the indirection lets future changes to either
 * type alias be enforced at the call site.
 */
export function maiaRatingToElo(rating: MaiaRating): MaiaElo {
  return rating;
}
