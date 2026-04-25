import { describe, expect, it } from "vitest";

import {
  computeIsPawnCaptureMode,
  computeIsSubmittable,
  computePreviewText,
  computeShowPromotion,
  createInitialState,
  notationInputReducer,
} from "../state-machine";
import { MAX_NOTATION_INPUT_LENGTH } from "../types";

// ============================================================
// createInitialState
// ============================================================
describe("createInitialState", () => {
  it("returns a fresh fully-empty state", () => {
    const s = createInitialState();
    expect(s.input).toBe("");
    expect(s.selectedPiece).toBeNull();
    expect(s.selectedFiles.size).toBe(0);
    expect(s.selectedRanks.size).toBe(0);
    expect(s.targetFile).toBeNull();
    expect(s.isCapture).toBe(false);
    expect(s.isCheck).toBe(false);
    expect(s.castling).toBeNull();
    expect(s.promotionPiece).toBeNull();
    expect(s.sourceFile).toBeNull();
    expect(s.sourceRank).toBeNull();
    expect(s.isAmbiguous).toBe(false);
  });

  it("returns a new object on each call (no shared reference)", () => {
    const a = createInitialState();
    const b = createInitialState();
    expect(a).not.toBe(b);
    expect(a.selectedFiles).not.toBe(b.selectedFiles);
  });
});

// ============================================================
// notationInputReducer — appendChar (web keypad)
// ============================================================
describe("notationInputReducer — appendChar", () => {
  it("appends a single character to input", () => {
    const next = notationInputReducer(createInitialState(), {
      type: "appendChar",
      char: "e",
    });
    expect(next.input).toBe("e");
  });

  it("appends onto a non-empty input", () => {
    const state = { ...createInitialState(), input: "e" };
    const next = notationInputReducer(state, { type: "appendChar", char: "4" });
    expect(next.input).toBe("e4");
  });

  it("is a no-op when input is already at MAX_NOTATION_INPUT_LENGTH", () => {
    const full = "a".repeat(MAX_NOTATION_INPUT_LENGTH);
    const state = { ...createInitialState(), input: full };
    const next = notationInputReducer(state, { type: "appendChar", char: "b" });
    expect(next).toBe(state);
    expect(next.input).toBe(full);
  });

  it("allows the final character when input length is MAX - 1", () => {
    const almostFull = "a".repeat(MAX_NOTATION_INPUT_LENGTH - 1);
    const state = { ...createInitialState(), input: almostFull };
    const next = notationInputReducer(state, { type: "appendChar", char: "b" });
    expect(next.input.length).toBe(MAX_NOTATION_INPUT_LENGTH);
    expect(next.input).toBe(`${almostFull}b`);
  });
});

// ============================================================
// notationInputReducer — appendCastling (web keypad)
// ============================================================
describe("notationInputReducer — appendCastling", () => {
  it("appends O-O when there is room", () => {
    const next = notationInputReducer(createInitialState(), {
      type: "appendCastling",
      move: "O-O",
    });
    expect(next.input).toBe("O-O");
  });

  it("appends O-O-O when there is room", () => {
    const next = notationInputReducer(createInitialState(), {
      type: "appendCastling",
      move: "O-O-O",
    });
    expect(next.input).toBe("O-O-O");
  });

  it("is a no-op when the token would overflow MAX_NOTATION_INPUT_LENGTH", () => {
    const prefix = "a".repeat(MAX_NOTATION_INPUT_LENGTH - 4);
    const state = { ...createInitialState(), input: prefix };
    const next = notationInputReducer(state, {
      type: "appendCastling",
      move: "O-O-O",
    });
    expect(next).toBe(state);
    expect(next.input).toBe(prefix);
  });

  it("appends O-O-O exactly when it fits at the boundary", () => {
    const prefix = "a".repeat(MAX_NOTATION_INPUT_LENGTH - 5);
    const state = { ...createInitialState(), input: prefix };
    const next = notationInputReducer(state, {
      type: "appendCastling",
      move: "O-O-O",
    });
    expect(next.input.length).toBe(MAX_NOTATION_INPUT_LENGTH);
    expect(next.input).toBe(`${prefix}O-O-O`);
  });
});

// ============================================================
// notationInputReducer — backspace (web keypad)
// ============================================================
describe("notationInputReducer — backspace", () => {
  it("removes the last character", () => {
    const state = { ...createInitialState(), input: "e4" };
    const next = notationInputReducer(state, { type: "backspace" });
    expect(next.input).toBe("e");
  });

  it("is a no-op when input is empty", () => {
    const state = createInitialState();
    const next = notationInputReducer(state, { type: "backspace" });
    expect(next).toBe(state);
    expect(next.input).toBe("");
  });
});

