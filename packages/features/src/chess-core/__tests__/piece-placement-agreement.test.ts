import { describe, expect, it } from "vitest";

import { validateFenFormat } from "../fen-pure";
import { validateFenStructure } from "../validate-fen-structure";

// The two validators disagree on purpose about everything after the board
// (field count, spacing, castling and the clocks). Giving both the same,
// otherwise valid, tail leaves the board as the only thing judged, and there
// they must agree.
const PLACEMENTS = [
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",
  "8/8/8/8/8/8/8/8",
  "8/4R1R1/8/8/8/8/8/8",
  "kkkkkkkk/8/8/8/8/8/8/PPPPPPPP",
  "8/8/8/8/8/8/8/17",
  "8/8/8/8/8/8/8/44",
  "8/8/8/8/8/8/8/K16",
  "8/8/8/8/8/8/8/2222",
  "8/8/8/8/8/8/8/7",
  "8/8/8/8/8/8/8/9",
  "8/8/8/8/8/8/8/K7",
  "8/8/8/8/8/8/8/X7",
  "8/8/8/8/8/8/8/K7X",
  "8/8/8/8/8/8/8/0K7",
  "8/8//8/8/8/8/8",
  "8/8/8/8/8/8/8",
  "8/8/8/8/8/8/8/8/8",
  "",
];

describe("validateFenFormat and validateFenStructure on the piece placement", () => {
  it.each(PLACEMENTS)("agree on %j", (placement) => {
    const format = validateFenFormat(`${placement} w`);
    const structure = validateFenStructure(`${placement} w - - 0 1`).ok;
    expect(format).toBe(structure);
  });
});
