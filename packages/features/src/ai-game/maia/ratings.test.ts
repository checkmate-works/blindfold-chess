import { describe, expect, it } from "vitest";

import {
  DEFAULT_MAIA_RATING,
  MAIA_RATINGS,
  isMaiaRating,
  maiaRatingToElo,
} from "./ratings";

describe("MAIA_RATINGS", () => {
  it("matches the official maiachess.com catalog (600..2600 step 200, 11 values)", () => {
    expect([...MAIA_RATINGS]).toEqual([
      600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600,
    ]);
  });

  it("contains the canonical default", () => {
    expect(MAIA_RATINGS).toContain(DEFAULT_MAIA_RATING);
  });
});

describe("isMaiaRating", () => {
  it.each(MAIA_RATINGS)("accepts catalog value %i", (value) => {
    expect(isMaiaRating(value)).toBe(true);
  });

  it.each([
    599, 601, 700, 1100, 1140, 1500, 1900, 2599, 2601, 0, -200, 100_000,
  ])("rejects off-catalog value %i", (value) => {
    expect(isMaiaRating(value)).toBe(false);
  });
});

describe("maiaRatingToElo", () => {
  it("returns the rating unchanged (acts as a type widener)", () => {
    expect(maiaRatingToElo(1600)).toBe(1600);
    expect(maiaRatingToElo(600)).toBe(600);
    expect(maiaRatingToElo(2600)).toBe(2600);
  });
});
