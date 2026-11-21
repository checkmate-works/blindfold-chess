import { describe, expect, it } from "vitest";

import { pickSymmetryCoordinate } from "./selection";

const empty = { file: null, rank: null };

describe("pickSymmetryCoordinate", () => {
  it("does not submit when only a file is selected", () => {
    const result = pickSymmetryCoordinate(
      empty,
      { kind: "file", value: "e" },
      false,
    );
    expect(result).toEqual({
      selection: { file: "e", rank: null },
      answer: null,
    });
  });

  it("does not submit when only a rank is selected", () => {
    const result = pickSymmetryCoordinate(
      empty,
      { kind: "rank", value: "4" },
      false,
    );
    expect(result).toEqual({
      selection: { file: null, rank: "4" },
      answer: null,
    });
  });

  it("submits once the tap completes both a file and a rank", () => {
    const result = pickSymmetryCoordinate(
      { file: "e", rank: null },
      { kind: "rank", value: "4" },
      false,
    );
    expect(result.answer).toEqual({ file: "e", rank: "4" });
  });

  it("submits the replaced value when another file is tapped over a full selection", () => {
    const result = pickSymmetryCoordinate(
      { file: "e", rank: "4" },
      { kind: "file", value: "d" },
      false,
    );
    expect(result.answer).toEqual({ file: "d", rank: "4" });
  });

  it("clears the value and does not submit when the selected value is tapped again", () => {
    const result = pickSymmetryCoordinate(
      { file: "e", rank: "4" },
      { kind: "rank", value: "4" },
      false,
    );
    expect(result).toEqual({
      selection: { file: "e", rank: null },
      answer: null,
    });
  });

  it("does not submit while the previous answer's result is showing", () => {
    const result = pickSymmetryCoordinate(
      { file: "e", rank: null },
      { kind: "rank", value: "4" },
      true,
    );
    expect(result.selection).toEqual({ file: "e", rank: "4" });
    expect(result.answer).toBeNull();
  });
});
