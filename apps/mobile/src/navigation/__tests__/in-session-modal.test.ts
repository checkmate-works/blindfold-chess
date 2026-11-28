import { describe, expect, it } from "vitest";

import { isInSessionModal } from "../in-session-modal";

describe("isInSessionModal", () => {
  it("is true for a screen of the session modal", () => {
    expect(
      isInSessionModal(["(session)", "practice", "knight-tour", "result"]),
    ).toBe(true);
  });

  it("is false for root-stack and tab screens", () => {
    expect(isInSessionModal(["practice", "knight-tour"])).toBe(false);
    expect(isInSessionModal(["(tabs)", "(home)"])).toBe(false);
    expect(isInSessionModal([])).toBe(false);
  });
});
