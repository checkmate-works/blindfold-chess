import { describe, expect, it } from "vitest";

import { EARNED_RANK_SLUGS } from "../dojo-ranks/ranks";
import {
  type JourneyInput,
  LEARN_GUIDES,
  buildRankJourney,
  currentStage,
  firstUndoneStep,
} from "./journey";
import { challengeKey, examStepKey, guideStepKey } from "./steps";

/** The page counts of the guides as the apps ship them. */
const GUIDE_PAGE_COUNTS = {
  mukyu: 3,
  "5kyu": 2,
  "4kyu": 4,
  "3kyu": 8,
  "2kyu": 4,
  "1kyu": 3,
} as const;

function input(overrides: Partial<JourneyInput> = {}): JourneyInput {
  return {
    highest: undefined,
    completedSteps: new Set(),
    attemptedChallenges: new Set(),
    bestScores: [],
    guidePageCounts: GUIDE_PAGE_COUNTS,
    ...overrides,
  };
}

function stagesOf(journey: ReturnType<typeof buildRankJourney>) {
  return Object.fromEntries(
    journey.stages.map(({ stage, done, total }) => [stage, `${done}/${total}`]),
  );
}

describe("buildRankJourney", () => {
  it("marks every step of a held rank done, whatever the input says", () => {
    for (const rank of EARNED_RANK_SLUGS) {
      const journey = buildRankJourney(rank, input({ highest: "1dan" }));
      expect(journey.standing).toBe("achieved");
      expect(journey.steps.length).toBeGreaterThan(0);
      expect(journey.steps.every((step) => step.done)).toBe(true);
    }
  });

  it("marks a rank below the highest held as done too", () => {
    const journey = buildRankJourney("5kyu", input({ highest: "3kyu" }));
    expect(journey.steps.every((step) => step.done)).toBe(true);
  });

  it("gives 5kyu a learn stage of five pages, the unranked guide then its own", () => {
    const journey = buildRankJourney("5kyu", input());
    const pages = journey.steps.flatMap((step) =>
      step.kind === "guidePage" ? [`${step.guideRank}:${step.page}`] : [],
    );
    expect(pages).toEqual([
      "mukyu:1",
      "mukyu:2",
      "mukyu:3",
      "5kyu:1",
      "5kyu:2",
    ]);
    expect(stagesOf(journey).learn).toBe("0/5");
  });

  it("counts a guide page done once its step key is completed", () => {
    const journey = buildRankJourney(
      "5kyu",
      input({
        completedSteps: new Set([
          guideStepKey("mukyu", 1),
          guideStepKey("5kyu", 2),
        ]),
      }),
    );
    expect(stagesOf(journey).learn).toBe("2/5");
  });

  it("does not count step keys that name no step of the rank", () => {
    const journey = buildRankJourney(
      "5kyu",
      input({
        completedSteps: new Set([
          guideStepKey("4kyu", 1),
          guideStepKey("5kyu", 3),
          "guide:5kyu:01",
          "exam:5kyu:puzzle",
          "something-else",
        ]),
      }),
    );
    expect(stagesOf(journey)).toEqual({
      learn: "0/5",
      practice: "0/2",
      exam: "0/2",
    });
  });

  it("follows the guide's current page count, so a page added later is one more step", () => {
    const journey = buildRankJourney(
      "2kyu",
      input({ guidePageCounts: { ...GUIDE_PAGE_COUNTS, "2kyu": 5 } }),
    );
    expect(stagesOf(journey).learn).toBe("0/5");
  });

  it("gives 2kyu no practice stage and an exam of its two problems", () => {
    const journey = buildRankJourney("2kyu", input());
    expect(journey.stages.map((s) => s.stage)).toEqual(["learn", "exam"]);
    expect(
      journey.steps
        .filter((step) => step.stage === "exam")
        .map((step) =>
          step.kind === "requirement" ? step.requirement : undefined,
        ),
    ).toEqual([
      { type: "exam_problem", exam: "2kyu", problem: "position_memory" },
      { type: "exam_problem", exam: "2kyu", problem: "puzzle" },
    ]);
  });

  it("counts a 2kyu exam problem done once its exam step key is completed", () => {
    expect(stagesOf(buildRankJourney("2kyu", input())).exam).toBe("0/2");
    const onePassed = buildRankJourney(
      "2kyu",
      input({ completedSteps: new Set([examStepKey("2kyu", "puzzle")]) }),
    );
    expect(stagesOf(onePassed).exam).toBe("1/2");
    const bothPassed = buildRankJourney(
      "2kyu",
      input({
        completedSteps: new Set([
          examStepKey("2kyu", "puzzle"),
          examStepKey("2kyu", "position_memory"),
        ]),
      }),
    );
    expect(stagesOf(bothPassed).exam).toBe("2/2");
  });

  it("gives 1dan neither a learn nor a practice stage", () => {
    const journey = buildRankJourney("1dan", input());
    expect(LEARN_GUIDES["1dan"]).toEqual([]);
    expect(journey.stages).toEqual([{ stage: "exam", done: 0, total: 1 }]);
  });

  it("never counts a published game as met while the rank is not held", () => {
    const journey = buildRankJourney("1kyu", input({ highest: "2kyu" }));
    expect(journey.standing).toBe("next");
    expect(stagesOf(journey).exam).toBe("0/1");
  });

  it("counts a challenge as practised once the device marked it attempted", () => {
    const journey = buildRankJourney(
      "4kyu",
      input({
        attemptedChallenges: new Set([challengeKey("legal_moves", "king")]),
      }),
    );
    expect(stagesOf(journey).practice).toBe("1/3");
    expect(stagesOf(journey).exam).toBe("0/3");
  });

  it("counts a challenge as practised once the server has any best score for it", () => {
    const journey = buildRankJourney(
      "4kyu",
      input({
        bestScores: [
          { menuType: "legal_moves", leaderboardKey: "knight", score: 0 },
          { menuType: "legal_moves", leaderboardKey: "queen", score: 30 },
        ],
      }),
    );
    expect(stagesOf(journey).practice).toBe("1/3");
  });

  it("passes a challenge requirement once the best score reaches its bar", () => {
    const below = buildRankJourney(
      "5kyu",
      input({
        bestScores: [
          { menuType: "square_colors", leaderboardKey: "default", score: 14 },
        ],
      }),
    );
    expect(stagesOf(below).exam).toBe("0/2");
    const atBar = buildRankJourney(
      "5kyu",
      input({
        bestScores: [
          { menuType: "square_colors", leaderboardKey: "default", score: 15 },
        ],
      }),
    );
    expect(stagesOf(atBar).exam).toBe("1/2");
  });

  it("treats a guide without a page count as having no pages", () => {
    const journey = buildRankJourney("3kyu", input({ guidePageCounts: {} }));
    expect(journey.stages.map((s) => s.stage)).toEqual(["practice", "exam"]);
  });
});

