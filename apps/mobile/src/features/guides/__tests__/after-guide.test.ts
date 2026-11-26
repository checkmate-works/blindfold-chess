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

import { practiceListHref } from "../../dojo/stage-target";
import { afterGuide, learnStageRankOf } from "../after-guide";
import { guidePageHref } from "../reading-progress";

const PAGE_COUNTS: Partial<Record<RankSlug, number>> = {
  mukyu: 3,
  "5kyu": 2,
  "4kyu": 4,
};

function pages(rank: RankSlug, ...numbers: number[]): string[] {
  return numbers.map((page) => guideStepKey(rank, page));
}

/** `journeyOf` as `useDojoJourney` gives it, from one input. */
function journeyOf(input: Partial<JourneyInput> = {}) {
  return (rank: EarnedRankSlug) =>
    buildRankJourney(rank, {
      highest: undefined,
      completedSteps: new Set(),
      attemptedChallenges: new Set(),
      bestScores: [],
      guidePageCounts: PAGE_COUNTS,
      ...input,
    });
}

describe("learnStageRankOf", () => {
  it("puts the unranked guide in 5kyu's learn stage", () => {
    expect(learnStageRankOf("mukyu")).toBe("5kyu");
  });

  it("puts a ranked guide in its own rank's learn stage", () => {
    expect(learnStageRankOf("5kyu")).toBe("5kyu");
    expect(learnStageRankOf("4kyu")).toBe("4kyu");
  });

  it("finds no stage for 1dan, which has no guide", () => {
    expect(learnStageRankOf("1dan")).toBeUndefined();
  });
});

describe("afterGuide", () => {
  it("leads from the unranked guide to 5kyu's guide while it is unread", () => {
    expect(afterGuide("mukyu", journeyOf())).toEqual({
      kind: "guide",
      rank: "5kyu",
      href: guidePageHref("5kyu", 1),
    });
  });

  it("opens the next guide at its first unread page", () => {
    const next = afterGuide(
      "mukyu",
      journeyOf({ completedSteps: new Set(pages("5kyu", 1)) }),
    );
    expect(next).toEqual({
      kind: "guide",
      rank: "5kyu",
      href: guidePageHref("5kyu", 2),
    });
  });

  it("leads to the rank's practice once the next guide is read", () => {
    const next = afterGuide(
      "mukyu",
      journeyOf({ completedSteps: new Set(pages("5kyu", 1, 2)) }),
    );
    expect(next).toEqual({ kind: "practice", href: practiceListHref("5kyu") });
  });

  it("treats the finished guide as read even before its pages are recorded", () => {
    // 5kyu's own guide has no page marked yet; the unranked guide is read.
    const next = afterGuide(
      "5kyu",
      journeyOf({ completedSteps: new Set(pages("mukyu", 1, 2, 3)) }),
    );
    expect(next).toEqual({ kind: "practice", href: practiceListHref("5kyu") });
  });

  it("goes back to an earlier guide of the stage that was skipped", () => {
    const next = afterGuide(
      "5kyu",
      journeyOf({ completedSteps: new Set(pages("mukyu", 1)) }),
    );
    expect(next).toEqual({
      kind: "guide",
      rank: "mukyu",
      href: guidePageHref("mukyu", 2),
    });
  });

  it("leads a one-guide stage straight to its practice", () => {
    expect(afterGuide("4kyu", journeyOf())).toEqual({
      kind: "practice",
      href: practiceListHref("4kyu"),
    });
  });

  it("leads a held rank's guide to its practice", () => {
    expect(afterGuide("mukyu", journeyOf({ highest: "5kyu" }))).toEqual({
      kind: "practice",
      href: practiceListHref("5kyu"),
    });
  });

  it("skips a guide of the stage that has no pages", () => {
    const next = afterGuide(
      "mukyu",
      journeyOf({ guidePageCounts: { mukyu: 3 } }),
    );
    expect(next).toEqual({ kind: "practice", href: practiceListHref("5kyu") });
  });

  it("leads a guide outside every learn stage to the whole practice tab", () => {
    expect(afterGuide("1dan", journeyOf())).toEqual({
      kind: "practice",
      href: "/practice",
    });
  });
});
