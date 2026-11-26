import { describe, expect, it } from "vitest";
import {
  buildRankJourney,
  guideStepKey,
  type JourneyInput,
} from "@blindfold-chess/features/dojo-journey";
import {
  EARNED_RANK_SLUGS,
  type EarnedRankSlug,
  type RankSlug,
} from "@blindfold-chess/features/dojo-ranks";

import {
  guidePageHref,
  guideReadingProgress,
  guideStartPage,
  readGuidePages,
} from "../reading-progress";

const PAGE_COUNTS: Partial<Record<RankSlug, number>> = {
  mukyu: 3,
  "5kyu": 2,
  "4kyu": 4,
};

/** Every earned rank's journey from one input, as the screens read them. */
function journeys(input: Partial<JourneyInput> = {}) {
  return EARNED_RANK_SLUGS.map((rank) =>
    buildRankJourney(rank as EarnedRankSlug, {
      highest: undefined,
      completedSteps: new Set(),
      attemptedChallenges: new Set(),
      bestScores: [],
      guidePageCounts: PAGE_COUNTS,
      ...input,
    }),
  );
}

describe("readGuidePages", () => {
  it("finds the unranked guide's pages, which 5kyu's journey owns", () => {
    const read = readGuidePages(
      journeys({
        completedSteps: new Set([
          guideStepKey("mukyu", 1),
          guideStepKey("mukyu", 3),
        ]),
      }),
      "mukyu",
    );
    expect([...read].sort()).toEqual([1, 3]);
  });

  it("counts every page of a held rank's guides as read", () => {
    expect([...readGuidePages(journeys({ highest: "4kyu" }), "4kyu")]).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it("keeps one guide's pages apart from another's", () => {
    const read = readGuidePages(
      journeys({ completedSteps: new Set([guideStepKey("5kyu", 1)]) }),
      "mukyu",
    );
    expect(read.size).toBe(0);
  });
});

describe("guideReadingProgress", () => {
  it("starts an unread guide at its first page", () => {
    expect(guideReadingProgress(journeys(), "4kyu", 4)).toEqual({
      read: 0,
      total: 4,
      firstUnreadPage: 1,
    });
  });

  it("points at the first gap, not the page after the last one read", () => {
    const completedSteps = new Set([
      guideStepKey("4kyu", 1),
      guideStepKey("4kyu", 3),
    ]);
    expect(
      guideReadingProgress(journeys({ completedSteps }), "4kyu", 4),
    ).toEqual({ read: 2, total: 4, firstUnreadPage: 2 });
  });

  it("has no unread page once every page is read", () => {
    const completedSteps = new Set([
      guideStepKey("5kyu", 1),
      guideStepKey("5kyu", 2),
    ]);
    expect(
      guideReadingProgress(journeys({ completedSteps }), "5kyu", 2),
    ).toEqual({ read: 2, total: 2 });
  });

  it("ignores read pages past the guide's length", () => {
    expect(
      guideReadingProgress(journeys({ highest: "4kyu" }), "4kyu", 3),
    ).toEqual({ read: 3, total: 3 });
  });
});

describe("guidePageHref", () => {
  it("names the page only past the first", () => {
    expect(guidePageHref("3kyu", 1)).toBe("/dojo/guides/3kyu");
    expect(guidePageHref("3kyu", 4)).toBe("/dojo/guides/3kyu?page=4");
  });
});

describe("guideStartPage", () => {
  it("opens the page the param names", () => {
    expect(guideStartPage("1", 5)).toBe(1);
    expect(guideStartPage("5", 5)).toBe(5);
  });

  it("opens the first page for anything else", () => {
    for (const param of [undefined, "", "0", "6", "-1", "2.5", "two", " 2"]) {
      expect(guideStartPage(param, 5)).toBe(1);
    }
    expect(guideStartPage(["2", "3"], 5)).toBe(1);
  });
});
