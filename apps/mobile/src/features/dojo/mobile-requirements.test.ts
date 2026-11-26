import { describe, expect, it } from "vitest";
import { validateFenFormat } from "@blindfold-chess/features/chess-core/fen";
import { RANK_REQUIREMENTS } from "@blindfold-chess/features/dojo-ranks";

import { DOJO_EXAMS, examFor, isExamPassed } from "./exams";
import {
  effectiveHighestRank,
  isRequirementMet,
  mobileRankRequirements,
} from "./mobile-requirements";
import { requirementTarget } from "./requirements";

const NONE = new Set<never>();

describe("the 2kyu exam", () => {
  const exam = examFor("2kyu")!;

  it("replaces posting with solving in the app only", () => {
    expect(mobileRankRequirements("2kyu")).toEqual([
      { type: "dojo_exam", rank: "2kyu" },
    ]);
    expect(RANK_REQUIREMENTS["2kyu"][0]?.type).toBe(
      "position_submission_count",
    );
    expect(mobileRankRequirements("3kyu")).toBe(RANK_REQUIREMENTS["3kyu"]);
  });

  it("opens the exam screen", () => {
    expect(requirementTarget({ type: "dojo_exam", rank: "2kyu" })).toEqual({
      kind: "practice",
      pathname: "/dojo/exams/2kyu",
    });
  });

  it("has only well-formed positions", () => {
    for (const fen of Object.values(DOJO_EXAMS).flatMap((e) => e!.fens)) {
      expect(validateFenFormat(fen), fen).toBe(true);
    }
  });

  it("passes only with every problem submitted and the accuracy reached", () => {
    const all = exam.fens.length;
    expect(isExamPassed(exam, { solved: all, accuracy: 80 })).toBe(true);
    expect(isExamPassed(exam, { solved: all, accuracy: 79.9 })).toBe(false);
    expect(isExamPassed(exam, { solved: all - 1, accuracy: 100 })).toBe(false);
  });
});

describe("isRequirementMet", () => {
  const knight = RANK_REQUIREMENTS["4kyu"][1]!;

  it("reads a challenge score against that leaderboard's best", () => {
    const facts = (score: number, key = "knight") => ({
      bestScores: [{ menuType: "legal_moves", leaderboardKey: key, score }],
      passedExams: NONE,
    });
    expect(isRequirementMet(knight, facts(20))).toBe(true);
    expect(isRequirementMet(knight, facts(19))).toBe(false);
    expect(isRequirementMet(knight, facts(99, "king"))).toBe(false);
  });

  it("reads an exam from the device's passes", () => {
    const exam = { type: "dojo_exam", rank: "2kyu" } as const;
    expect(
      isRequirementMet(exam, {
        bestScores: [],
        passedExams: new Set(["2kyu"]),
      }),
    ).toBe(true);
    expect(isRequirementMet(exam, { bestScores: [], passedExams: NONE })).toBe(
      false,
    );
  });

  it("cannot tell for what the web judges", () => {
    expect(
      isRequirementMet(RANK_REQUIREMENTS["1kyu"][0]!, {
        bestScores: [],
        passedExams: NONE,
      }),
    ).toBeUndefined();
  });
});

describe("effectiveHighestRank", () => {
  const passed2kyu = new Set(["2kyu"] as const);

  it("raises 3kyu to 2kyu once the 2kyu exam is passed", () => {
    expect(effectiveHighestRank("3kyu", passed2kyu)).toBe("2kyu");
    expect(effectiveHighestRank("3kyu", NONE)).toBe("3kyu");
  });

  it("does not let an exam skip the ranks below it", () => {
    expect(effectiveHighestRank("4kyu", passed2kyu)).toBe("4kyu");
    expect(effectiveHighestRank(undefined, passed2kyu)).toBeUndefined();
  });

  it("keeps a higher rank from the account", () => {
    expect(effectiveHighestRank("1kyu", passed2kyu)).toBe("1kyu");
  });
});
