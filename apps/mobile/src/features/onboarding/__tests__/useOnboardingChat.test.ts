import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MENTOR_TYPING_MS,
  useOnboardingChat,
} from "../hooks/useOnboardingChat";

// A stable `t`, as react-i18next's is: the hook's effect depends on it.
const t = (key: string) => key;
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t }) }));

/** Lets the mentor type `lines` lines, one effect-scheduled timer each. */
function advance(lines: number) {
  for (let i = 0; i < lines; i++) {
    act(() => {
      vi.advanceTimersByTime(MENTOR_TYPING_MS);
    });
  }
}

describe("useOnboardingChat", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("plays the opening statements without a tap, then waits on the question", () => {
    const { result } = renderHook(() => useOnboardingChat());
    expect(result.current.isThinking).toBe(true);
    expect(result.current.waitingFor).toBeNull();

    advance(3);

    expect(result.current.messages.map((m) => m.text)).toEqual([
      "onboarding.script.greeting",
      "onboarding.script.introduction",
      "onboarding.script.confidenceCheck",
    ]);
    expect(result.current.isThinking).toBe(false);
    expect(result.current.waitingFor?.type).toBe("question");
  });

  it("echoes the choice and ends on the finish step it leads to", () => {
    const { result } = renderHook(() => useOnboardingChat());
    advance(3);

    act(() => result.current.handleChoice("confident", "I can play blindfold"));
    expect(result.current.messages.at(-1)).toMatchObject({
      text: "I can play blindfold",
      isSystem: false,
    });
    expect(result.current.waitingFor).toBeNull();

    advance(2);

    const finish = result.current.waitingFor;
    expect(finish?.type).toBe("finish");
    expect(finish?.type === "finish" && finish.destination).toBe("ai-game");
    expect(result.current.messages.at(-1)?.text).toBe(
      "onboarding.script.readyAiGame",
    );
  });
});
