import { describe, expect, it } from "vitest";

import { LEVEL_BANDS, getLevelBand, isLevelBandId } from "./level-bands";

describe("LEVEL_BANDS", () => {
  it("tiles the level axis from 0 with no gaps or overlaps", () => {
    expect(LEVEL_BANDS[0].min).toBe(0);
    for (let i = 1; i < LEVEL_BANDS.length; i++) {
      expect(LEVEL_BANDS[i].min).toBe((LEVEL_BANDS[i - 1].max ?? NaN) + 1);
    }
    expect(LEVEL_BANDS[LEVEL_BANDS.length - 1].max).toBeNull();
  });

  it("has distinct ids", () => {
    expect(new Set(LEVEL_BANDS.map((b) => b.id)).size).toBe(LEVEL_BANDS.length);
  });
});

describe("getLevelBand", () => {
  it.each([
    [0, "0"],
    [1, "1-4"],
    [4, "1-4"],
    [5, "5-9"],
    [9, "5-9"],
    [10, "10-19"],
    [19, "10-19"],
    [20, "20-49"],
    [49, "20-49"],
    [50, "50plus"],
    [126, "50plus"],
  ])("level %i → band %s", (level, id) => {
    expect(getLevelBand(level).id).toBe(id);
  });

  it("collapses a negative level into the first band", () => {
    expect(getLevelBand(-3).id).toBe("0");
  });
});

describe("isLevelBandId", () => {
  it("accepts every band id and rejects anything else", () => {
    for (const band of LEVEL_BANDS) expect(isLevelBandId(band.id)).toBe(true);
    expect(isLevelBandId("")).toBe(false);
    expect(isLevelBandId("50+")).toBe(false);
  });
});
