// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ChallengeAnswerResponse,
  RemoteChallengePort,
} from "../challenge-attempt/types";
import { isInputBlocked } from "./quiz-session";
import { useTimedSession } from "./use-timed-session";

// Advance through each countdown tick as separate act() steps so React
// flushes state between ticks (3→2, 2→1, 1→0, 0→null).
function advancePastCountdown() {
  act(() => vi.advanceTimersByTime(1000)); // 3 → 2
  act(() => vi.advanceTimersByTime(1000)); // 2 → 1
  act(() => vi.advanceTimersByTime(1000)); // 1 → 0
  act(() => vi.advanceTimersByTime(500)); //  0 → null
}

describe("useTimedSession", () => {
  const generateQuestion = vi.fn(() => "question");

  beforeEach(() => {
    vi.useFakeTimers();
    generateQuestion.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("without mistakeAllowance (backward compatibility)", () => {
    it("does not finish on incorrect answers when mistakeAllowance is not set", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
        }),
      );

      advancePastCountdown();

      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.handleAnswer(false);
        });
        act(() => {
          vi.advanceTimersByTime(10);
        });
      }

      expect(result.current.isFinished).toBe(false);
      expect(result.current.incorrectCount).toBe(10);
    });

    it("finishes when time limit is reached", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
        }),
      );

      advancePastCountdown();

      expect(result.current.isFinished).toBe(false);

      act(() => {
        vi.advanceTimersByTime(60 * 1000);
      });

      expect(result.current.isFinished).toBe(true);
    });
  });

  describe("with mistakeAllowance=3", () => {
    it("does not finish when incorrect count is below mistakeAllowance", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance: 3,
        }),
      );

      advancePastCountdown();

      act(() => {
        result.current.handleAnswer(false);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      act(() => {
        result.current.handleAnswer(false);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.incorrectCount).toBe(2);
      expect(result.current.isFinished).toBe(false);
    });

    it("finishes when incorrect count reaches mistakeAllowance", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance: 3,
        }),
      );

      advancePastCountdown();

      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.handleAnswer(false);
        });
        act(() => {
          vi.advanceTimersByTime(10);
        });
      }

      expect(result.current.incorrectCount).toBe(3);
      expect(result.current.isFinished).toBe(true);
    });

    it("does not finish with correct answers only", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance: 3,
        }),
      );

      advancePastCountdown();

      for (let i = 0; i < 20; i++) {
        act(() => {
          result.current.handleAnswer(true);
        });
        act(() => {
          vi.advanceTimersByTime(10);
        });
      }

      expect(result.current.correctCount).toBe(20);
      expect(result.current.incorrectCount).toBe(0);
      expect(result.current.isFinished).toBe(false);
    });

    it("correctly counts mixed answers before reaching mistakeAllowance", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance: 3,
        }),
      );

      advancePastCountdown();

      const answers = [true, false, true, false];
      for (const correct of answers) {
        act(() => {
          result.current.handleAnswer(correct);
        });
        act(() => {
          vi.advanceTimersByTime(10);
        });
      }

      expect(result.current.isFinished).toBe(false);
      expect(result.current.incorrectCount).toBe(2);
      expect(result.current.correctCount).toBe(2);

      act(() => {
        result.current.handleAnswer(true);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      act(() => {
        result.current.handleAnswer(false);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.incorrectCount).toBe(3);
      expect(result.current.correctCount).toBe(3);
      expect(result.current.isFinished).toBe(true);
    });

    it("ignores further answers after reaching mistakeAllowance", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance: 3,
        }),
      );

      advancePastCountdown();

      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.handleAnswer(false);
        });
        act(() => {
          vi.advanceTimersByTime(10);
        });
      }

      expect(result.current.isFinished).toBe(true);

      act(() => {
        result.current.handleAnswer(true);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.correctCount).toBe(0);
      expect(result.current.incorrectCount).toBe(3);
    });
  });

  describe("with mistakeAllowance=1 (boundary value)", () => {
    it("finishes immediately on first incorrect answer", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance: 1,
        }),
      );

      advancePastCountdown();

      act(() => {
        result.current.handleAnswer(false);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.incorrectCount).toBe(1);
      expect(result.current.isFinished).toBe(true);
    });

    it("does not finish on correct answer with mistakeAllowance=1", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance: 1,
        }),
      );

      advancePastCountdown();

      act(() => {
        result.current.handleAnswer(true);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.correctCount).toBe(1);
      expect(result.current.incorrectCount).toBe(0);
      expect(result.current.isFinished).toBe(false);
    });
  });

  describe("totalCount tracking", () => {
    it("totalCount equals correctCount + incorrectCount", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
        }),
      );

      advancePastCountdown();

      act(() => {
        result.current.handleAnswer(true);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      act(() => {
        result.current.handleAnswer(false);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      act(() => {
        result.current.handleAnswer(true);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.correctCount).toBe(2);
      expect(result.current.incorrectCount).toBe(1);
      expect(result.current.totalCount).toBe(3);
    });
  });

  describe("handleAnswer guards", () => {
    it("ignores answer when already finished via time limit", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
        }),
      );

      advancePastCountdown();

      act(() => {
        vi.advanceTimersByTime(60 * 1000);
      });

      expect(result.current.isFinished).toBe(true);

      act(() => {
        result.current.handleAnswer(true);
      });

      expect(result.current.correctCount).toBe(0);
      expect(result.current.totalCount).toBe(0);
    });
  });

  describe("finishReason", () => {
    const render = (mistakeAllowance?: number) =>
      renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance,
        }),
      );

    it("is null while the session is running", () => {
      const { result } = render();
      advancePastCountdown();

      expect(result.current.finishReason).toBeNull();
    });

    it("is timeUp when the time limit is reached", () => {
      const { result } = render();
      advancePastCountdown();

      act(() => {
        vi.advanceTimersByTime(60 * 1000);
      });

      expect(result.current.finishReason).toBe("timeUp");
    });

    it("is mistakeLimit when the allowance runs out", () => {
      const { result } = render(1);
      advancePastCountdown();

      act(() => {
        result.current.handleAnswer(false);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.finishReason).toBe("mistakeLimit");
    });

    it("is quit when finishSession is called, and is not overwritten later", () => {
      const { result } = render();
      advancePastCountdown();

      act(() => {
        result.current.finishSession();
      });
      act(() => {
        vi.advanceTimersByTime(60 * 1000);
      });

      expect(result.current.finishReason).toBe("quit");
    });
  });

  describe("questionTimes", () => {
    const answerAfter = (
      result: { current: { handleAnswer: (c: boolean) => void } },
      thinkMs: number,
      correct: boolean,
      feedbackMs: number,
    ) => {
      act(() => vi.advanceTimersByTime(thinkMs));
      act(() => result.current.handleAnswer(correct));
      act(() => vi.advanceTimersByTime(feedbackMs));
    };

    it("records nothing before the first answer", () => {
      const { result } = renderHook(() =>
        useTimedSession({ timeLimit: 60, generateQuestion }),
      );
      expect(result.current.questionTimes).toEqual([]);

      advancePastCountdown();
      expect(result.current.questionTimes).toEqual([]);
    });

    it("records one entry per answer, excluding the countdown and feedback flash", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 500,
        }),
      );
      advancePastCountdown();

      answerAfter(result, 2000, true, 500);
      answerAfter(result, 1000, false, 500);
      answerAfter(result, 3000, true, 500);

      expect(result.current.questionTimes).toEqual([2, 1, 3]);
      expect(result.current.questionTimes).toHaveLength(
        result.current.totalCount,
      );
    });

    it("records the answer that uses up the mistake allowance", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 500,
          mistakeAllowance: 2,
        }),
      );
      advancePastCountdown();

      answerAfter(result, 1000, false, 500);
      answerAfter(result, 1500, false, 500);

      expect(result.current.finishReason).toBe("mistakeLimit");
      expect(result.current.questionTimes).toEqual([1, 1.5]);
    });

    it("gives the question cut off by the time limit no entry", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 10,
          generateQuestion,
          feedbackDuration: 0,
        }),
      );
      advancePastCountdown();

      answerAfter(result, 4000, true, 0);
      act(() => vi.advanceTimersByTime(10 * 1000));

      expect(result.current.finishReason).toBe("timeUp");
      expect(result.current.questionTimes).toEqual([4]);
    });
  });

  describe("onAnswerEffect", () => {
    it("calls onAnswerEffect with correct=true on correct answer", () => {
      const onAnswerEffect = vi.fn();
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          onAnswerEffect,
        }),
      );

      advancePastCountdown();

      act(() => {
        result.current.handleAnswer(true);
      });

      expect(onAnswerEffect).toHaveBeenCalledWith(true);
    });

    it("calls onAnswerEffect with correct=false on incorrect answer", () => {
      const onAnswerEffect = vi.fn();
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          onAnswerEffect,
        }),
      );

      advancePastCountdown();

      act(() => {
        result.current.handleAnswer(false);
      });

      expect(onAnswerEffect).toHaveBeenCalledWith(false);
    });

    it("does not throw when onAnswerEffect is not provided", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
        }),
      );

      advancePastCountdown();

      expect(() => {
        act(() => {
          result.current.handleAnswer(true);
        });
      }).not.toThrow();
    });
  });

  describe("disablePause", () => {
    it("lets togglePause pause a session that does not disable it", () => {
      const { result } = renderHook(() =>
        useTimedSession({ timeLimit: 60, generateQuestion }),
      );
      advancePastCountdown();

      act(() => result.current.togglePause());

      expect(result.current.isPaused).toBe(true);
    });

    it("makes togglePause a no-op, so the clock keeps running", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          disablePause: true,
        }),
      );
      advancePastCountdown();

      act(() => result.current.togglePause());
      act(() => vi.advanceTimersByTime(2000));

      expect(result.current.isPaused).toBe(false);
      expect(result.current.timeElapsed).toBe(2);
    });
  });

  describe("remote mode", () => {
    type PendingCall = {
      sequence: number;
      answer: unknown;
      resolve: (response: ChallengeAnswerResponse<string>) => void;
      reject: (error: unknown) => void;
    };

    // A port whose submitAnswer calls stay pending until the test settles
    // them, so each test chooses whether the response beats the feedback
    // flash, arrives after it, or fails.
    function createPort() {
      const calls: PendingCall[] = [];
      const submitAnswer = vi.fn(
        (sequence: number, answer: unknown) =>
          new Promise<ChallengeAnswerResponse<string>>((resolve, reject) => {
            calls.push({ sequence, answer, resolve, reject });
          }),
      );
      const port: RemoteChallengePort<string> = {
        first: { sequence: 0, question: "q0" },
        submitAnswer,
      };
      return { port, calls, submitAnswer };
    }

    function accepted(
      correct: boolean,
      elapsedMs: number,
      next: { sequence: number; question: string } | null,
    ): ChallengeAnswerResponse<string> {
      return { status: "accepted", correct, elapsedMs, next };
    }

    async function settle(fn: () => void) {
      await act(async () => {
        fn();
      });
    }

    function renderRemote(
      port: RemoteChallengePort<string>,
      extra: {
        mistakeAllowance?: number;
        onAdvance?: () => void;
        feedbackDuration?: number | ((correct: boolean) => number);
      } = {},
    ) {
      return renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 500,
          remote: port,
          ...extra,
        }),
      );
    }

    it("shows the server's first question and never generates one", () => {
      const { port } = createPort();
      const { result } = renderRemote(port);

      expect(result.current.currentQuestion).toBe("q0");
      expect(generateQuestion).not.toHaveBeenCalled();
      expect(result.current.remoteFailed).toBe(false);
      expect(result.current.awaitingServer).toBe(false);
    });

    it.each([120_000, -120_000])(
      "ignores a wall-clock correction of %i ms while playing",
      (correction) => {
        const { port } = createPort();
        const { result } = renderRemote(port);
        advancePastCountdown();
        act(() => vi.advanceTimersByTime(2000));
        act(() => {
          vi.setSystemTime(Date.now() + correction);
          vi.advanceTimersByTime(1000);
        });
        expect(result.current.isFinished).toBe(false);
        expect(result.current.timeElapsed).toBe(3);
        act(() => result.current.handleAnswer(true, "a"));
        expect(result.current.questionTimes).toEqual([3]);
      },
    );

    it("ignores wall-clock corrections while awaiting the response", async () => {
      const { port, calls } = createPort();
      const { result } = renderRemote(port);
      advancePastCountdown();
      act(() => vi.advanceTimersByTime(1000));
      act(() => result.current.handleAnswer(true, "a"));
      act(() => {
        vi.setSystemTime(Date.now() + 120_000);
        vi.advanceTimersByTime(500);
      });
      await settle(() =>
        calls[0]!.resolve(
          accepted(true, 1000, { sequence: 1, question: "q1" }),
        ),
      );
      act(() => vi.advanceTimersByTime(100));
      expect(result.current.isFinished).toBe(false);
      expect(result.current.timeElapsed).toBe(1);
    });

    it("sends the raw answer with the question's sequence and counts it optimistically", () => {
      const { port, submitAnswer } = createPort();
      const { result } = renderRemote(port);
      advancePastCountdown();

      act(() => result.current.handleAnswer(true, "e4"));

      expect(submitAnswer).toHaveBeenCalledWith(0, "e4");
      expect(result.current.correctCount).toBe(1);
      expect(result.current.showFeedback).toBe(true);
    });

    it("advances to the server's next question when the flash ends, if the response came first", async () => {
      const { port, calls, submitAnswer } = createPort();
      const onAdvance = vi.fn();
      const { result } = renderRemote(port, { onAdvance });
      advancePastCountdown();

      act(() => result.current.handleAnswer(true, "a"));
      await settle(() =>
        calls[0]!.resolve(
          accepted(true, 1000, { sequence: 1, question: "q1" }),
        ),
      );

      expect(result.current.currentQuestion).toBe("q0");
      expect(result.current.showFeedback).toBe(true);

      act(() => vi.advanceTimersByTime(500));

      expect(result.current.currentQuestion).toBe("q1");
      expect(result.current.showFeedback).toBe(false);
      expect(result.current.awaitingServer).toBe(false);
      expect(onAdvance).toHaveBeenCalledWith(true);
      expect(generateQuestion).not.toHaveBeenCalled();

      act(() => result.current.handleAnswer(false, "b"));
      expect(submitAnswer).toHaveBeenLastCalledWith(1, "b");
    });

    it("keeps the answer's feedback up with input blocked while a slow response is outstanding, then advances as soon as it arrives", async () => {
      const { port, calls } = createPort();
      const { result } = renderRemote(port);
      advancePastCountdown();

      act(() => result.current.handleAnswer(false, "a"));
      act(() => vi.advanceTimersByTime(500));

      expect(result.current.showFeedback).toBe(true);
      expect(result.current.lastAnswerCorrect).toBe(false);
      expect(result.current.currentQuestion).toBe("q0");
      expect(result.current.awaitingServer).toBe(true);
      expect(result.current.isPlaying).toBe(false);
      expect(isInputBlocked(result.current)).toBe(true);

      act(() => result.current.handleAnswer(true, "again"));
      expect(calls).toHaveLength(1);

      // Still the same answer's feedback much later: the screen does not
      // drop it while the response is outstanding.
      act(() => vi.advanceTimersByTime(300));
      expect(result.current.showFeedback).toBe(true);
      expect(result.current.lastAnswerCorrect).toBe(false);

      await settle(() =>
        calls[0]!.resolve(
          accepted(false, 1000, { sequence: 1, question: "q1" }),
        ),
      );

      expect(result.current.currentQuestion).toBe("q1");
      expect(result.current.showFeedback).toBe(false);
      expect(result.current.lastAnswerCorrect).toBe(null);
      expect(result.current.awaitingServer).toBe(false);
      expect(result.current.isPlaying).toBe(true);
    });

    it("stops the clock only for the feedback flash, runs it while awaiting the server, and re-syncs to elapsedMs", async () => {
      const { port, calls } = createPort();
      const { result } = renderRemote(port);
      advancePastCountdown();

      act(() => vi.advanceTimersByTime(2000));
      expect(result.current.timeElapsed).toBe(2);

      act(() => result.current.handleAnswer(true, "a"));
      act(() => vi.advanceTimersByTime(500));
      // Stopped during the flash.
      expect(result.current.timeElapsed).toBe(2);

      act(() => vi.advanceTimersByTime(3000));
      // Running while the next question is outstanding.
      expect(result.current.timeElapsed).toBe(5);

      // The server counted 1000ms up to the answer; the 3000ms the wait has
      // run past the flash is added on top.
      await settle(() =>
        calls[0]!.resolve(
          accepted(true, 1000, { sequence: 1, question: "q1" }),
        ),
      );
      expect(result.current.timeElapsed).toBe(4);

      act(() => vi.advanceTimersByTime(1000));
      expect(result.current.timeElapsed).toBe(5);
    });

    it("re-syncs to elapsedMs alone when the response arrives within the flash", async () => {
      const { port, calls } = createPort();
      const { result } = renderRemote(port);
      advancePastCountdown();

      act(() => vi.advanceTimersByTime(3000));
      act(() => result.current.handleAnswer(true, "a"));
      await settle(() =>
        calls[0]!.resolve(
          accepted(true, 1500, { sequence: 1, question: "q1" }),
        ),
      );

      expect(result.current.timeElapsed).toBe(1);
    });

    it("restores playable time when server processing outlasted the flash and the local clock", async () => {
      const { port, calls } = createPort();
      const { result } = renderRemote(port);
      advancePastCountdown();
      act(() => vi.advanceTimersByTime(59_000));
      act(() => result.current.handleAnswer(true, "a"));
      act(() => vi.advanceTimersByTime(500));
      act(() => vi.advanceTimersByTime(3000));

      await settle(() =>
        calls[0]!.resolve({
          status: "accepted",
          correct: true,
          elapsedMs: 59_000,
          feedbackExtensionMs: 3000,
          next: { sequence: 1, question: "q1" },
        }),
      );

      expect(result.current.timeElapsed).toBe(59);
      expect(result.current.isFinished).toBe(false);
      expect(result.current.isPlaying).toBe(true);
      act(() => vi.advanceTimersByTime(900));
      expect(result.current.isFinished).toBe(false);
      act(() => vi.advanceTimersByTime(100));
      expect(result.current.finishReason).toBe("timeUp");
    });

    it("re-syncs with the flash length of the server's verdict when it differs from the local one", async () => {
      const { port, calls } = createPort();
      const { result } = renderRemote(port, {
        feedbackDuration: (correct) => (correct ? 500 : 1500),
      });
      advancePastCountdown();

      act(() => vi.advanceTimersByTime(3000));
      act(() => result.current.handleAnswer(true, "a"));
      act(() => vi.advanceTimersByTime(3000));

      // The server judged the answer wrong, so its clock restarted 1500ms
      // after the answer, not 500ms: 3000ms counted before the answer plus
      // the 1500ms since the restart.
      await settle(() =>
        calls[0]!.resolve(
          accepted(false, 3000, { sequence: 1, question: "q1" }),
        ),
      );

      expect(result.current.timeElapsed).toBe(4);
    });

    it("ends with mistakeLimit after the flash when the server sends no next question", async () => {
      const { port, calls } = createPort();
      const { result } = renderRemote(port);
      advancePastCountdown();

      act(() => result.current.handleAnswer(false, "a"));
      await settle(() => calls[0]!.resolve(accepted(false, 1000, null)));

      expect(result.current.isFinished).toBe(false);

      act(() => vi.advanceTimersByTime(500));

      expect(result.current.finishReason).toBe("mistakeLimit");
      expect(result.current.incorrectCount).toBe(1);
    });

    it("ends with mistakeLimit at once when a no-next response arrives after the flash", async () => {
      const { port, calls } = createPort();
      const { result } = renderRemote(port);
      advancePastCountdown();

      act(() => result.current.handleAnswer(false, "a"));
      act(() => vi.advanceTimersByTime(500));
      await settle(() => calls[0]!.resolve(accepted(false, 1000, null)));

      expect(result.current.finishReason).toBe("mistakeLimit");
      expect(result.current.awaitingServer).toBe(false);
    });

    it("keeps going past the local mistake allowance while the server sends a next question", async () => {
      const { port, calls } = createPort();
      const { result } = renderRemote(port, { mistakeAllowance: 1 });
      advancePastCountdown();

      act(() => result.current.handleAnswer(false, "a"));
      await settle(() =>
        calls[0]!.resolve(
          accepted(false, 1000, { sequence: 1, question: "q1" }),
        ),
      );
      act(() => vi.advanceTimersByTime(500));

      expect(result.current.isFinished).toBe(false);
      expect(result.current.currentQuestion).toBe("q1");
    });

    it("corrects the counts when the server's verdict differs from the local one", async () => {
      const { port, calls } = createPort();
      const { result } = renderRemote(port);
      advancePastCountdown();

      act(() => result.current.handleAnswer(true, "a"));
      await settle(() =>
        calls[0]!.resolve(
          accepted(false, 1000, { sequence: 1, question: "q1" }),
        ),
      );

      expect(result.current.correctCount).toBe(0);
      expect(result.current.incorrectCount).toBe(1);
    });

    it("takes the answer back and ends with timeUp at once when the server says expired", async () => {
      const { port, calls } = createPort();
      const { result } = renderRemote(port);
      advancePastCountdown();

      act(() => result.current.handleAnswer(true, "a"));
      await settle(() => calls[0]!.resolve({ status: "expired" }));

      expect(result.current.finishReason).toBe("timeUp");
      expect(result.current.correctCount).toBe(0);
      expect(result.current.questionTimes).toEqual([]);
      expect(result.current.showFeedback).toBe(false);
      expect(result.current.remoteFailed).toBe(false);
    });

    it("takes the answer back, ends, and sets remoteFailed when the server rejects", async () => {
      const { port, calls } = createPort();
      const { result } = renderRemote(port);
      advancePastCountdown();

      act(() => result.current.handleAnswer(false, "a"));
      await settle(() => calls[0]!.resolve({ status: "rejected" }));

      expect(result.current.isFinished).toBe(true);
      expect(result.current.remoteFailed).toBe(true);
      expect(result.current.incorrectCount).toBe(0);
      expect(result.current.totalCount).toBe(0);
    });

    it("resends the same answer after a failure and continues when a retry succeeds", async () => {
      const { port, calls, submitAnswer } = createPort();
      const { result } = renderRemote(port);
      advancePastCountdown();

      act(() => result.current.handleAnswer(true, "a"));
      await settle(() => calls[0]!.reject(new Error("network")));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      await settle(() => calls[1]!.reject(new Error("network")));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      await settle(() =>
        calls[2]!.resolve(
          accepted(true, 1000, { sequence: 1, question: "q1" }),
        ),
      );

      expect(submitAnswer).toHaveBeenCalledTimes(3);
      for (const call of calls) {
        expect([call.sequence, call.answer]).toEqual([0, "a"]);
      }
      expect(result.current.currentQuestion).toBe("q1");
      expect(result.current.remoteFailed).toBe(false);
    });

    it("gives up after three failed submits in a row: takes the answer back and sets remoteFailed", async () => {
      const { port, calls, submitAnswer } = createPort();
      const { result } = renderRemote(port);
      advancePastCountdown();

      act(() => result.current.handleAnswer(true, "a"));
      for (let i = 0; i < 3; i++) {
        await settle(() => calls[i]!.reject(new Error("network")));
        await act(async () => {
          await vi.advanceTimersByTimeAsync(500);
        });
      }

      expect(submitAnswer).toHaveBeenCalledTimes(3);
      expect(result.current.isFinished).toBe(true);
      expect(result.current.remoteFailed).toBe(true);
      expect(result.current.correctCount).toBe(0);
    });

    it("settles an in-flight answer before finishing on the local clock", async () => {
      const { port, calls } = createPort();
      const onAdvance = vi.fn();
      const { result } = renderRemote(port, { onAdvance });
      advancePastCountdown();

      act(() => vi.advanceTimersByTime(59_000));
      act(() => result.current.handleAnswer(true, "a"));
      act(() => vi.advanceTimersByTime(500));
      act(() => vi.advanceTimersByTime(1100));

      expect(result.current.isFinished).toBe(false);
      expect(result.current.awaitingServer).toBe(true);

      await settle(() =>
        calls[0]!.resolve(
          accepted(true, 59_000, { sequence: 1, question: "q1" }),
        ),
      );

      act(() => vi.advanceTimersByTime(100));
      expect(result.current.finishReason).toBe("timeUp");
      expect(result.current.currentQuestion).toBe("q1");
      expect(onAdvance).toHaveBeenCalledOnce();
    });

    it("removes an expired in-flight answer even when the local clock has already reached zero", async () => {
      const { port, calls } = createPort();
      const { result } = renderRemote(port);
      advancePastCountdown();
      act(() => vi.advanceTimersByTime(59_000));
      act(() => result.current.handleAnswer(true, "a"));
      act(() => vi.advanceTimersByTime(500));
      act(() => vi.advanceTimersByTime(1100));

      await settle(() => calls[0]!.resolve({ status: "expired" }));

      expect(result.current.finishReason).toBe("timeUp");
      expect(result.current.correctCount).toBe(0);
      expect(result.current.questionTimes).toEqual([]);
    });

    it("still reports a failed in-flight answer after the local clock reaches zero", async () => {
      const { port, calls } = createPort();
      const { result } = renderRemote(port);
      advancePastCountdown();
      act(() => vi.advanceTimersByTime(59_000));
      act(() => result.current.handleAnswer(true, "a"));
      act(() => vi.advanceTimersByTime(500));
      act(() => vi.advanceTimersByTime(1100));

      await settle(() => calls[0]!.resolve({ status: "rejected" }));

      expect(result.current.remoteFailed).toBe(true);
      expect(result.current.correctCount).toBe(0);
    });

    it("ignores a response that arrives after unmount", async () => {
      const { port, calls } = createPort();
      const onAdvance = vi.fn();
      const { result, unmount } = renderRemote(port, { onAdvance });
      advancePastCountdown();

      act(() => result.current.handleAnswer(true, "a"));
      act(() => vi.advanceTimersByTime(500));
      unmount();

      await settle(() =>
        calls[0]!.resolve(
          accepted(true, 1000, { sequence: 1, question: "q1" }),
        ),
      );

      expect(onAdvance).not.toHaveBeenCalled();
    });

    it("stays false on remoteFailed and awaitingServer in local mode", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 500,
        }),
      );
      advancePastCountdown();

      act(() => result.current.handleAnswer(true, "ignored"));
      act(() => vi.advanceTimersByTime(500));

      expect(result.current.awaitingServer).toBe(false);
      expect(result.current.remoteFailed).toBe(false);
      expect(generateQuestion).toHaveBeenCalledTimes(2);
    });
  });
});
