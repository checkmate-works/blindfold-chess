import { describe, expect, it } from "vitest";

import { executeMove } from "../chess-core/moves";
import {
  getOptionState,
  getQuestionDescription,
  getQuestionExplanation,
  getScorePercentage,
  isCorrectAnswer,
} from "./logic";
import { ALGEBRAIC_NOTATION_QUESTIONS } from "./questions";
import type { AlgebraicNotationQuestion } from "./types";

const question: AlgebraicNotationQuestion = {
  id: 1,
  description: { en: "Pick one", ja: "選択" },
  fenBefore: "",
  fenAfter: "",
  correctAnswer: "e4",
  options: ["Pe4", "e4", "E4"],
  explanation: { en: ["because"] },
  move: "e4",
};

describe("isCorrectAnswer", () => {
  it("matches the correct answer exactly", () => {
    expect(isCorrectAnswer(question, "e4")).toBe(true);
    expect(isCorrectAnswer(question, "E4")).toBe(false);
  });
});

describe("localized text", () => {
  it("uses the requested locale when present", () => {
    expect(getQuestionDescription(question, "ja")).toBe("選択");
  });

  it("falls back to English when the locale is missing", () => {
    expect(getQuestionDescription(question, "pt-BR")).toBe("Pick one");
    expect(getQuestionExplanation(question, "ja")).toEqual(["because"]);
  });
});

describe("getOptionState", () => {
  it("is idle before answering", () => {
    expect(getOptionState(question, "e4", "", false)).toBe("idle");
  });

  it("marks a correct pick", () => {
    expect(getOptionState(question, "e4", "e4", true)).toBe("selectedCorrect");
    expect(getOptionState(question, "E4", "e4", true)).toBe("dimmed");
  });

  it("marks a wrong pick and reveals the right answer", () => {
    expect(getOptionState(question, "E4", "E4", true)).toBe(
      "selectedIncorrect",
    );
    expect(getOptionState(question, "e4", "E4", true)).toBe("revealedCorrect");
    expect(getOptionState(question, "Pe4", "E4", true)).toBe("dimmed");
  });
});

describe("getScorePercentage", () => {
  it("rounds to a whole percentage", () => {
    expect(getScorePercentage(1, 3)).toBe(33);
    expect(getScorePercentage(4, 4)).toBe(100);
  });

  it("is 0 for an empty session", () => {
    expect(getScorePercentage(0, 0)).toBe(0);
  });
});

describe("ALGEBRAIC_NOTATION_QUESTIONS", () => {
  it.each(ALGEBRAIC_NOTATION_QUESTIONS.map((q) => [q.id, q] as const))(
    "question %i is self-consistent",
    (_id, q) => {
      expect(q.options).toContain(q.correctAnswer);
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.description.en).toBeTruthy();
      expect(q.explanation.en?.length).toBeGreaterThan(0);

      // The board animates `move` from `fenBefore`; it must land on the
      // placement `fenAfter` describes, or the diagram contradicts the answer.
      const played = executeMove(q.fenBefore, q.move);
      expect(played).not.toBeNull();
      expect(played?.fen.split(" ")[0]).toBe(q.fenAfter.split(" ")[0]);
    },
  );
});
