import { describe, expect, it } from "vitest";

import { rankForPracticeMenuType } from "./practice-ranks";

describe("rankForPracticeMenuType", () => {
  it("puts the two introductory practices in mukyu", () => {
    expect(rankForPracticeMenuType("algebraic_notation")).toBe("mukyu");
    expect(rankForPracticeMenuType("quadrant_anchors")).toBe("mukyu");
  });

  it("puts a practice in the lowest rank whose requirements name it", () => {
    expect(rankForPracticeMenuType("square_colors")).toBe("5kyu");
    expect(rankForPracticeMenuType("coordinate_quiz")).toBe("5kyu");
    expect(rankForPracticeMenuType("route_planner")).toBe("3kyu");
  });

  it("counts a practice named by several requirements of one rank once, in that rank", () => {
    expect(rankForPracticeMenuType("legal_moves")).toBe("4kyu");
  });

  it("puts position memory and puzzle in 2kyu through the 2kyu exam problems", () => {
    expect(rankForPracticeMenuType("position_memory")).toBe("2kyu");
    expect(rankForPracticeMenuType("puzzle")).toBe("2kyu");
  });

  it("returns undefined for a practice no requirement names", () => {
    expect(rankForPracticeMenuType("no_such_practice")).toBeUndefined();
  });
});
