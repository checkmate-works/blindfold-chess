import { describe, expect, it } from "vitest";

import {
  computeIsSubmittable,
  computeIsPawnCaptureMode,
  computePreviewText,
  computeShowPromotion,
  createInitialState,
  notationInputReducer,
} from "../state-machine";
import type { NotationInputAction, NotationInputState } from "../types";

function applyActions(
  state: NotationInputState,
  actions: NotationInputAction[],
): NotationInputState {
  return actions.reduce((s, action) => notationInputReducer(s, action), state);
}

// ============================================================
// createInitialState
// ============================================================
describe("createInitialState", () => {
  it("returns a clean initial state", () => {
    const state = createInitialState();
    expect(state.selectedPiece).toBeNull();
    expect(state.selectedFiles.size).toBe(0);
    expect(state.selectedRanks.size).toBe(0);
    expect(state.targetFile).toBeNull();
    expect(state.isCapture).toBe(false);
    expect(state.isCheck).toBe(false);
    expect(state.castling).toBeNull();
    expect(state.promotionPiece).toBeNull();
    expect(state.sourceFile).toBeNull();
    expect(state.sourceRank).toBeNull();
    expect(state.isAmbiguous).toBe(false);
  });
});

// ============================================================
// Piece Moves
// ============================================================
describe("Piece Moves", () => {
  it("should format a simple piece move (Nf3)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "N" },
      { type: "selectFile", file: "f" },
      { type: "selectRank", rank: "3" },
    ]);

    expect(computePreviewText(state)).toBe("Nf3");
  });

  it("should format a piece capture (Nxf3)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "N" },
      { type: "toggleCapture" },
      { type: "selectFile", file: "f" },
      { type: "selectRank", rank: "3" },
    ]);

    expect(computePreviewText(state)).toBe("Nxf3");
  });

  it("should format a disambiguated piece move (Raxd1)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "R" },
      { type: "selectSourceFile", file: "a" },
      { type: "toggleCapture" },
      { type: "selectFile", file: "d" },
      { type: "selectRank", rank: "1" },
    ]);

    expect(computePreviewText(state)).toBe("Raxd1");
  });

  it("should format a piece move with check (Bb5+)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "B" },
      { type: "selectFile", file: "b" },
      { type: "selectRank", rank: "5" },
      { type: "toggleCheck" },
    ]);

    expect(computePreviewText(state)).toBe("Bb5+");
  });

  it("should format a disambiguated move with source rank (R1d1)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "R" },
      { type: "selectSourceRank", rank: "1" },
      { type: "selectFile", file: "d" },
      { type: "selectRank", rank: "1" },
    ]);

    expect(computePreviewText(state)).toBe("R1d1");
  });
});

// ============================================================
// Pawn Moves
// ============================================================
describe("Pawn Moves", () => {
  it("should format a simple pawn move (e4)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "4" },
    ]);

    expect(computePreviewText(state)).toBe("e4");
  });

  it("should format a pawn capture (dxc5)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "d" },
      { type: "toggleCapture" },
      { type: "setTargetFile", file: "c" },
      { type: "selectRank", rank: "5" },
    ]);

    expect(computePreviewText(state)).toBe("dxc5");
  });

  it("should format promotion (e8=Q)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "8" },
      { type: "selectPromotion", piece: "q" },
    ]);

    expect(computePreviewText(state)).toBe("e8=Q");
  });

  it("should format promotion with check (e8=Q+)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "8" },
      { type: "selectPromotion", piece: "q" },
      { type: "toggleCheck" },
    ]);

    expect(computePreviewText(state)).toBe("e8=Q+");
  });

  it("should automatically show promotion when rank 8 is selected", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "8" },
    ]);

    expect(computeShowPromotion(state)).toBe(true);
  });

  it("should automatically show promotion when rank 1 is selected", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "1" },
    ]);

    expect(computeShowPromotion(state)).toBe(true);
  });

  it("should not show promotion for non-promotion ranks", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "4" },
    ]);

    expect(computeShowPromotion(state)).toBe(false);
  });

  it("should not show promotion when a piece is selected", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "N" },
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "8" },
    ]);

    expect(computeShowPromotion(state)).toBe(false);
  });
});

