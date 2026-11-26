import i18next from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import {
  buildRankJourney,
  challengeKey,
  type JourneyInput,
} from "@blindfold-chess/features/dojo-journey";
import type { EarnedRankSlug } from "@blindfold-chess/features/dojo-ranks";

import en from "../../i18n/resources/en.json";
import { practiceProgress, practiceProgressLabel } from "./practice-progress";

function journey(rank: EarnedRankSlug, input: Partial<JourneyInput> = {}) {
  return buildRankJourney(rank, {
    highest: undefined,
    completedSteps: new Set(),
    attemptedChallenges: new Set(),
    bestScores: [],
    guidePageCounts: {},
    ...input,
  });
}

describe("practiceProgress", () => {
  it("counts each challenge of the practice on the rank as one step", () => {
    const fourKyu = journey("4kyu", {
      attemptedChallenges: new Set([challengeKey("legal_moves", "king")]),
    });
    expect(practiceProgress(fourKyu, "legal_moves")).toEqual({
      done: 1,
      total: 3,
    });
  });

  it("counts a challenge with a server score as tried, as the rank card does", () => {
    const fiveKyu = journey("5kyu", {
      bestScores: [
        { menuType: "square_colors", leaderboardKey: "default", score: 3 },
      ],
    });
    expect(practiceProgress(fiveKyu, "square_colors")).toEqual({
      done: 1,
      total: 1,
    });
    expect(practiceProgress(fiveKyu, "coordinate_quiz")).toEqual({
      done: 0,
      total: 1,
    });
  });

  it("has nothing for a practice the rank asks no challenge of", () => {
    // 2kyu asks for position memory as an exam problem, not a challenge.
    expect(
      practiceProgress(journey("2kyu"), "position_memory"),
    ).toBeUndefined();
    expect(practiceProgress(journey("5kyu"), "legal_moves")).toBeUndefined();
  });

  it("agrees with the rank's practice stage total", () => {
    const fourKyu = journey("4kyu");
    const stage = fourKyu.stages.find((s) => s.stage === "practice");
    expect(practiceProgress(fourKyu, "legal_moves")?.total).toBe(stage?.total);
  });
});

describe("practiceProgressLabel", () => {
  const i18n = i18next.createInstance();
  beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } } });
  });

  it("shows a check for a single challenge once tried, and nothing before", () => {
    expect(practiceProgressLabel({ done: 1, total: 1 }, i18n.t)).toEqual({
      value: "✓",
      accessibilityLabel: "Tried",
    });
    expect(
      practiceProgressLabel({ done: 0, total: 1 }, i18n.t),
    ).toBeUndefined();
  });

  it("shows n / N for several challenges, even before any is tried", () => {
    expect(practiceProgressLabel({ done: 0, total: 3 }, i18n.t)).toEqual({
      value: "0 / 3",
      accessibilityLabel: "Tried 0 / 3",
    });
  });

  it("shows nothing for a practice without challenges", () => {
    expect(practiceProgressLabel(undefined, i18n.t)).toBeUndefined();
  });
});
