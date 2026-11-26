import { describe, expect, it } from "vitest";

import { replayMoves } from "../chess-core/moves";
import {
  A_FILE_ANTI_DIAGONALS,
  A_FILE_DIAGONALS,
  RANK_1_DIAGONALS,
  RANK_8_ANTI_DIAGONALS,
} from "./diagonal-patterns";
import {
  BREAKTHROUGH_LINE,
  PAWN_BREAKTHROUGH_FEN,
  moveLineSans,
} from "./positions";

describe("moveLineSans", () => {
  it("drops move numbers and keeps the moves in order", () => {
    expect(moveLineSans("1. e4 e5 2. Nf3")).toEqual(["e4", "e5", "Nf3"]);
    expect(moveLineSans(" 3... Kf7  4. a7 ")).toEqual(["Kf7", "a7"]);
  });
});

describe("the pawn breakthrough line", () => {
  // A replay stops silently at the first illegal move, so an edit to the
  // line or the FEN that broke it would only show fewer plies.
  it("is legal from the guide's position, ply by ply, to the promotion", () => {
    const sans = moveLineSans(BREAKTHROUGH_LINE);
    expect(sans).toEqual([
      "b6",
      "axb6",
      "c6",
      "bxc6",
      "a6",
      "Kf7",
      "a7",
      "b5",
      "a8=Q",
    ]);
    expect(replayMoves(sans, PAWN_BREAKTHROUGH_FEN)).toHaveLength(
      sans.length + 1,
    );
  });
});

const fileIndex = (square: string) => square.charCodeAt(0) - 97;
const rank = (square: string) => Number(square[1]);

describe("the diagonal tables", () => {
  it("pair each start with the far end of its diagonal", () => {
    for (const { start, end } of [...A_FILE_DIAGONALS, ...RANK_1_DIAGONALS]) {
      const steps = fileIndex(end) - fileIndex(start);
      expect(rank(end) - rank(start), `${start}-${end}`).toBe(steps);
      expect(rank(end) === 8 || end[0] === "h").toBe(true);
    }
    for (const { start, end } of [
      ...A_FILE_ANTI_DIAGONALS,
      ...RANK_8_ANTI_DIAGONALS,
    ]) {
      const steps = fileIndex(end) - fileIndex(start);
      expect(rank(start) - rank(end), `${start}-${end}`).toBe(steps);
      expect(rank(end) === 1 || end[0] === "h").toBe(true);
    }
  });
});
