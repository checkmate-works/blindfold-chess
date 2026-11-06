// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AlgebraicNotationQuestion } from "./types";
import { useAlgebraicNotationSession } from "./use-algebraic-notation-session";

const makeQuestion = (id: number, correctAnswer: string) =>
  ({
    id,
    description: { en: "q" },
    fenBefore: "",
    fenAfter: "",
    correctAnswer,
    options: [correctAnswer, "wrong"],
    explanation: { en: [] },
    move: correctAnswer,
  }) satisfies AlgebraicNotationQuestion;

const QUESTIONS = [makeQuestion(1, "e4"), makeQuestion(2, "Kd6")];

describe("useAlgebraicNotationSession", () => {
  it("scores one point per correct pick and reports on the last next()", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useAlgebraicNotationSession({ questions: QUESTIONS, onComplete }),
    );

    act(() => result.current.selectOption("e4"));
    expect(result.current.answered).toBe(true);
    expect(result.current.score).toBe(1);

    act(() => result.current.next());
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.answered).toBe(false);
    expect(result.current.selectedAnswer).toBe("");
    expect(result.current.isLastQuestion).toBe(true);

    act(() => result.current.selectOption("wrong"));
    act(() => result.current.next());

    expect(onComplete).toHaveBeenCalledWith({ score: 1, total: 2 });
  });

  it("ignores a second pick on the same question", () => {
    const { result } = renderHook(() =>
      useAlgebraicNotationSession({
        questions: QUESTIONS,
        onComplete: vi.fn(),
      }),
    );

    act(() => result.current.selectOption("wrong"));
    act(() => result.current.selectOption("e4"));

    expect(result.current.selectedAnswer).toBe("wrong");
    expect(result.current.score).toBe(0);
  });
});