// ============================================================
// Castling
// ============================================================
describe("Castling", () => {
  it("should format short castling (O-O)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectCastling", move: "O-O" },
    ]);

    expect(computePreviewText(state)).toBe("O-O");
  });

  it("should format long castling (O-O-O)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectCastling", move: "O-O-O" },
    ]);

    expect(computePreviewText(state)).toBe("O-O-O");
  });

  it("should toggle castling off when clicked again", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectCastling", move: "O-O" },
      { type: "selectCastling", move: "O-O" },
    ]);

    expect(state.castling).toBeNull();
    expect(computePreviewText(state)).toBe("");
  });

  it("should clear other selections when castling is selected", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "N" },
      { type: "selectFile", file: "f" },
      { type: "selectRank", rank: "3" },
      { type: "selectCastling", move: "O-O" },
    ]);

    expect(state.selectedPiece).toBeNull();
    expect(state.selectedFiles.size).toBe(0);
    expect(state.selectedRanks.size).toBe(0);
    expect(state.castling).toBe("O-O");
  });
});

// ============================================================
// Side Effects
// ============================================================
describe("Side Effects", () => {
  it("should clear targetFile when capture is toggled off", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "d" },
      { type: "toggleCapture" },
      { type: "setTargetFile", file: "c" },
      { type: "toggleCapture" }, // turn off capture
    ]);

    expect(state.targetFile).toBeNull();
  });

  it("should clear targetFile when not in pawn capture mode", () => {
    // Enter pawn capture mode, set target, then select a piece (exits pawn capture mode)
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "d" },
      { type: "toggleCapture" },
      { type: "setTargetFile", file: "c" },
      { type: "selectPiece", piece: "N" }, // no longer pawn mode
    ]);

    expect(state.targetFile).toBeNull();
  });

  it("should clear promotionPiece when showPromotion becomes false", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "8" },
      { type: "selectPromotion", piece: "q" },
      { type: "selectRank", rank: "8" }, // toggle rank off
    ]);

    expect(state.promotionPiece).toBeNull();
  });
});

// ============================================================
// Reset
// ============================================================
describe("Reset", () => {
  it("should reset all state to initial values", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "Q" },
      { type: "selectFile", file: "d" },
      { type: "selectRank", rank: "4" },
      { type: "toggleCapture" },
      { type: "toggleCheck" },
      { type: "reset" },
    ]);

    const initial = createInitialState();
    expect(state.selectedPiece).toBe(initial.selectedPiece);
    expect(state.selectedFiles.size).toBe(initial.selectedFiles.size);
    expect(state.selectedRanks.size).toBe(initial.selectedRanks.size);
    expect(state.isCapture).toBe(initial.isCapture);
    expect(state.isCheck).toBe(initial.isCheck);
    expect(state.castling).toBe(initial.castling);
    expect(state.promotionPiece).toBe(initial.promotionPiece);
  });
});

