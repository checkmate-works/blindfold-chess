import { describe, expect, it } from "vitest";
import {
  buildRankJourney,
  guideStepKey,
  type JourneyInput,
} from "@blindfold-chess/features/dojo-journey";
import type {
  EarnedRankSlug,
  RankSlug,
} from "@blindfold-chess/features/dojo-ranks";

import {
  practiceListHref,
  rankDetailHref,
  requirementsHref,
  stageTarget,
} from "./stage-target";

const PAGE_COUNTS: Partial<Record<RankSlug, number>> = {
  mukyu: 3,
  "5kyu": 2,
  "4kyu": 4,
};

function pages(rank: RankSlug, count: number): string[] {
  return Array.from({ length: count }, (_, i) => guideStepKey(rank, i + 1));
}

function journey(rank: EarnedRankSlug, input: Partial<JourneyInput> = {}) {
  return buildRankJourney(rank, {
    highest: undefined,
    completedSteps: new Set(),
    attemptedChallenges: new Set(),
    bestScores: [],
    guidePageCounts: PAGE_COUNTS,
    ...input,
  });
}

describe("stageTarget", () => {
  describe("learn", () => {
    it("opens the learn tab's list of guides, read or not", () => {
      const expected = "/learn";
      expect(stageTarget("learn", journey("5kyu"))).toEqual(expected);
      expect(
        stageTarget(
          "learn",
          journey("5kyu", { completedSteps: new Set(pages("mukyu", 3)) }),
        ),
      ).toEqual(expected);
      expect(
        stageTarget("learn", journey("5kyu", { highest: "5kyu" })),
      ).toEqual(expected);
    });
  });

  describe("practice", () => {
    it("opens the practice list narrowed to the rank, done or not", () => {
      const expected = { pathname: "/practice", params: { rank: "4kyu" } };
      expect(stageTarget("practice", journey("4kyu"))).toEqual(expected);
      expect(
        stageTarget("practice", journey("4kyu", { highest: "4kyu" })),
      ).toEqual(expected);
    });
  });

  describe("exam", () => {
    it("opens the rank's requirements screen, met or not", () => {
      const expected = "/dojo/requirements/5kyu";
      expect(stageTarget("exam", journey("5kyu"))).toEqual(expected);
      expect(
        stageTarget(
          "exam",
          journey("5kyu", {
            bestScores: [
              {
                menuType: "square_colors",
                leaderboardKey: "default",
                score: 15,
              },
            ],
          }),
        ),
      ).toEqual(expected);
      expect(stageTarget("exam", journey("5kyu", { highest: "5kyu" }))).toEqual(
        expected,
      );
    });

    it("stays in the app for 1dan, whose requirement is met on the web", () => {
      expect(stageTarget("exam", journey("1dan"))).toEqual(
        "/dojo/requirements/1dan",
      );
    });
  });
});

describe("practiceListHref", () => {
  it("names the rank in the practice tab's params", () => {
    expect(practiceListHref("3kyu")).toEqual({
      pathname: "/practice",
      params: { rank: "3kyu" },
    });
  });
});

describe("requirementsHref", () => {
  it("names the rank in the requirements screen's path", () => {
    expect(requirementsHref("3kyu")).toBe("/dojo/requirements/3kyu");
  });
});

describe("rankDetailHref", () => {
  it("names the rank in the rank screen's path", () => {
    expect(rankDetailHref("mukyu")).toBe("/dojo/ranks/mukyu");
  });
});
