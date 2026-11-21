import { describe, expect, it } from "vitest";

import {
  computeRecallStats,
  createRecallState,
  isRecallComplete,
  revealRecallMove,
  submitRecallMove,
} from "./recall-state";

const MOVES = ["e4", "e5", "Nf3", "Nc6", "Bb5"];

describe("recall state", () => {
  it("advances on the right move and counts wrong tries", () => {
    let s = createRecallState({
      moves: MOVES,
      firstMover: "white",
      playerColor: "white",
      autoOpponent: false,
    });
    s = submitRecallMove(s, "d4");
    expect(s.index).toBe(0);
    expect(s.mistakes).toBe(1);
    expect(s.lastWrong).toBe("d4");
    s = submitRecallMove(s, "e4");
    expect(s.index).toBe(1);
    expect(s.outcomes).toEqual([{ kind: "recalled", mistakes: 1 }]);
  });

  it("ignores check marks when comparing", () => {
    const s = createRecallState({
      moves: ["Qh5+"],
      firstMover: "white",
      playerColor: "white",
      autoOpponent: false,
    });
    expect(isRecallComplete(submitRecallMove(s, "Qh5"))).toBe(true);
  });

  it("plays the opponent's moves when auto-opponent is on", () => {
    let s = createRecallState({
      moves: MOVES,
      firstMover: "white",
      playerColor: "black",
      autoOpponent: true,
    });
    // White's first move is played for the player.
    expect(s.index).toBe(1);
    s = submitRecallMove(s, "e5");
    expect(s.index).toBe(3);
    s = revealRecallMove(s);
    expect(isRecallComplete(s)).toBe(true);
    expect(computeRecallStats(s)).toEqual({
      total: 2,
      nailed: 1,
      struggled: 0,
      missed: 1,
      mistakes: 0,
      rate: 50,
    });
  });

  it("starts with black when the position has black to move", () => {
    const s = createRecallState({
      moves: ["e5", "Nf3"],
      firstMover: "black",
      playerColor: "white",
      autoOpponent: true,
    });
    expect(s.index).toBe(1);
  });
});