// ============================================================
// Interactions
// ============================================================
describe("Interactions", () => {
  it("should clear files when switching from Piece to Pawn mode (deselecting piece)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "N" },
      { type: "selectFile", file: "f" },
      { type: "selectPiece", piece: "N" }, // toggle off
    ]);

    expect(state.selectedPiece).toBeNull();
    expect(state.selectedFiles.size).toBe(0);
  });

  it("should keep files when switching to Piece mode", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectPiece", piece: "N" },
    ]);

    expect(state.selectedPiece).toBe("N");
    expect(state.selectedFiles.has("e")).toBe(true);
    expect(computePreviewText(state)).toBe("Ne");
  });

  it("should clear castling when selecting a piece", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectCastling", move: "O-O" },
      { type: "selectPiece", piece: "N" },
    ]);

    expect(state.castling).toBeNull();
    expect(state.selectedPiece).toBe("N");
  });

  it("should clear castling when selecting a file", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectCastling", move: "O-O" },
      { type: "selectFile", file: "e" },
    ]);

    expect(state.castling).toBeNull();
  });

  it("should clear castling when selecting a rank", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectCastling", move: "O-O" },
      { type: "selectRank", rank: "4" },
    ]);

    expect(state.castling).toBeNull();
  });

  it("should toggle file selection off when clicking the same file", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectFile", file: "e" },
    ]);

    expect(state.selectedFiles.size).toBe(0);
  });

  it("should replace file selection when clicking a different file", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectFile", file: "d" },
    ]);

    expect(state.selectedFiles.size).toBe(1);
    expect(state.selectedFiles.has("d")).toBe(true);
  });

  it("should toggle rank selection off when clicking the same rank", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectRank", rank: "4" },
      { type: "selectRank", rank: "4" },
    ]);

    expect(state.selectedRanks.size).toBe(0);
  });

  it("should toggle source file off when clicking the same source file", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "R" },
      { type: "selectSourceFile", file: "a" },
      { type: "selectSourceFile", file: "a" },
    ]);

    expect(state.sourceFile).toBeNull();
  });

  it("should toggle source rank off when clicking the same source rank", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "R" },
      { type: "selectSourceRank", rank: "1" },
      { type: "selectSourceRank", rank: "1" },
    ]);

    expect(state.sourceRank).toBeNull();
  });

  it("should toggle promotion piece off when clicking the same piece", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "8" },
      { type: "selectPromotion", piece: "q" },
      { type: "selectPromotion", piece: "q" },
    ]);

    expect(state.promotionPiece).toBeNull();
  });
});

// ============================================================
// Derived State Helpers
// ============================================================
describe("computeIsPawnCaptureMode", () => {
  it("should return true when no piece, one file selected, and capture on", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "d" },
      { type: "toggleCapture" },
    ]);

    expect(computeIsPawnCaptureMode(state)).toBe(true);
  });

  it("should return false when a piece is selected", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "N" },
      { type: "selectFile", file: "d" },
      { type: "toggleCapture" },
    ]);

    expect(computeIsPawnCaptureMode(state)).toBe(false);
  });

  it("should return false when no file is selected", () => {
    const state = applyActions(createInitialState(), [
      { type: "toggleCapture" },
    ]);

    expect(computeIsPawnCaptureMode(state)).toBe(false);
  });

  it("should return false when capture is off", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "d" },
    ]);

    expect(computeIsPawnCaptureMode(state)).toBe(false);
  });
});

describe("computeIsSubmittable", () => {
  it("should return false for initial state", () => {
    expect(computeIsSubmittable(createInitialState())).toBe(false);
  });

  it("should return true when preview text is not empty", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "4" },
    ]);

    expect(computeIsSubmittable(state)).toBe(true);
  });
});

describe("toggleAmbiguous", () => {
  it("should toggle isAmbiguous", () => {
    const s1 = notationInputReducer(createInitialState(), {
      type: "toggleAmbiguous",
    });
    expect(s1.isAmbiguous).toBe(true);

    const s2 = notationInputReducer(s1, { type: "toggleAmbiguous" });
    expect(s2.isAmbiguous).toBe(false);
  });
});

