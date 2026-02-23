import { describe, expect, it } from "vitest";

import {
  buildGoCommand,
  buildPositionCommand,
  parseUciResponse,
  parseUciScore,
} from "./uci-protocol";

describe("parseUciResponse", () => {
  it("should parse uciok response", () => {
    const result = parseUciResponse("uciok");
    expect(result).toEqual({ type: "uciok", raw: "uciok" });
  });

  it("should parse readyok response", () => {
    const result = parseUciResponse("readyok");
    expect(result).toEqual({ type: "readyok", raw: "readyok" });
  });

  it("should parse bestmove response", () => {
    const result = parseUciResponse("bestmove e2e4 ponder e7e5");
    expect(result).toEqual({
      type: "bestmove",
      raw: "bestmove e2e4 ponder e7e5",
      move: "e2e4",
      ponder: "e7e5",
    });
  });

  it("should parse bestmove without ponder", () => {
    const result = parseUciResponse("bestmove g1f3");
    expect(result).toEqual({
      type: "bestmove",
      raw: "bestmove g1f3",
      move: "g1f3",
      ponder: undefined,
    });
  });

  it("should parse info with score", () => {
    const msg = "info depth 15 seldepth 20 score cp 35 nodes 123456 pv e2e4";
    const result = parseUciResponse(msg);
    expect(result).toEqual({ type: "info", raw: msg });
  });

  it("should return null for unrecognised messages", () => {
    expect(parseUciResponse("id name Stockfish 17")).toBeNull();
  });

  it("should return null for info without score", () => {
    expect(parseUciResponse("info depth 10 nodes 50000")).toBeNull();
  });

  it("should return null for an empty string", () => {
    expect(parseUciResponse("")).toBeNull();
  });

  it("should parse bestmove with promotion move", () => {
    const result = parseUciResponse("bestmove e7e8q ponder d1d8");
    expect(result).toEqual({
      type: "bestmove",
      raw: "bestmove e7e8q ponder d1d8",
      move: "e7e8q",
      ponder: "d1d8",
    });
  });

  it("should return null for bestmove with no move token", () => {
    expect(parseUciResponse("bestmove")).toBeNull();
  });

  it("should parse uciok embedded in a longer line", () => {
    const result = parseUciResponse("some prefix uciok suffix");
    expect(result).toEqual({
      type: "uciok",
      raw: "some prefix uciok suffix",
    });
  });

  it("should parse readyok embedded in a longer line", () => {
    const result = parseUciResponse("prefix readyok suffix");
    expect(result).toEqual({
      type: "readyok",
      raw: "prefix readyok suffix",
    });
  });

  it("should return null for option lines", () => {
    expect(
      parseUciResponse(
        "option name Skill Level type spin default 20 min 0 max 20",
      ),
    ).toBeNull();
  });

  it("should parse info with mate score", () => {
    const msg = "info depth 20 score mate 3 pv f3f7";
    const result = parseUciResponse(msg);
    expect(result).toEqual({ type: "info", raw: msg });
  });
});

describe("parseUciScore", () => {
  it("should parse centipawn score", () => {
    const result = parseUciScore(
      "info depth 15 score cp 35 nodes 123456 pv e2e4",
    );
    expect(result).toEqual({ kind: "cp", value: 35 });
  });

  it("should parse negative centipawn score", () => {
    const result = parseUciScore("info depth 10 score cp -120 nodes 5000");
    expect(result).toEqual({ kind: "cp", value: -120 });
  });

  it("should parse mate score", () => {
    const result = parseUciScore("info depth 20 score mate 3 pv f3f7");
    expect(result).toEqual({ kind: "mate", value: 3 });
  });

  it("should parse negative mate score", () => {
    const result = parseUciScore("info depth 18 score mate -2");
    expect(result).toEqual({ kind: "mate", value: -2 });
  });

  it("should return null for lines without score", () => {
    expect(parseUciScore("info depth 10 nodes 50000")).toBeNull();
  });

  it("should return null for an empty string", () => {
    expect(parseUciScore("")).toBeNull();
  });

  it("should parse zero centipawn score", () => {
    const result = parseUciScore("info depth 15 score cp 0 nodes 100");
    expect(result).toEqual({ kind: "cp", value: 0 });
  });

  it("should parse mate in 1", () => {
    const result = parseUciScore("info depth 10 score mate 1 pv e5f7");
    expect(result).toEqual({ kind: "mate", value: 1 });
  });

  it("should parse large centipawn values", () => {
    const result = parseUciScore("info depth 20 score cp 9999 nodes 500");
    expect(result).toEqual({ kind: "cp", value: 9999 });
  });

  it("should prefer cp over mate when both appear (cp first)", () => {
    // In practice this shouldn't happen, but tests the priority
    const result = parseUciScore("info score cp 50 score mate 3");
    expect(result).toEqual({ kind: "cp", value: 50 });
  });
});

describe("buildPositionCommand", () => {
  const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  it("should build position command with FEN only", () => {
    expect(buildPositionCommand(fen)).toBe(`position fen ${fen}`);
  });

  it("should build position command with moves", () => {
    expect(buildPositionCommand(fen, ["e2e4", "e7e5"])).toBe(
      `position fen ${fen} moves e2e4 e7e5`,
    );
  });

  it("should ignore empty moves array", () => {
    expect(buildPositionCommand(fen, [])).toBe(`position fen ${fen}`);
  });

  it("should handle a single move", () => {
    expect(buildPositionCommand(fen, ["e2e4"])).toBe(
      `position fen ${fen} moves e2e4`,
    );
  });

  it("should handle undefined moves", () => {
    expect(buildPositionCommand(fen, undefined)).toBe(`position fen ${fen}`);
  });

  it("should handle promotion moves in the move list", () => {
    const customFen = "1k6/4P3/8/8/8/8/8/4K3 w - - 0 1";
    expect(buildPositionCommand(customFen, ["e7e8q"])).toBe(
      `position fen ${customFen} moves e7e8q`,
    );
  });
});

describe("buildGoCommand", () => {
  it("should build go with movetime", () => {
    expect(buildGoCommand({ movetime: 2000 })).toBe("go movetime 2000");
  });

  it("should build go with depth", () => {
    expect(buildGoCommand({ depth: 15 })).toBe("go depth 15");
  });

  it("should prefer depth over movetime", () => {
    expect(buildGoCommand({ depth: 10, movetime: 2000 })).toBe("go depth 10");
  });

  it("should default to movetime 1000 when no options", () => {
    expect(buildGoCommand({})).toBe("go movetime 1000");
  });

  it("should handle depth 0", () => {
    expect(buildGoCommand({ depth: 0 })).toBe("go depth 0");
  });

  it("should handle depth 1 (minimum useful depth)", () => {
    expect(buildGoCommand({ depth: 1 })).toBe("go depth 1");
  });

  it("should handle very short movetime", () => {
    expect(buildGoCommand({ movetime: 1 })).toBe("go movetime 1");
  });

  it("should handle movetime 0", () => {
    expect(buildGoCommand({ movetime: 0 })).toBe("go movetime 0");
  });
});
