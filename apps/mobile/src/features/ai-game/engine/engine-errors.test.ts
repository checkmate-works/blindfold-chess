import {
  EngineBusyError,
  EngineNoMoveError,
  UciConversionError,
} from "@blindfold-chess/features/ai-game/engine";
import { describe, expect, it } from "vitest";

import {
  type EngineError,
  isRetryableEngineError,
  toEngineError,
} from "./engine-errors";

const FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("toEngineError", () => {
  it("recognises the busy guard", () => {
    expect(toEngineError(new EngineBusyError())).toEqual({ kind: "busy" });
  });

  it("recognises an answer that carried no move", () => {
    expect(toEngineError(new EngineNoMoveError())).toEqual({ kind: "no-move" });
  });

  it("reports an unplayable move with the move, the position and the cause", () => {
    const rejection = new Error("Invalid move");
    const error = toEngineError(
      new UciConversionError("e2e5", FEN, { cause: rejection }),
    );

    expect(error).toEqual({
      kind: "unplayable-move",
      uciMove: "e2e5",
      fen: FEN,
      cause: rejection,
    });
  });

  it("does not fold an unplayable move into timeout", () => {
    // The whole point of the kind: these two used to be the same value, and
    // the caller could only respond to both by retrying or to neither.
    const unplayable = toEngineError(new UciConversionError("e2e5", FEN));
    expect(unplayable.kind).not.toBe("timeout");
  });

  it("falls back to timeout for a missed deadline or a dead bridge", () => {
    const cause = new Error("Engine command timeout");
    expect(toEngineError(cause)).toEqual({ kind: "timeout", cause });
  });

  it("falls back to timeout for a thrown non-Error", () => {
    // The WebView bridge can reject with anything that crossed it.
    expect(toEngineError("boom")).toEqual({ kind: "timeout", cause: "boom" });
  });
});

describe("isRetryableEngineError", () => {
  it.each<[EngineError, boolean]>([
    [{ kind: "not-ready", state: "loading" }, true],
    [{ kind: "busy" }, true],
    [{ kind: "timeout", cause: new Error("deadline") }, false],
    [{ kind: "no-move" }, false],
    [
      { kind: "unplayable-move", uciMove: "e2e5", fen: FEN, cause: null },
      false,
    ],
  ])("classifies %o as retryable=%s", (error, expected) => {
    expect(isRetryableEngineError(error)).toBe(expected);
  });

  it("does not invite a retry that would reproduce the same refusal", () => {
    // An unplayable move is deterministic in its position: asking the engine
    // again with the same board yields the same move and the same rejection.
    expect(
      isRetryableEngineError({
        kind: "unplayable-move",
        uciMove: "e2e5",
        fen: FEN,
        cause: null,
      }),
    ).toBe(false);
  });
});