describe("firstUndoneStep", () => {
  it("points at the first unread page before any challenge or exam", () => {
    const journey = buildRankJourney(
      "5kyu",
      input({ completedSteps: new Set([guideStepKey("mukyu", 1)]) }),
    );
    expect(firstUndoneStep(journey)).toMatchObject({
      stage: "learn",
      guideRank: "mukyu",
      page: 2,
    });
    expect(currentStage(journey)).toBe("learn");
  });

  it("points at practice once every page is read, then at the exam", () => {
    const allPages = new Set(
      [1, 2, 3, 4].map((page) => guideStepKey("4kyu", page)),
    );
    const practising = buildRankJourney(
      "4kyu",
      input({ completedSteps: allPages }),
    );
    expect(firstUndoneStep(practising)).toMatchObject({
      stage: "practice",
      leaderboardKey: "king",
    });

    const examining = buildRankJourney(
      "4kyu",
      input({
        completedSteps: allPages,
        attemptedChallenges: new Set(
          ["king", "knight", "bishop"].map((key) =>
            challengeKey("legal_moves", key),
          ),
        ),
      }),
    );
    expect(firstUndoneStep(examining)).toMatchObject({ stage: "exam" });
    expect(currentStage(examining)).toBe("exam");
  });

  it("still points at an unread page when the exam is already passed", () => {
    const journey = buildRankJourney(
      "2kyu",
      input({
        completedSteps: new Set([
          examStepKey("2kyu", "puzzle"),
          examStepKey("2kyu", "position_memory"),
        ]),
      }),
    );
    expect(firstUndoneStep(journey)).toMatchObject({ stage: "learn", page: 1 });
  });

  it("is undefined for a held rank", () => {
    const journey = buildRankJourney("2kyu", input({ highest: "2kyu" }));
    expect(firstUndoneStep(journey)).toBeUndefined();
    expect(currentStage(journey)).toBeUndefined();
  });
});
