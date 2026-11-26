import { describe, expect, it } from "vitest";

import { EARNED_RANK_SLUGS, RANK_SLUGS } from "../dojo-ranks/ranks";
import {
  MAX_GUIDE_PAGES,
  challengeKey,
  examStepKey,
  guideStepKey,
  isGuideStepKey,
} from "./steps";

/** The CHECK constraint the database puts on a stored step key. */
const DB_STEP_KEY_CHECK = /^[a-z0-9][a-z0-9:_-]{0,63}$/;

describe("guideStepKey", () => {
  it("names a guide page by rank and 1-based page", () => {
    expect(guideStepKey("5kyu", 1)).toBe("guide:5kyu:1");
    expect(guideStepKey("mukyu", 3)).toBe("guide:mukyu:3");
  });
});

describe("examStepKey", () => {
  it("names an exam problem by rank and problem kind", () => {
    expect(examStepKey("2kyu", "puzzle")).toBe("exam:2kyu:puzzle");
    expect(examStepKey("2kyu", "position_memory")).toBe(
      "exam:2kyu:position_memory",
    );
  });
});

describe("step keys and the database CHECK", () => {
  it("fits every exam key, including the underscore in position_memory", () => {
    for (const exam of EARNED_RANK_SLUGS) {
      for (const problem of ["position_memory", "puzzle"] as const) {
        expect(examStepKey(exam, problem)).toMatch(DB_STEP_KEY_CHECK);
      }
    }
  });

  it("fits every guide key up to the page bound", () => {
    for (const rank of RANK_SLUGS) {
      expect(guideStepKey(rank, 1)).toMatch(DB_STEP_KEY_CHECK);
      expect(guideStepKey(rank, MAX_GUIDE_PAGES)).toMatch(DB_STEP_KEY_CHECK);
    }
  });
});

describe("isGuideStepKey (the check a client-reported step goes through)", () => {
  it("accepts a known rank's page within the bound", () => {
    expect(isGuideStepKey("guide:5kyu:1")).toBe(true);
    expect(isGuideStepKey("guide:mukyu:3")).toBe(true);
    expect(isGuideStepKey(guideStepKey("1dan", MAX_GUIDE_PAGES))).toBe(true);
  });

  it("rejects exam keys, so a client cannot report an exam as passed", () => {
    expect(isGuideStepKey("exam:2kyu:puzzle")).toBe(false);
    expect(isGuideStepKey(examStepKey("2kyu", "position_memory"))).toBe(false);
  });

  it("rejects pages outside 1 to the bound and pages with leading zeros", () => {
    expect(isGuideStepKey("guide:5kyu:0")).toBe(false);
    expect(isGuideStepKey(`guide:5kyu:${MAX_GUIDE_PAGES + 1}`)).toBe(false);
    expect(isGuideStepKey("guide:5kyu:-1")).toBe(false);
    expect(isGuideStepKey("guide:5kyu:01")).toBe(false);
    expect(isGuideStepKey("guide:5kyu:1.5")).toBe(false);
  });

  it("rejects unknown ranks and malformed keys", () => {
    expect(isGuideStepKey("guide:2dan:1")).toBe(false);
    expect(isGuideStepKey("guide:5kyu")).toBe(false);
    expect(isGuideStepKey("guide:5kyu:1:extra")).toBe(false);
    expect(isGuideStepKey(" guide:5kyu:1")).toBe(false);
    expect(isGuideStepKey("")).toBe(false);
  });

  it("rejects values that are not strings", () => {
    expect(isGuideStepKey(1)).toBe(false);
    expect(isGuideStepKey(null)).toBe(false);
    expect(isGuideStepKey(undefined)).toBe(false);
    expect(isGuideStepKey({ key: "guide:5kyu:1" })).toBe(false);
  });
});

describe("challengeKey", () => {
  it("joins the module and the leaderboard the way best scores are keyed", () => {
    expect(challengeKey("legal_moves", "king")).toBe("legal_moves:king");
  });
});
