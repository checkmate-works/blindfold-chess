import { describe, expect, it } from "vitest";

import { squareAtPoint } from "./board-geometry";

describe("squareAtPoint", () => {
  const size = 320; // 40 per square

  it("reads White's side with a8 top-left and h1 bottom-right", () => {
    expect(squareAtPoint(1, 1, size, false)).toBe("a8");
    expect(squareAtPoint(319, 319, size, false)).toBe("h1");
    expect(squareAtPoint(4 * 40 + 5, 6 * 40 + 5, size, false)).toBe("e2");
  });

  it("reads Black's side with h1 top-left and a8 bottom-right", () => {
    expect(squareAtPoint(1, 1, size, true)).toBe("h1");
    expect(squareAtPoint(319, 319, size, true)).toBe("a8");
    expect(squareAtPoint(3 * 40 + 5, 1 * 40 + 5, size, true)).toBe("e2");
  });

  it("puts a point on a square's left / top edge in that square", () => {
    expect(squareAtPoint(40, 0, size, false)).toBe("b8");
    expect(squareAtPoint(0, 40, size, false)).toBe("a7");
  });

  it("is null off the board, including on its right and bottom edge", () => {
    expect(squareAtPoint(-1, 10, size, false)).toBeNull();
    expect(squareAtPoint(10, -1, size, false)).toBeNull();
    expect(squareAtPoint(320, 10, size, false)).toBeNull();
    expect(squareAtPoint(10, 320, size, false)).toBeNull();
  });

  it("is null before the board has a size", () => {
    expect(squareAtPoint(0, 0, 0, false)).toBeNull();
  });
});
