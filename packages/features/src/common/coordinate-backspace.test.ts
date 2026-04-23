import { describe, expect, it } from "vitest";

import { applyCoordinateBackspace } from "./coordinate-backspace";

describe("applyCoordinateBackspace", () => {
  it("clears the rank first when both file and rank are set", () => {
    const result = applyCoordinateBackspace({
      selectedFile: "d",
      selectedRank: "4",
    });
    expect(result.next).toEqual({ selectedFile: "d", selectedRank: null });
    expect(result.cleared).toBe(true);
  });

  it("clears only the rank when only the rank is set", () => {
    const result = applyCoordinateBackspace({
      selectedFile: null,
      selectedRank: "4",
    });
    expect(result.next).toEqual({ selectedFile: null, selectedRank: null });
    expect(result.cleared).toBe(true);
  });

  it("clears the file when only the file is set", () => {
    const result = applyCoordinateBackspace({
      selectedFile: "d",
      selectedRank: null,
    });
    expect(result.next).toEqual({ selectedFile: null, selectedRank: null });
    expect(result.cleared).toBe(true);
  });

  it("is a no-op when nothing is selected and reports cleared=false", () => {
    const result = applyCoordinateBackspace({
      selectedFile: null,
      selectedRank: null,
    });
    expect(result.next).toEqual({ selectedFile: null, selectedRank: null });
    expect(result.cleared).toBe(false);
  });

  it("does not mutate the input object", () => {
    const input = { selectedFile: "d", selectedRank: "4" };
    const snapshot = { ...input };
    applyCoordinateBackspace(input);
    expect(input).toEqual(snapshot);
  });
});
