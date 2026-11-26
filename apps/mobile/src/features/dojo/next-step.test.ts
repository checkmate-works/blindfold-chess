import i18next from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import {
  buildRankJourney,
  challengeKey,
  guideStepKey,
  type JourneyInput,
} from "@blindfold-chess/features/dojo-journey";
import type {
  EarnedRankSlug,
  RankSlug,
} from "@blindfold-chess/features/dojo-ranks";

import ja from "../../i18n/resources/ja.json";
import { nextStepOf } from "./next-step";

const PAGE_COUNTS: Partial<Record<RankSlug, number>> = {
  mukyu: 3,
  "5kyu": 2,
  "4kyu": 4,
  "3kyu": 8,
  "2kyu": 4,
  "1kyu": 3,
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

describe("nextStepOf", () => {
  const i18n = i18next.createInstance();
  beforeAll(async () => {
    await i18n.init({ lng: "ja", resources: { ja: { translation: ja } } });
  });

  it("starts a fresh rank with its first guide, from the first page", () => {
    expect(nextStepOf(journey("5kyu"), i18n.t)).toEqual({
      label: "教本を読む",
      icon: "book-outline",
      target: { kind: "practice", pathname: "/dojo/guides/mukyu" },
    });
  });

  it("says to continue the guide once a page of the rank's learn stage is read", () => {
    const step = nextStepOf(
      journey("5kyu", { completedSteps: new Set(pages("mukyu", 3)) }),
      i18n.t,
    );
    expect(step).toEqual({
      label: "教本の続きを読む",
      icon: "book-outline",
      target: { kind: "practice", pathname: "/dojo/guides/5kyu" },
    });
  });

  it("opens the guide at its first unread page", () => {
    const step = nextStepOf(
      journey("5kyu", { completedSteps: new Set(pages("mukyu", 1)) }),
      i18n.t,
    );
    expect(step?.target).toEqual({
      kind: "practice",
      pathname: "/dojo/guides/mukyu?page=2",
    });
  });

  it("points at learning first even when a challenge was already tried", () => {
    const step = nextStepOf(
      journey("5kyu", {
        attemptedChallenges: new Set([
          challengeKey("square_colors", "default"),
          challengeKey("coordinate_quiz", "white"),
        ]),
      }),
      i18n.t,
    );
    expect(step?.target).toEqual({
      kind: "practice",
      pathname: "/dojo/guides/mukyu",
    });
  });

  it("sends a read guide on to trying the rank's first challenge on its setup screen", () => {
    const step = nextStepOf(
      journey("5kyu", {
        completedSteps: new Set([...pages("mukyu", 3), ...pages("5kyu", 2)]),
      }),
      i18n.t,
    );
    expect(step).toEqual({
      label: "マス色チャレンジに挑戦する",
      icon: "stopwatch-outline",
      target: { kind: "practice", pathname: "/practice/square-colors" },
    });
  });

  it("asks for a challenge's bar once every challenge was tried", () => {
    const step = nextStepOf(
      journey("5kyu", {
        completedSteps: new Set([...pages("mukyu", 3), ...pages("5kyu", 2)]),
        attemptedChallenges: new Set([
          challengeKey("square_colors", "default"),
          challengeKey("coordinate_quiz", "white"),
        ]),
      }),
      i18n.t,
    );
    expect(step).toEqual({
      label: "マス色チャレンジでスコア15以上",
      icon: "trophy-outline",
      target: { kind: "practice", pathname: "/practice/square-colors" },
    });
  });

  it("opens the rank's exam for an exam problem, past a rank with no practice stage", () => {
    const step = nextStepOf(
      journey("2kyu", {
        highest: "3kyu",
        completedSteps: new Set(pages("2kyu", 4)),
      }),
      i18n.t,
    );
    expect(step).toEqual({
      label: "2級の課題「ポジション記憶」に合格する",
      icon: "school-outline",
      target: { kind: "practice", pathname: "/dojo/exams/2kyu" },
    });
  });

  it("opens the web for a requirement the app cannot meet", () => {
    const step = nextStepOf(journey("1dan", { highest: "1kyu" }), i18n.t);
    expect(step?.icon).toBe("open-outline");
    expect(step?.target).toEqual({ kind: "web", path: "/games/new/standard" });
  });

  it("has nothing to suggest on a rank already held", () => {
    expect(nextStepOf(journey("5kyu", { highest: "4kyu" }), i18n.t)).toBe(
      undefined,
    );
  });
});
