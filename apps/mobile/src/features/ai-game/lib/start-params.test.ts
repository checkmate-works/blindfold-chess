import { describe, expect, it } from "vitest";
import type { AlgebraicNotation } from "@blindfold-chess/types";

import { decodeStartParams, encodeStartParams } from "./start-params";

const FEN = "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1";

describe("encodeStartParams", () => {
  it("sends nothing for the standard start", () => {
    expect(encodeStartParams({ moves: [] })).toEqual({});
  });

  it("sends the FEN and the moves as JSON", () => {
    expect(
      encodeStartParams({
        startingFen: FEN,
        moves: ["e4", "Kd7"] as AlgebraicNotation[],
      }),
    ).toEqual({ fen: FEN, moves: '["e4","Kd7"]' });
  });
});

describe("decodeStartParams", () => {
  it("round-trips an encoded start", () => {
    const start = {
      startingFen: FEN,
      moves: ["e4", "Kd7"] as AlgebraicNotation[],
    };
    expect(decodeStartParams(encodeStartParams(start))).toEqual(start);
  });

  it("falls back to the standard start for missing params", () => {
    expect(decodeStartParams({})).toEqual({ moves: [] });
  });

  it("drops an invalid FEN", () => {
    expect(decodeStartParams({ fen: "not a fen" })).toEqual({ moves: [] });
  });

  it("treats unreadable or non-string moves as no moves", () => {
    expect(decodeStartParams({ moves: "e4 e5" })).toEqual({ moves: [] });
    expect(decodeStartParams({ moves: "[1,2]" })).toEqual({ moves: [] });
    expect(decodeStartParams({ moves: '{"a":1}' })).toEqual({ moves: [] });
  });
});