// ============================================================
// Edge Cases: Empty / Initial State Transitions
// ============================================================
describe("Empty state transitions", () => {
  it("should handle toggleCapture on initial state without error", () => {
    const state = notationInputReducer(createInitialState(), {
      type: "toggleCapture",
    });
    expect(state.isCapture).toBe(true);
    expect(computePreviewText(state)).toBe("");
  });

  it("should handle toggleCheck on initial state without error", () => {
    const state = notationInputReducer(createInitialState(), {
      type: "toggleCheck",
    });
    expect(state.isCheck).toBe(true);
    expect(computePreviewText(state)).toBe("+");
  });

  it("should handle selectRank on initial state (no file selected)", () => {
    const state = notationInputReducer(createInitialState(), {
      type: "selectRank",
      rank: "4",
    });
    expect(state.selectedRanks.has("4")).toBe(true);
    expect(computePreviewText(state)).toBe("");
  });

  it("should handle selectSourceFile on initial state (no piece selected)", () => {
    const state = notationInputReducer(createInitialState(), {
      type: "selectSourceFile",
      file: "a",
    });
    expect(state.sourceFile).toBe("a");
  });

  it("should handle selectSourceRank on initial state (no piece selected)", () => {
    const state = notationInputReducer(createInitialState(), {
      type: "selectSourceRank",
      rank: "1",
    });
    expect(state.sourceRank).toBe("1");
  });

  it("should handle setTargetFile on initial state", () => {
    const state = notationInputReducer(createInitialState(), {
      type: "setTargetFile",
      file: "c",
    });
    // targetFile gets cleared by side effect since not in pawn capture mode
    expect(state.targetFile).toBeNull();
  });

  it("should handle selectPromotion on initial state (no rank selected)", () => {
    const state = notationInputReducer(createInitialState(), {
      type: "selectPromotion",
      piece: "q",
    });
    // promotionPiece gets cleared by side effect since showPromotion is false
    expect(state.promotionPiece).toBeNull();
  });

  it("should handle reset on initial state", () => {
    const state = notationInputReducer(createInitialState(), { type: "reset" });
    const initial = createInitialState();
    expect(state.selectedPiece).toBe(initial.selectedPiece);
    expect(state.selectedFiles.size).toBe(initial.selectedFiles.size);
    expect(state.selectedRanks.size).toBe(initial.selectedRanks.size);
    expect(state.castling).toBe(initial.castling);
  });
});

// ============================================================
// Edge Cases: Rapid Toggling
// ============================================================
describe("Rapid toggling", () => {
  it("should handle rapid piece toggle (select/deselect/select)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "N" },
      { type: "selectPiece", piece: "N" },
      { type: "selectPiece", piece: "N" },
    ]);
    expect(state.selectedPiece).toBe("N");
  });

  it("should handle rapid file toggle (select/deselect/select)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectFile", file: "e" },
      { type: "selectFile", file: "e" },
    ]);
    expect(state.selectedFiles.has("e")).toBe(true);
    expect(state.selectedFiles.size).toBe(1);
  });

  it("should handle rapid rank toggle (select/deselect/select)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectRank", rank: "4" },
      { type: "selectRank", rank: "4" },
      { type: "selectRank", rank: "4" },
    ]);
    expect(state.selectedRanks.has("4")).toBe(true);
    expect(state.selectedRanks.size).toBe(1);
  });

  it("should handle rapid capture toggle", () => {
    const state = applyActions(createInitialState(), [
      { type: "toggleCapture" },
      { type: "toggleCapture" },
      { type: "toggleCapture" },
    ]);
    expect(state.isCapture).toBe(true);
  });

  it("should handle rapid check toggle", () => {
    const state = applyActions(createInitialState(), [
      { type: "toggleCheck" },
      { type: "toggleCheck" },
      { type: "toggleCheck" },
    ]);
    expect(state.isCheck).toBe(true);
  });

  it("should handle rapid castling toggle", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectCastling", move: "O-O" },
      { type: "selectCastling", move: "O-O" },
      { type: "selectCastling", move: "O-O" },
    ]);
    expect(state.castling).toBe("O-O");
  });

  it("should handle switching between pieces rapidly", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "N" },
      { type: "selectPiece", piece: "B" },
      { type: "selectPiece", piece: "Q" },
    ]);
    expect(state.selectedPiece).toBe("Q");
  });

  it("should handle switching between castling types", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectCastling", move: "O-O" },
      { type: "selectCastling", move: "O-O-O" },
    ]);
    expect(state.castling).toBe("O-O-O");
    expect(computePreviewText(state)).toBe("O-O-O");
  });
});

