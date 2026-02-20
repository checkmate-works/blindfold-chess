import { describe, expect, it } from "vitest";

import {
  COUNTDOWN_INITIAL_VALUE,
  COUNTDOWN_START_DISPLAY_DURATION,
  COUNTDOWN_STEP_DURATION,
  getNextCountdownValue,
  isCountdownActive,
} from "./countdown";

describe("getNextCountdownValue", () => {
  it("returns null when current is null (countdown finished)", () => {
    expect(getNextCountdownValue(null)).toBeNull();
  });

  it("decrements from 3 to 2 with step duration", () => {
    const result = getNextCountdownValue(3);
    expect(result).toEqual({ nextValue: 2, delayMs: COUNTDOWN_STEP_DURATION });
  });

  it("decrements from 2 to 1 with step duration", () => {
    const result = getNextCountdownValue(2);
    expect(result).toEqual({ nextValue: 1, delayMs: COUNTDOWN_STEP_DURATION });
  });

  it("decrements from 1 to 0 with step duration", () => {
    const result = getNextCountdownValue(1);
    expect(result).toEqual({ nextValue: 0, delayMs: COUNTDOWN_STEP_DURATION });
  });

  it("transitions from 0 to null with start display duration", () => {
    const result = getNextCountdownValue(0);
    expect(result).toEqual({
      nextValue: null,
      delayMs: COUNTDOWN_START_DISPLAY_DURATION,
    });
  });
});

describe("isCountdownActive", () => {
  it("returns true when value is a number", () => {
    expect(isCountdownActive(3)).toBe(true);
    expect(isCountdownActive(0)).toBe(true);
  });

  it("returns false when value is null", () => {
    expect(isCountdownActive(null)).toBe(false);
  });
});

describe("COUNTDOWN_INITIAL_VALUE", () => {
  it("is 3", () => {
    expect(COUNTDOWN_INITIAL_VALUE).toBe(3);
  });
});