// ============================================================
// notationInputReducer — clear (web keypad)
// ============================================================
describe("notationInputReducer — clear", () => {
  it("resets input to an empty string", () => {
    const state = { ...createInitialState(), input: "Nf3" };
    const next = notationInputReducer(state, { type: "clear" });
    expect(next.input).toBe("");
  });

  it("returns an empty state even when already empty", () => {
    const next = notationInputReducer(createInitialState(), { type: "clear" });
    expect(next.input).toBe("");
  });
});

// ============================================================
// notationInputReducer — selectPiece (mobile)
// ============================================================
describe("notationInputReducer — selectPiece", () => {
  it("selects a piece when none is selected", () => {
    const next = notationInputReducer(createInitialState(), {
      type: "selectPiece",
      piece: "N",
    });
    expect(next.selectedPiece).toBe("N");
    expect(next.input).toBe("N");
  });

  it("deselects when the same piece is tapped twice", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectPiece",
      piece: "N",
    });
    s = notationInputReducer(s, { type: "selectPiece", piece: "N" });
    expect(s.selectedPiece).toBeNull();
    expect(s.input).toBe("");
  });

  it("clears files when deselecting the piece", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectPiece",
      piece: "N",
    });
    s = notationInputReducer(s, { type: "selectFile", file: "f" });
    expect(s.selectedFiles.has("f")).toBe(true);
    s = notationInputReducer(s, { type: "selectPiece", piece: "N" });
    expect(s.selectedPiece).toBeNull();
    expect(s.selectedFiles.size).toBe(0);
  });
});

// ============================================================
// notationInputReducer — selectFile / selectRank (mobile)
// ============================================================
describe("notationInputReducer — selectFile", () => {
  it("selects a file", () => {
    const next = notationInputReducer(createInitialState(), {
      type: "selectFile",
      file: "e",
    });
    expect(next.selectedFiles.has("e")).toBe(true);
    expect(next.input).toBe("e");
  });

  it("deselects when the same file is tapped twice", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectFile",
      file: "e",
    });
    s = notationInputReducer(s, { type: "selectFile", file: "e" });
    expect(s.selectedFiles.size).toBe(0);
  });

  it("replaces the previous file on new selection", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectFile",
      file: "e",
    });
    s = notationInputReducer(s, { type: "selectFile", file: "d" });
    expect(s.selectedFiles.size).toBe(1);
    expect(s.selectedFiles.has("d")).toBe(true);
  });

  it("clears an active castling when a file is selected", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectCastling",
      move: "O-O",
    });
    expect(s.castling).toBe("O-O");
    s = notationInputReducer(s, { type: "selectFile", file: "e" });
    expect(s.castling).toBeNull();
  });
});

describe("notationInputReducer — selectRank", () => {
  it("selects a rank and appears in preview after a file", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectFile",
      file: "e",
    });
    s = notationInputReducer(s, { type: "selectRank", rank: "4" });
    expect(s.selectedRanks.has("4")).toBe(true);
    expect(s.input).toBe("e4");
  });

  it("deselects when the same rank is tapped twice", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectRank",
      rank: "4",
    });
    s = notationInputReducer(s, { type: "selectRank", rank: "4" });
    expect(s.selectedRanks.size).toBe(0);
  });
});

// ============================================================
// notationInputReducer — setTargetFile (mobile pawn capture)
// ============================================================
describe("notationInputReducer — setTargetFile", () => {
  it("sets a target file when in pawn capture mode", () => {
    // Enter pawn capture mode: select file + toggle capture (no piece).
    let s = notationInputReducer(createInitialState(), {
      type: "selectFile",
      file: "e",
    });
    s = notationInputReducer(s, { type: "toggleCapture" });
    expect(computeIsPawnCaptureMode(s)).toBe(true);

    s = notationInputReducer(s, { type: "setTargetFile", file: "d" });
    expect(s.targetFile).toBe("d");
    expect(s.input).toBe("exd");
  });

  it("clears a target file when pawn capture mode is exited", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectFile",
      file: "e",
    });
    s = notationInputReducer(s, { type: "toggleCapture" });
    s = notationInputReducer(s, { type: "setTargetFile", file: "d" });
    expect(s.targetFile).toBe("d");
    // Turning off capture should exit pawn-capture mode and clear target.
    s = notationInputReducer(s, { type: "toggleCapture" });
    expect(s.targetFile).toBeNull();
  });
});