// ============================================================
// Edge Cases: Castling + Other State Combinations
// ============================================================
describe("Castling isolation", () => {
  it("should clear capture flag when castling is selected", () => {
    const state = applyActions(createInitialState(), [
      { type: "toggleCapture" },
      { type: "selectCastling", move: "O-O" },
    ]);
    expect(state.isCapture).toBe(false);
    expect(state.castling).toBe("O-O");
  });

  it("should not clear check flag when castling is selected", () => {
    const state = applyActions(createInitialState(), [
      { type: "toggleCheck" },
      { type: "selectCastling", move: "O-O" },
    ]);
    // Note: castling action does not explicitly clear isCheck
    expect(state.castling).toBe("O-O");
  });

  it("should clear promotionPiece when castling is selected", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "8" },
      { type: "selectPromotion", piece: "q" },
      { type: "selectCastling", move: "O-O" },
    ]);
    expect(state.promotionPiece).toBeNull();
    expect(state.castling).toBe("O-O");
  });

  it("should clear targetFile when castling is selected", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "d" },
      { type: "toggleCapture" },
      { type: "setTargetFile", file: "c" },
      { type: "selectCastling", move: "O-O-O" },
    ]);
    expect(state.targetFile).toBeNull();
    expect(state.castling).toBe("O-O-O");
  });

  it("should produce castling preview even with check toggled", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectCastling", move: "O-O" },
      { type: "toggleCheck" },
    ]);
    // computePreviewText returns castling early if set
    expect(computePreviewText(state)).toBe("O-O");
  });
});

// ============================================================
// Edge Cases: State Consistency After Reset
// ============================================================
describe("State consistency after reset", () => {
  it("should produce empty preview after reset from complex state", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "R" },
      { type: "selectSourceFile", file: "a" },
      { type: "toggleCapture" },
      { type: "selectFile", file: "d" },
      { type: "selectRank", rank: "1" },
      { type: "toggleCheck" },
      { type: "reset" },
    ]);
    expect(computePreviewText(state)).toBe("");
    expect(computeIsSubmittable(state)).toBe(false);
    expect(computeIsPawnCaptureMode(state)).toBe(false);
    expect(computeShowPromotion(state)).toBe(false);
  });

  it("should reset sourceFile and sourceRank", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "R" },
      { type: "selectSourceFile", file: "a" },
      { type: "selectSourceRank", rank: "1" },
      { type: "reset" },
    ]);
    expect(state.sourceFile).toBeNull();
    expect(state.sourceRank).toBeNull();
  });

  it("should reset isAmbiguous", () => {
    const state = applyActions(createInitialState(), [
      { type: "toggleAmbiguous" },
      { type: "reset" },
    ]);
    expect(state.isAmbiguous).toBe(false);
  });

  it("should allow building new move after reset", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "Q" },
      { type: "selectFile", file: "d" },
      { type: "selectRank", rank: "8" },
      { type: "reset" },
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "4" },
    ]);
    expect(computePreviewText(state)).toBe("e4");
    expect(computeIsSubmittable(state)).toBe(true);
  });
});

