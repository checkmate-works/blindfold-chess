import { describe, expect, it } from "vitest";

import {
  buildCells,
  buildRows,
  computeAttemptStatus,
  groupAttemptsByPlayerStep,
} from "./attempt-history";

const wrong = (move: string) => ({ move, isCorrect: false });
const right = (move: string) => ({ move, isCorrect: true });

describe("attempt history", () => {
  it("closes a step on each correct move and keeps trailing wrong tries", () => {
    expect(
      groupAttemptsByPlayerStep([wrong("Qh5"), right("Qxf7#"), wrong("Kd1")]),
    ).toEqual([
      { wrongMoves: ["Qh5"], correctMove: "Qxf7#" },
      { wrongMoves: ["Kd1"], correctMove: null },
    ]);
  });

  it("grades solved, partial and revealed", () => {
    const line = ["Nf7+", "Kg8", "Nh6+"];
    expect(
      computeAttemptStatus([right("Nf7+"), right("Nh6+")], line).state,
    ).toBe("solved");
    expect(computeAttemptStatus([right("Nf7+")], line)).toEqual({
      state: "partial",
      correctCount: 1,
      totalPlayerSteps: 2,
    });
    expect(computeAttemptStatus([wrong("Qh5")], line).state).toBe("revealed");
  });

  it("lays the cells out from Black's move with an empty White cell", () => {
    const cells = buildCells(
      ["Qh2+", "Kf1", "Qh1#"],
      groupAttemptsByPlayerStep([right("Qh2+")]),
    );
    expect(cells.map((c) => c.kind)).toEqual(["solved", "opponent", "skipped"]);
    const rows = buildRows(cells, true, 30);
    expect(rows.map((r) => r.moveNumber)).toEqual([30, 31]);
    expect(rows[0].white).toEqual({ kind: "empty" });
    expect(rows[1].black).toEqual({ kind: "skipped", expectedMove: "Qh1#" });
  });
});
