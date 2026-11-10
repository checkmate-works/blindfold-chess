import { describe, expect, it } from "vitest";

import { validateFenFormat } from "../chess-core/fen-pure";
import {
  FEN_PROBLEMS,
  PRESET_POSITIONS,
  getFenPositions,
  getPositionName,
} from "./problems";

describe("FEN problem set", () => {
  it("holds well-formed FENs with unique ids", () => {
    for (const problem of FEN_PROBLEMS) {
      expect(validateFenFormat(problem.fen), problem.id).toBe(true);
    }
    expect(new Set(FEN_PROBLEMS.map((p) => p.id)).size).toBe(
      FEN_PROBLEMS.length,
    );
  });

  it("lists the presets with the English name as title", () => {
    expect(PRESET_POSITIONS[0]).toEqual({
      id: "starting",
      fen: FEN_PROBLEMS[0].fen,
      title: "Starting Position",
    });
  });

  it("derives side to move for each session position", () => {
    const positions = getFenPositions();
    expect(positions.map((p) => p.isBlackToMove)).toEqual(
      FEN_PROBLEMS.map((p) => p.fen.split(" ")[1] === "b"),
    );
  });
});

describe("getPositionName", () => {
  const problem = { name: "Few Pieces", nameJa: "少数駒" };

  it("uses the Japanese name on ja", () => {
    expect(getPositionName(problem, "ja")).toBe("少数駒");
  });

  it("falls back to the English name on other locales", () => {
    expect(getPositionName(problem, "es")).toBe("Few Pieces");
    expect(getPositionName(problem, "pt-BR")).toBe("Few Pieces");
  });

  it("falls back to the English name when the Japanese one is empty", () => {
    expect(getPositionName({ name: "X", nameJa: "" }, "ja")).toBe("X");
  });
});
