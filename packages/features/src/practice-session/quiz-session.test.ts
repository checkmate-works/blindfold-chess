import { describe, expect, it } from "vitest";

import { isInputBlocked } from "./quiz-session";

const playing = {
  isFinished: false,
  countdown: null,
  isPaused: false,
  showFeedback: false,
  awaitingServer: false,
};

describe("isInputBlocked", () => {
  it("lets input through while a question awaits an answer", () => {
    expect(isInputBlocked(playing)).toBe(false);
  });

  it.each([
    ["the session has finished", { isFinished: true }],
    ["the countdown is running", { countdown: 2 }],
    ["the countdown shows its last step", { countdown: 0 }],
    ["the session is paused", { isPaused: true }],
    ["the feedback flash is showing", { showFeedback: true }],
    [
      "the next question has not arrived from the server",
      { awaitingServer: true },
    ],
  ])("blocks input while %s", (_label, change) => {
    expect(isInputBlocked({ ...playing, ...change })).toBe(true);
  });
});
