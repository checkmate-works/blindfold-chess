import { describe, expect, it } from "vitest";

import {
  buildFinalPath,
  evaluateAttempt,
  getShortestPathOrEmpty,
} from "./attempt";

describe("buildFinalPath", () => {
  it("appends the goal when the last entered square is not the goal", () => {
    expect(buildFinalPath(["e4"], "d2")).toEqual(["e4", "d2"]);
  });

  it("appends the goal to an empty input (direct-move attempt)", () => {
    expect(buildFinalPath([], "d2")).toEqual(["d2"]);
  });

  it("keeps the path unchanged when it already ends at the goal", () => {
    expect(buildFinalPath(["e4", "d2"], "d2")).toEqual(["e4", "d2"]);
  });
});

describe("evaluateAttempt", () => {
  it("accepts a legal knight path via a waypoint", () => {
    // b1 → c3 → d5 is two legal knight moves.
    const result = evaluateAttempt("n", "b1", ["c3"], "d5");
    expect(result.success).toBe(true);
    expect(result.message).toBe("correct");
    expect(result.finalMoves).toEqual(["c3", "d5"]);
    expect(result.shortestPath[0]).toBe("b1");
    expect(result.shortestPath[result.shortestPath.length - 1]).toBe("d5");
  });

  it("rejects an illegal hop and still supplies the shortest path", () => {
    // b1 → d5 is not a single knight move.
    const result = evaluateAttempt("n", "b1", [], "d5");
    expect(result.success).toBe(false);
    expect(result.message).toBe("incorrect");
    expect(result.finalMoves).toEqual(["d5"]);
    expect(result.shortestPath.length).toBeGreaterThan(0);
  });

  it("accepts a direct move when start and goal are one move apart", () => {
    const result = evaluateAttempt("r", "a1", [], "a8");
    expect(result.success).toBe(true);
  });
});

describe("getShortestPathOrEmpty", () => {
  it("includes both endpoints for a reachable goal", () => {
    const path = getShortestPathOrEmpty("b", "c1", "h6");
    expect(path[0]).toBe("c1");
    expect(path[path.length - 1]).toBe("h6");
  });

  it("returns [] when the goal is unreachable", () => {
    // A light-squared bishop can never reach a dark square.
    expect(getShortestPathOrEmpty("b", "f1", "a1")).toEqual([]);
  });
});