// ============================================================
// Edge Cases: Boundary Files (a, h) and Ranks (1, 8)
// ============================================================
describe("Boundary files and ranks", () => {
  it("should handle file a (leftmost)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "a" },
      { type: "selectRank", rank: "4" },
    ]);
    expect(computePreviewText(state)).toBe("a4");
  });

  it("should handle file h (rightmost)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "h" },
      { type: "selectRank", rank: "4" },
    ]);
    expect(computePreviewText(state)).toBe("h4");
  });

  it("should handle rank 1 (bottom)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "1" },
    ]);
    expect(computePreviewText(state)).toBe("e1");
    expect(computeShowPromotion(state)).toBe(true);
  });

  it("should handle rank 8 (top)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "8" },
    ]);
    expect(computePreviewText(state)).toBe("e8");
    expect(computeShowPromotion(state)).toBe(true);
  });

  it("should handle corner square a1", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "R" },
      { type: "selectFile", file: "a" },
      { type: "selectRank", rank: "1" },
    ]);
    expect(computePreviewText(state)).toBe("Ra1");
  });

  it("should handle corner square h8", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "R" },
      { type: "selectFile", file: "h" },
      { type: "selectRank", rank: "8" },
    ]);
    expect(computePreviewText(state)).toBe("Rh8");
  });

  it("should handle corner square a8", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "B" },
      { type: "selectFile", file: "a" },
      { type: "selectRank", rank: "8" },
    ]);
    expect(computePreviewText(state)).toBe("Ba8");
  });

  it("should handle corner square h1", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "B" },
      { type: "selectFile", file: "h" },
      { type: "selectRank", rank: "1" },
    ]);
    expect(computePreviewText(state)).toBe("Bh1");
  });

  it("should handle pawn capture from a-file boundary (axb5)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "a" },
      { type: "toggleCapture" },
      { type: "setTargetFile", file: "b" },
      { type: "selectRank", rank: "5" },
    ]);
    expect(computePreviewText(state)).toBe("axb5");
  });

  it("should handle pawn capture from h-file boundary (hxg5)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "h" },
      { type: "toggleCapture" },
      { type: "setTargetFile", file: "g" },
      { type: "selectRank", rank: "5" },
    ]);
    expect(computePreviewText(state)).toBe("hxg5");
  });

  it("should handle promotion on a-file (a8=Q)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "a" },
      { type: "selectRank", rank: "8" },
      { type: "selectPromotion", piece: "q" },
    ]);
    expect(computePreviewText(state)).toBe("a8=Q");
  });

  it("should handle promotion on h-file (h1=N)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "h" },
      { type: "selectRank", rank: "1" },
      { type: "selectPromotion", piece: "n" },
    ]);
    expect(computePreviewText(state)).toBe("h1=N");
  });
});

// ============================================================
// Edge Cases: Multiple Sequential Moves (reset between each)
// ============================================================
describe("Multiple sequential moves", () => {
  it("should handle e4 -> reset -> Nf3 -> reset -> Bb5", () => {
    let state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "4" },
    ]);
    expect(computePreviewText(state)).toBe("e4");

    state = applyActions(state, [{ type: "reset" }]);
    expect(computePreviewText(state)).toBe("");

    state = applyActions(state, [
      { type: "selectPiece", piece: "N" },
      { type: "selectFile", file: "f" },
      { type: "selectRank", rank: "3" },
    ]);
    expect(computePreviewText(state)).toBe("Nf3");

    state = applyActions(state, [{ type: "reset" }]);
    expect(computePreviewText(state)).toBe("");

    state = applyActions(state, [
      { type: "selectPiece", piece: "B" },
      { type: "selectFile", file: "b" },
      { type: "selectRank", rank: "5" },
    ]);
    expect(computePreviewText(state)).toBe("Bb5");
  });

  it("should handle castling -> reset -> pawn move -> reset -> piece capture", () => {
    let state = applyActions(createInitialState(), [
      { type: "selectCastling", move: "O-O" },
    ]);
    expect(computePreviewText(state)).toBe("O-O");

    state = applyActions(state, [{ type: "reset" }]);

    state = applyActions(state, [
      { type: "selectFile", file: "d" },
      { type: "selectRank", rank: "4" },
    ]);
    expect(computePreviewText(state)).toBe("d4");

    state = applyActions(state, [{ type: "reset" }]);

    state = applyActions(state, [
      { type: "selectPiece", piece: "N" },
      { type: "toggleCapture" },
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "5" },
    ]);
    expect(computePreviewText(state)).toBe("Nxe5");
  });
});

