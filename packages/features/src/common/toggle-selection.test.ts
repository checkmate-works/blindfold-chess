import { describe, expect, it } from "vitest";

import { toggleSelection } from "./toggle-selection";

describe("toggleSelection", () => {
  it("adds an item that is not selected", () => {
    expect(toggleSelection(["knight"], "bishop")).toEqual(["knight", "bishop"]);
  });

  it("removes an item that is selected", () => {
    expect(toggleSelection(["knight", "bishop"], "knight")).toEqual(["bishop"]);
  });

  it("refuses to remove the last remaining item and returns the same reference", () => {
    const selected = ["knight"];
    expect(toggleSelection(selected, "knight")).toBe(selected);
  });

  it("respects a custom minSelected floor", () => {
    const selected = ["knight", "bishop"];
    expect(toggleSelection(selected, "bishop", 2)).toBe(selected);
    expect(toggleSelection(selected, "rook", 2)).toEqual([
      "knight",
      "bishop",
      "rook",
    ]);
  });

  it("does not mutate the input array", () => {
    const selected = ["knight", "bishop"];
    toggleSelection(selected, "bishop");
    toggleSelection(selected, "rook");
    expect(selected).toEqual(["knight", "bishop"]);
  });
});
