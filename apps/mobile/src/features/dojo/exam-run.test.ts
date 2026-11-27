import { beforeEach, describe, expect, it, vi } from "vitest";
import { DOJO_EXAMS } from "@blindfold-chess/features/dojo-journey";

vi.mock("./dojo-api", () => ({ submitExamProblem: vi.fn() }));

import { submitExamProblem } from "./dojo-api";
import {
  examRunMode,
  examVerdict,
  runExamProblem,
  type ExamRunOutcome,
} from "./exam-run";

const submit = vi.mocked(submitExamProblem);
const exam = DOJO_EXAMS["2kyu"]!;
const SOLVING_MOVES = { moves: ["Qg8+", "Nf7#"] };

function verdictOf(outcome: ExamRunOutcome) {
  if (outcome.kind === "sendFailed") throw new Error("the send failed");
  return examVerdict(outcome);
}

beforeEach(() => {
  submit.mockReset();
});

describe("examRunMode", () => {
  const signedIn = { signedIn: true, accountLoaded: true } as const;

  it("records a signed-in player taking the rank right above their highest", () => {
    expect(examRunMode({ exam: "2kyu", ...signedIn, highest: "3kyu" })).toBe(
      "record",
    );
  });

  it("records a signed-in player retaking a rank they hold", () => {
    expect(examRunMode({ exam: "2kyu", ...signedIn, highest: "1kyu" })).toBe(
      "record",
    );
  });

  it("only grades a player more than one rank below, so ranks are never skipped", () => {
    expect(examRunMode({ exam: "2kyu", ...signedIn, highest: "5kyu" })).toBe(
      "practice",
    );
    expect(examRunMode({ exam: "2kyu", ...signedIn, highest: undefined })).toBe(
      "practice",
    );
  });

  it("only grades a signed-out player", () => {
    expect(
      examRunMode({
        exam: "2kyu",
        signedIn: false,
        accountLoaded: false,
        highest: undefined,
      }),
    ).toBe("practice");
  });

  it("lets the server decide while the signed-in account is still loading", () => {
    expect(
      examRunMode({
        exam: "2kyu",
        signedIn: true,
        accountLoaded: false,
        highest: undefined,
      }),
    ).toBe("record");
  });
});

describe("runExamProblem", () => {
  it("sends a recordable run's answer to the server instead of grading it on the device", async () => {
    submit.mockResolvedValue({
      passed: true,
      accuracy: null,
      recorded: true,
      grantedRanks: ["2kyu"],
      highestRank: "2kyu",
    });
    const outcome = await runExamProblem({
      exam: "2kyu",
      kind: "puzzle",
      problem: exam.puzzle,
      answer: SOLVING_MOVES,
      mode: "record",
    });
    expect(submit).toHaveBeenCalledWith("2kyu", "puzzle", SOLVING_MOVES);
    expect(outcome).toEqual({
      kind: "graded",
      passed: true,
      accuracy: null,
      recorded: true,
      grantedRanks: ["2kyu"],
    });
    expect(verdictOf(outcome)).toBe("problemPassed");
  });

  it("grades a run that cannot be recorded on the device and sends nothing", async () => {
    const outcome = await runExamProblem({
      exam: "2kyu",
      kind: "puzzle",
      problem: exam.puzzle,
      answer: SOLVING_MOVES,
      mode: "practice",
    });
    expect(submit).not.toHaveBeenCalled();
    expect(outcome).toEqual({ kind: "practice", passed: true, accuracy: null });
    expect(verdictOf(outcome)).toBe("passedUnrecorded");
  });

  it("fails a wrong answer on the device as the server would", async () => {
    const outcome = await runExamProblem({
      exam: "2kyu",
      kind: "position_memory",
      problem: exam.position_memory,
      answer: { fen: "8/8/8/8/8/8/8/8 w - - 0 1" },
      mode: "practice",
    });
    expect(outcome).toMatchObject({ kind: "practice", passed: false });
    expect(verdictOf(outcome)).toBe("problemFailed");
  });

  it("reports a send that fails rather than falling back to a device verdict", async () => {
    submit.mockResolvedValue({ error: "offline" });
    const outcome = await runExamProblem({
      exam: "2kyu",
      kind: "puzzle",
      problem: exam.puzzle,
      answer: SOLVING_MOVES,
      mode: "record",
    });
    expect(outcome).toEqual({ kind: "sendFailed" });
  });

  it("shows a pass the server did not record as unrecorded", () => {
    expect(
      examVerdict({
        kind: "graded",
        passed: true,
        accuracy: 92,
        recorded: false,
        grantedRanks: [],
      }),
    ).toBe("passedUnrecorded");
  });
});