// ============================================================
// Edge Cases: Preview Text for All Notation Patterns
// ============================================================
describe("Preview text for all notation patterns", () => {
  it("should format pawn move (e4)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "4" },
    ]);
    expect(computePreviewText(state)).toBe("e4");
  });

  it("should format pawn capture (exd5)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "toggleCapture" },
      { type: "setTargetFile", file: "d" },
      { type: "selectRank", rank: "5" },
    ]);
    expect(computePreviewText(state)).toBe("exd5");
  });

  it("should format pawn promotion (e8=Q)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "8" },
      { type: "selectPromotion", piece: "q" },
    ]);
    expect(computePreviewText(state)).toBe("e8=Q");
  });

  it("should format pawn capture with promotion (exd8=R)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "toggleCapture" },
      { type: "setTargetFile", file: "d" },
      { type: "selectRank", rank: "8" },
      { type: "selectPromotion", piece: "r" },
    ]);
    expect(computePreviewText(state)).toBe("exd8=R");
  });

  it("should format piece move (Nf3)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "N" },
      { type: "selectFile", file: "f" },
      { type: "selectRank", rank: "3" },
    ]);
    expect(computePreviewText(state)).toBe("Nf3");
  });

  it("should format piece capture (Bxe5)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "B" },
      { type: "toggleCapture" },
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "5" },
    ]);
    expect(computePreviewText(state)).toBe("Bxe5");
  });

  it("should format disambiguated by file (Rae1)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "R" },
      { type: "selectSourceFile", file: "a" },
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "1" },
    ]);
    expect(computePreviewText(state)).toBe("Rae1");
  });

  it("should format disambiguated by rank (R1e1)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "R" },
      { type: "selectSourceRank", rank: "1" },
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "1" },
    ]);
    expect(computePreviewText(state)).toBe("R1e1");
  });

  it("should format disambiguated capture by file (Raxd1)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "R" },
      { type: "selectSourceFile", file: "a" },
      { type: "toggleCapture" },
      { type: "selectFile", file: "d" },
      { type: "selectRank", rank: "1" },
    ]);
    expect(computePreviewText(state)).toBe("Raxd1");
  });

  it("should format short castling (O-O)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectCastling", move: "O-O" },
    ]);
    expect(computePreviewText(state)).toBe("O-O");
  });

  it("should format long castling (O-O-O)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectCastling", move: "O-O-O" },
    ]);
    expect(computePreviewText(state)).toBe("O-O-O");
  });

  it("should format move with check (Qd8+)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "Q" },
      { type: "selectFile", file: "d" },
      { type: "selectRank", rank: "8" },
      { type: "toggleCheck" },
    ]);
    expect(computePreviewText(state)).toBe("Qd8+");
  });

  it("should format capture with check (Nxf7+)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "N" },
      { type: "toggleCapture" },
      { type: "selectFile", file: "f" },
      { type: "selectRank", rank: "7" },
      { type: "toggleCheck" },
    ]);
    expect(computePreviewText(state)).toBe("Nxf7+");
  });

  it("should format pawn promotion with check (e8=Q+)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "8" },
      { type: "selectPromotion", piece: "q" },
      { type: "toggleCheck" },
    ]);
    expect(computePreviewText(state)).toBe("e8=Q+");
  });

  it("should format all promotion piece types", () => {
    for (const [piece, expected] of [
      ["q", "e8=Q"],
      ["r", "e8=R"],
      ["b", "e8=B"],
      ["n", "e8=N"],
    ] as const) {
      const state = applyActions(createInitialState(), [
        { type: "selectFile", file: "e" },
        { type: "selectRank", rank: "8" },
        { type: "selectPromotion", piece },
      ]);
      expect(computePreviewText(state)).toBe(expected);
    }
  });

  it("should format partial input (piece only)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "N" },
    ]);
    expect(computePreviewText(state)).toBe("N");
  });

  it("should format partial input (piece + file)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "N" },
      { type: "selectFile", file: "f" },
    ]);
    expect(computePreviewText(state)).toBe("Nf");
  });

  it("should format partial input (file only)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
    ]);
    expect(computePreviewText(state)).toBe("e");
  });
});

