import { describe, expect, it } from "vitest";

import { helpPagesFor } from "../help-pages";
import { MODULE_HELP_PAGES } from "../module-help-pages";

describe("helpPagesFor", () => {
  it("keeps every page when the setup screen does not show how to play", () => {
    expect(helpPagesFor("boardSymmetry", false)).toEqual(
      MODULE_HELP_PAGES.boardSymmetry,
    );
  });

  it("drops the how-to-play page the setup screen already shows", () => {
    expect(helpPagesFor("diagonalQuiz", true)).toEqual([
      "step_diagonal",
      "step_antiDiagonal",
    ]);
  });

  it("is empty when how to play was the only page", () => {
    expect(helpPagesFor("coordinateQuiz", true)).toEqual([]);
  });

  it("is empty for a module without help", () => {
    expect(helpPagesFor("noSuchModule", false)).toEqual([]);
  });
});
