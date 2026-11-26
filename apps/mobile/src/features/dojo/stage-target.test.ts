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

import { practiceListHref, stageTarget } from "./stage-target";

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
    it("opens the guide holding the first unread page", () => {
      expect(stageTarget("learn", journey("5kyu"))).toEqual({
        kind: "screen",
        href: "/dojo/guides/mukyu",
      });
      expect(
        stageTarget(
          "learn",
          journey("5kyu", { completedSteps: new Set(pages("mukyu", 3)) }),
        ),
      ).toEqual({ kind: "screen", href: "/dojo/guides/5kyu" });
    });

    it("opens the rank's first guide once every page is read", () => {
      const read = new Set([...pages("mukyu", 3), ...pages("5kyu", 2)]);
      expect(
        stageTarget("learn", journey("5kyu", { completedSteps: read })),
      ).toEqual({ kind: "screen", href: "/dojo/guides/mukyu" });
    });
  });

  describe("practice", () => {
    it("opens the practice list narrowed to the rank, done or not", () => {
      const expected = {
        kind: "screen",
        href: { pathname: "/practice", params: { rank: "4kyu" } },
      };
      expect(stageTarget("practice", journey("4kyu"))).toEqual(expected);
      expect(
        stageTarget("practice", journey("4kyu", { highest: "4kyu" })),
      ).toEqual(expected);
    });
  });

  describe("exam", () => {
    it("opens the first unmet requirement's screen", () => {
      const fiveKyu = journey("5kyu", {
        bestScores: [
          { menuType: "square_colors", leaderboardKey: "default", score: 15 },
        ],
      });
      // Square colours is met; the coordinate quiz is the one left.
      expect(stageTarget("exam", fiveKyu)).toEqual({
        kind: "screen",
        href: "/practice/coordinate-quiz",
      });
    });

    it("opens the first requirement once every one is met", () => {
      expect(stageTarget("exam", journey("5kyu", { highest: "5kyu" }))).toEqual(
        { kind: "screen", href: "/practice/square-colors" },
      );
    });

    it("opens the rank's exam screen for an exam problem", () => {
      expect(stageTarget("exam", journey("2kyu"))).toEqual({
        kind: "screen",
        href: "/dojo/exams/2kyu",
      });
    });

    it("opens the web for 1dan, whose only requirement is a published game", () => {
      expect(stageTarget("exam", journey("1dan"))).toEqual({
        kind: "web",
        path: "/games/new/standard",
      });
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