// ============================================================
// notationInputReducer — toggleCapture / toggleCheck (mobile)
// ============================================================
describe("notationInputReducer — toggleCapture", () => {
  it("flips isCapture", () => {
    const s1 = notationInputReducer(createInitialState(), {
      type: "toggleCapture",
    });
    expect(s1.isCapture).toBe(true);
    const s2 = notationInputReducer(s1, { type: "toggleCapture" });
    expect(s2.isCapture).toBe(false);
  });
});

describe("notationInputReducer — toggleCheck", () => {
  it("flips isCheck and appears in preview", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectFile",
      file: "e",
    });
    s = notationInputReducer(s, { type: "selectRank", rank: "4" });
    s = notationInputReducer(s, { type: "toggleCheck" });
    expect(s.isCheck).toBe(true);
    expect(s.input).toBe("e4+");
  });
});

// ============================================================
// notationInputReducer — selectCastling (mobile)
// ============================================================
describe("notationInputReducer — selectCastling", () => {
  it("sets castling and clears other fields", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectPiece",
      piece: "N",
    });
    s = notationInputReducer(s, { type: "selectFile", file: "f" });
    s = notationInputReducer(s, { type: "selectRank", rank: "3" });
    s = notationInputReducer(s, { type: "selectCastling", move: "O-O" });
    expect(s.castling).toBe("O-O");
    expect(s.selectedPiece).toBeNull();
    expect(s.selectedFiles.size).toBe(0);
    expect(s.selectedRanks.size).toBe(0);
    expect(s.input).toBe("O-O");
  });

  it("deselects when the same castling move is tapped twice", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectCastling",
      move: "O-O",
    });
    s = notationInputReducer(s, { type: "selectCastling", move: "O-O" });
    expect(s.castling).toBeNull();
    expect(s.input).toBe("");
  });
});

// ============================================================
// notationInputReducer — selectPromotion (mobile)
// ============================================================
describe("notationInputReducer — selectPromotion", () => {
  it("selects a promotion piece when the preview shows one", () => {
    // Pawn pushing to rank 8 triggers showPromotion.
    let s = notationInputReducer(createInitialState(), {
      type: "selectFile",
      file: "e",
    });
    s = notationInputReducer(s, { type: "selectRank", rank: "8" });
    expect(computeShowPromotion(s)).toBe(true);
    s = notationInputReducer(s, { type: "selectPromotion", piece: "q" });
    expect(s.promotionPiece).toBe("q");
    expect(s.input).toBe("e8=Q");
  });

  it("deselects when the same promotion piece is tapped twice", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectFile",
      file: "e",
    });
    s = notationInputReducer(s, { type: "selectRank", rank: "8" });
    s = notationInputReducer(s, { type: "selectPromotion", piece: "q" });
    s = notationInputReducer(s, { type: "selectPromotion", piece: "q" });
    expect(s.promotionPiece).toBeNull();
  });
});

// ============================================================
// notationInputReducer — selectSourceFile / selectSourceRank (mobile)
// ============================================================
describe("notationInputReducer — source disambiguation", () => {
  it("selects a source file and renders it after the piece", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectPiece",
      piece: "N",
    });
    s = notationInputReducer(s, { type: "selectSourceFile", file: "b" });
    s = notationInputReducer(s, { type: "selectFile", file: "d" });
    s = notationInputReducer(s, { type: "selectRank", rank: "2" });
    expect(s.sourceFile).toBe("b");
    expect(s.input).toBe("Nbd2");
  });

  it("selects a source rank", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectPiece",
      piece: "R",
    });
    s = notationInputReducer(s, { type: "selectSourceRank", rank: "1" });
    expect(s.sourceRank).toBe("1");
  });

  it("deselects the same source file when tapped twice", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectPiece",
      piece: "N",
    });
    s = notationInputReducer(s, { type: "selectSourceFile", file: "b" });
    s = notationInputReducer(s, { type: "selectSourceFile", file: "b" });
    expect(s.sourceFile).toBeNull();
  });
});

