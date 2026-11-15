import { describe, expect, test } from "vitest";

import { appliedPliesAt } from "./applied-plies";

describe("appliedPliesAt", () => {
  test("nothing is played at the start", () => {
    expect(appliedPliesAt(-2, 5)).toBe(0);
  });

  test("every move is played at the latest position", () => {
    expect(appliedPliesAt(-1, 5)).toBe(5);
    expect(appliedPliesAt(-1, 0)).toBe(0);
  });

  test("a move index counts that move as played", () => {
    expect(appliedPliesAt(0, 5)).toBe(1);
    expect(appliedPliesAt(3, 5)).toBe(4);
  });
});
