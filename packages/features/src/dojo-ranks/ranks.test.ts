import { describe, expect, it } from "vitest";

import {
  EARNED_RANK_SLUGS,
  RANK_REQUIREMENTS,
  achievedRankCount,
  isRankSlug,
  isRequirementPlayableOnMobile,
  nextRankSlug,
  rankStanding,
} from "./ranks";

describe("rankStanding", () => {
  it("treats every rank up to the highest held as achieved", () => {
    expect(rankStanding("5kyu", "3kyu")).toBe("achieved");
    expect(rankStanding("3kyu", "3kyu")).toBe("achieved");
    expect(rankStanding("2kyu", "3kyu")).toBe("next");
    expect(rankStanding("1kyu", "3kyu")).toBe("locked");
  });

  it("reads no rank as mukyu, so 5kyu is next", () => {
    expect(rankStanding("mukyu", undefined)).toBe("achieved");
    expect(rankStanding("5kyu", undefined)).toBe("next");
    expect(rankStanding("4kyu", undefined)).toBe("locked");
  });
});

describe("nextRankSlug", () => {
  it("is the rank right above the highest held", () => {
    expect(nextRankSlug(undefined)).toBe("5kyu");
    expect(nextRankSlug("mukyu")).toBe("5kyu");
    expect(nextRankSlug("1kyu")).toBe("1dan");
  });

  it("is undefined once 1dan is held", () => {
    expect(nextRankSlug("1dan")).toBeUndefined();
  });
});

describe("achievedRankCount", () => {
  it("counts earned ranks only", () => {
    expect(achievedRankCount(undefined)).toBe(0);
    expect(achievedRankCount("5kyu")).toBe(1);
    expect(achievedRankCount("1dan")).toBe(EARNED_RANK_SLUGS.length);
  });
});

describe("isRankSlug", () => {
  it("accepts known slugs only", () => {
    expect(isRankSlug("2kyu")).toBe(true);
    expect(isRankSlug("2dan")).toBe(false);
    expect(isRankSlug(null)).toBe(false);
  });
});

describe("RANK_REQUIREMENTS", () => {
  it("gives every earned rank at least one requirement", () => {
    for (const slug of EARNED_RANK_SLUGS) {
      expect(RANK_REQUIREMENTS[slug].length).toBeGreaterThan(0);
    }
  });

  it("makes 5kyu to 3kyu earnable on mobile and the rest web-only", () => {
    const playable = EARNED_RANK_SLUGS.filter((slug) =>
      RANK_REQUIREMENTS[slug].every(isRequirementPlayableOnMobile),
    );
    expect(playable).toEqual(["5kyu", "4kyu", "3kyu"]);
  });
});
