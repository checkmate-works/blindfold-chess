import { describe, expect, it } from "vitest";

import { getQuizTimerUrgency } from "./quiz-timer-urgency";

describe("getQuizTimerUrgency", () => {
  it("is normal at the start of the session, when all the time remains", () => {
    expect(getQuizTimerUrgency(1)).toBe("normal");
  });

  it("stays normal while at least 40% of the time remains", () => {
    expect(getQuizTimerUrgency(0.4)).toBe("normal");
  });

  it("warns once less than 40% remains", () => {
    expect(getQuizTimerUrgency(0.39)).toBe("warning");
    expect(getQuizTimerUrgency(0.2)).toBe("warning");
  });

  it("is critical once less than 20% remains, through time up", () => {
    expect(getQuizTimerUrgency(0.19)).toBe("critical");
    expect(getQuizTimerUrgency(0)).toBe("critical");
  });
});