// ============================================================
// Edge Cases: Side Effect Correctness
// ============================================================
describe("Side effect correctness", () => {
  it("should clear targetFile when piece is selected (exits pawn capture mode)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "d" },
      { type: "toggleCapture" },
      { type: "setTargetFile", file: "c" },
      { type: "selectPiece", piece: "N" },
    ]);
    expect(state.targetFile).toBeNull();
  });

  it("should clear targetFile when file is deselected (exits pawn capture mode)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "d" },
      { type: "toggleCapture" },
      { type: "setTargetFile", file: "c" },
      { type: "selectFile", file: "d" }, // deselect file
    ]);
    expect(state.targetFile).toBeNull();
  });

  it("should clear promotionPiece when piece is selected (showPromotion becomes false)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "8" },
      { type: "selectPromotion", piece: "q" },
      { type: "selectPiece", piece: "N" }, // piece selected -> showPromotion = false
    ]);
    expect(state.promotionPiece).toBeNull();
  });

  it("should clear promotionPiece when rank changes away from promotion rank", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "8" },
      { type: "selectPromotion", piece: "q" },
      { type: "selectRank", rank: "8" }, // deselect rank 8
    ]);
    expect(state.promotionPiece).toBeNull();
    expect(computeShowPromotion(state)).toBe(false);
  });

  it("should keep targetFile when in valid pawn capture mode", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "d" },
      { type: "toggleCapture" },
      { type: "setTargetFile", file: "c" },
    ]);
    expect(state.targetFile).toBe("c");
    expect(computeIsPawnCaptureMode(state)).toBe(true);
  });

  it("should keep promotionPiece when showPromotion is true", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectRank", rank: "8" },
      { type: "selectPromotion", piece: "r" },
    ]);
    expect(state.promotionPiece).toBe("r");
    expect(computeShowPromotion(state)).toBe(true);
  });

  it("should not show promotion when castling is active", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectCastling", move: "O-O" },
    ]);
    expect(computeShowPromotion(state)).toBe(false);
  });

  it("should not show promotion when no ranks are selected", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
    ]);
    expect(computeShowPromotion(state)).toBe(false);
  });

  it("should clear targetFile when setTargetFile(null) is dispatched while in pawn capture mode", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "d" },
      { type: "toggleCapture" },
      { type: "setTargetFile", file: "c" },
      { type: "setTargetFile", file: null },
    ]);
    expect(state.targetFile).toBeNull();
  });
});

// ============================================================
// Edge Cases: computeIsSubmittable
// ============================================================
describe("computeIsSubmittable edge cases", () => {
  it("should be submittable for castling", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectCastling", move: "O-O" },
    ]);
    expect(computeIsSubmittable(state)).toBe(true);
  });

  it("should be submittable for partial piece input (piece only)", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectPiece", piece: "N" },
    ]);
    expect(computeIsSubmittable(state)).toBe(true);
  });

  it("should not be submittable when only rank is selected", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectRank", rank: "4" },
    ]);
    expect(computeIsSubmittable(state)).toBe(false);
  });

  it("should be submittable for file-only input", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
    ]);
    expect(computeIsSubmittable(state)).toBe(true);
  });

  it("should not be submittable after everything is toggled off", () => {
    const state = applyActions(createInitialState(), [
      { type: "selectFile", file: "e" },
      { type: "selectFile", file: "e" }, // toggle off
    ]);
    expect(computeIsSubmittable(state)).toBe(false);
  });
});
