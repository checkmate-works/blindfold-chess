import { describe, expect, it } from "vitest";

import {
  computeHasSelections,
  computeShowCastlingRow,
  computeShowCheckToggle,
  computeShowPieceRow,
  computeShowRankRow,
  createInitialState,
} from "../state-machine";
import type { NotationInputState } from "../types";

function state(overrides: Partial<NotationInputState>): NotationInputState {
  return { ...createInitialState(), ...overrides };
}

describe("computeHasSelections", () => {
  it("is false on the initial state", () => {
    expect(computeHasSelections(createInitialState())).toBe(false);
  });

  it("is true once any structured selection is active", () => {
    expect(computeHasSelections(state({ selectedPiece: "N" }))).toBe(true);
    expect(computeHasSelections(state({ selectedFiles: new Set(["e"]) }))).toBe(
      true,
    );
    expect(computeHasSelections(state({ isCapture: true }))).toBe(true);
    expect(computeHasSelections(state({ castling: "O-O" }))).toBe(true);
    expect(computeHasSelections(state({ sourceRank: "1" }))).toBe(true);
  });
});

describe("row visibility", () => {
  it("shows piece + castling rows on the initial state", () => {
    const s = createInitialState();
    expect(computeShowPieceRow(s)).toBe(true);
    expect(computeShowCastlingRow(s)).toBe(true);
  });

  it("hides the piece row while castling and mid-pawn-entry", () => {
    expect(computeShowPieceRow(state({ castling: "O-O" }))).toBe(false);
    // A file without a piece = a pawn move in progress.
    expect(computeShowPieceRow(state({ selectedFiles: new Set(["e"]) }))).toBe(
      false,
    );
    // With a piece selected, the file no longer hides the row.
    expect(
      computeShowPieceRow(
        state({ selectedPiece: "N", selectedFiles: new Set(["f"]) }),
      ),
    ).toBe(true);
  });

  it("hides the castling row once a piece or file is chosen", () => {
    expect(computeShowCastlingRow(state({ selectedPiece: "N" }))).toBe(false);
    expect(
      computeShowCastlingRow(state({ selectedFiles: new Set(["e"]) })),
    ).toBe(false);
  });

  it("gates the rank row on the pawn-capture target file", () => {
    // Plain pawn move: file chosen → rank row shows.
    expect(computeShowRankRow(state({ selectedFiles: new Set(["e"]) }))).toBe(
      true,
    );
    // Pawn capture without a target file yet → hidden.
    expect(
      computeShowRankRow(
        state({ selectedFiles: new Set(["e"]), isCapture: true }),
      ),
    ).toBe(false);
    expect(
      computeShowRankRow(
        state({
          selectedFiles: new Set(["e"]),
          isCapture: true,
          targetFile: "d",
        }),
      ),
    ).toBe(true);
  });

  it("gates the check toggle on promotion completion", () => {
    // Rank 8 pawn destination offers a promotion → toggle hidden until picked.
    const promoting = state({
      selectedFiles: new Set(["e"]),
      selectedRanks: new Set(["8"]),
    });
    expect(computeShowCheckToggle(promoting)).toBe(false);
    expect(computeShowCheckToggle({ ...promoting, promotionPiece: "q" })).toBe(
      true,
    );
    // A non-promoting destination shows the toggle immediately.
    expect(
      computeShowCheckToggle(
        state({ selectedFiles: new Set(["e"]), selectedRanks: new Set(["4"]) }),
      ),
    ).toBe(true);
  });
});