// ============================================================
// notationInputReducer — toggleAmbiguous (mobile)
// ============================================================
describe("notationInputReducer — toggleAmbiguous", () => {
  it("flips isAmbiguous", () => {
    const s1 = notationInputReducer(createInitialState(), {
      type: "toggleAmbiguous",
    });
    expect(s1.isAmbiguous).toBe(true);
    const s2 = notationInputReducer(s1, { type: "toggleAmbiguous" });
    expect(s2.isAmbiguous).toBe(false);
  });
});

// ============================================================
// notationInputReducer — reset (mobile)
// ============================================================
describe("notationInputReducer — reset", () => {
  it("returns a fully empty state", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectPiece",
      piece: "N",
    });
    s = notationInputReducer(s, { type: "selectFile", file: "f" });
    s = notationInputReducer(s, { type: "selectRank", rank: "3" });
    s = notationInputReducer(s, { type: "reset" });
    expect(s).toEqual(createInitialState());
  });
});

// ============================================================
// computePreviewText
// ============================================================
describe("computePreviewText", () => {
  it("renders castling as the full token", () => {
    const s = notationInputReducer(createInitialState(), {
      type: "selectCastling",
      move: "O-O-O",
    });
    expect(computePreviewText(s)).toBe("O-O-O");
  });

  it("renders a piece move with capture", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectPiece",
      piece: "N",
    });
    s = notationInputReducer(s, { type: "toggleCapture" });
    s = notationInputReducer(s, { type: "selectFile", file: "d" });
    s = notationInputReducer(s, { type: "selectRank", rank: "5" });
    expect(computePreviewText(s)).toBe("Nxd5");
  });

  it("renders a pawn capture with target file", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectFile",
      file: "e",
    });
    s = notationInputReducer(s, { type: "toggleCapture" });
    s = notationInputReducer(s, { type: "setTargetFile", file: "d" });
    s = notationInputReducer(s, { type: "selectRank", rank: "5" });
    expect(computePreviewText(s)).toBe("exd5");
  });

  it("renders promotion with uppercased piece", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectFile",
      file: "e",
    });
    s = notationInputReducer(s, { type: "selectRank", rank: "8" });
    s = notationInputReducer(s, { type: "selectPromotion", piece: "q" });
    expect(computePreviewText(s)).toBe("e8=Q");
  });
});

// ============================================================
// computeShowPromotion / computeIsPawnCaptureMode
// ============================================================
describe("computeShowPromotion", () => {
  it("is true for a pawn move to rank 8", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectFile",
      file: "e",
    });
    s = notationInputReducer(s, { type: "selectRank", rank: "8" });
    expect(computeShowPromotion(s)).toBe(true);
  });

  it("is false for a piece move to rank 8", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectPiece",
      piece: "N",
    });
    s = notationInputReducer(s, { type: "selectFile", file: "f" });
    s = notationInputReducer(s, { type: "selectRank", rank: "8" });
    expect(computeShowPromotion(s)).toBe(false);
  });

  it("is false during castling", () => {
    const s = notationInputReducer(createInitialState(), {
      type: "selectCastling",
      move: "O-O",
    });
    expect(computeShowPromotion(s)).toBe(false);
  });
});

describe("computeIsPawnCaptureMode", () => {
  it("is true with a single file, no piece, and capture toggled", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectFile",
      file: "e",
    });
    s = notationInputReducer(s, { type: "toggleCapture" });
    expect(computeIsPawnCaptureMode(s)).toBe(true);
  });

  it("is false when a piece is selected", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectPiece",
      piece: "N",
    });
    s = notationInputReducer(s, { type: "selectFile", file: "f" });
    s = notationInputReducer(s, { type: "toggleCapture" });
    expect(computeIsPawnCaptureMode(s)).toBe(false);
  });
});

// ============================================================
// computeIsSubmittable
// ============================================================
describe("computeIsSubmittable", () => {
  it("returns false when input is empty", () => {
    expect(computeIsSubmittable(createInitialState())).toBe(false);
  });

  it("returns true after appendChar", () => {
    const s = notationInputReducer(createInitialState(), {
      type: "appendChar",
      char: "e",
    });
    expect(computeIsSubmittable(s)).toBe(true);
  });

  it("returns true after a structured selection that builds preview text", () => {
    let s = notationInputReducer(createInitialState(), {
      type: "selectPiece",
      piece: "N",
    });
    s = notationInputReducer(s, { type: "selectFile", file: "f" });
    s = notationInputReducer(s, { type: "selectRank", rank: "3" });
    expect(computeIsSubmittable(s)).toBe(true);
  });
});
