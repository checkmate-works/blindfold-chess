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
  it("returns an empty input", () => {
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
// notationInputReducer — appendCastling
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
// notationInputReducer — backspace
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
// notationInputReducer — clear
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
});
