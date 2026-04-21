import { describe, expect, it } from "vitest";

import {
  computeIsSubmittable,
  createInitialState,
  notationInputReducer,
} from "../state-machine";
import { MAX_NOTATION_INPUT_LENGTH } from "../types";

// ============================================================
// createInitialState
// ============================================================
describe("createInitialState", () => {
  it("returns a state with empty input", () => {
    expect(createInitialState()).toEqual({ input: "" });
  });

  it("returns a new object on each call (no shared reference)", () => {
    const a = createInitialState();
    const b = createInitialState();
    expect(a).not.toBe(b);
  });
});

// ============================================================
// notationInputReducer — appendChar
// ============================================================
describe("notationInputReducer — appendChar", () => {
  it("appends a single character to input", () => {
    const next = notationInputReducer(
      { input: "" },
      { type: "appendChar", char: "e" },
    );
    expect(next).toEqual({ input: "e" });
  });

  it("appends onto a non-empty input", () => {
    const next = notationInputReducer(
      { input: "e" },
      { type: "appendChar", char: "4" },
    );
    expect(next).toEqual({ input: "e4" });
  });

  it("is a no-op when input is already at MAX_NOTATION_INPUT_LENGTH", () => {
    const full = "a".repeat(MAX_NOTATION_INPUT_LENGTH);
    const state = { input: full };
    const next = notationInputReducer(state, {
      type: "appendChar",
      char: "b",
    });
    expect(next).toBe(state);
    expect(next.input).toBe(full);
  });

  it("allows the final character when input length is MAX - 1", () => {
    const almostFull = "a".repeat(MAX_NOTATION_INPUT_LENGTH - 1);
    const next = notationInputReducer(
      { input: almostFull },
      { type: "appendChar", char: "b" },
    );
    expect(next.input.length).toBe(MAX_NOTATION_INPUT_LENGTH);
    expect(next.input).toBe(`${almostFull}b`);
  });
});

// ============================================================
// notationInputReducer — appendCastling
// ============================================================
describe("notationInputReducer — appendCastling", () => {
  it("appends O-O when there is room", () => {
    const next = notationInputReducer(
      { input: "" },
      { type: "appendCastling", move: "O-O" },
    );
    expect(next).toEqual({ input: "O-O" });
  });

  it("appends O-O-O when there is room", () => {
    const next = notationInputReducer(
      { input: "" },
      { type: "appendCastling", move: "O-O-O" },
    );
    expect(next).toEqual({ input: "O-O-O" });
  });

  it("is a no-op when the token would overflow MAX_NOTATION_INPUT_LENGTH", () => {
    // Leave fewer than 5 chars of room so "O-O-O" cannot fit.
    const prefix = "a".repeat(MAX_NOTATION_INPUT_LENGTH - 4);
    const state = { input: prefix };
    const next = notationInputReducer(state, {
      type: "appendCastling",
      move: "O-O-O",
    });
    expect(next).toBe(state);
    expect(next.input).toBe(prefix);
  });

  it("appends O-O-O exactly when it fits at the boundary", () => {
    const prefix = "a".repeat(MAX_NOTATION_INPUT_LENGTH - 5);
    const next = notationInputReducer(
      { input: prefix },
      { type: "appendCastling", move: "O-O-O" },
    );
    expect(next.input.length).toBe(MAX_NOTATION_INPUT_LENGTH);
    expect(next.input).toBe(`${prefix}O-O-O`);
  });
});

// ============================================================
// notationInputReducer — backspace
// ============================================================
describe("notationInputReducer — backspace", () => {
  it("removes the last character", () => {
    const next = notationInputReducer({ input: "e4" }, { type: "backspace" });
    expect(next).toEqual({ input: "e" });
  });

  it("is a no-op when input is empty", () => {
    const state = { input: "" };
    const next = notationInputReducer(state, { type: "backspace" });
    expect(next).toBe(state);
    expect(next.input).toBe("");
  });
});

// ============================================================
// notationInputReducer — clear
// ============================================================
describe("notationInputReducer — clear", () => {
  it("resets input to an empty string", () => {
    const next = notationInputReducer({ input: "Nf3" }, { type: "clear" });
    expect(next).toEqual({ input: "" });
  });

  it("returns an empty state even when already empty", () => {
    const next = notationInputReducer({ input: "" }, { type: "clear" });
    expect(next).toEqual({ input: "" });
  });
});

// ============================================================
// computeIsSubmittable
// ============================================================
describe("computeIsSubmittable", () => {
  it("returns false when input is empty", () => {
    expect(computeIsSubmittable({ input: "" })).toBe(false);
  });

  it("returns true when input has a single character", () => {
    expect(computeIsSubmittable({ input: "e" })).toBe(true);
  });

  it("returns true for multi-character input", () => {
    expect(computeIsSubmittable({ input: "Nf3" })).toBe(true);
  });
});
