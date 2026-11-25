import { describe, expect, it } from "vitest";

import {
  autoFillAll,
  computeRecallStats,
  countCurrentMoveMistakes,
  createRecallState,
  isRecallComplete,
  positionOfEntry,
  revealRecallMove,
  setAutoOpponent,
  submitRecallMove,
} from "./recall-state";

const MOVES = ["e4", "e5", "Nf3", "Nc6", "Bb5"];

const fresh = (over: Partial<Parameters<typeof createRecallState>[0]> = {}) =>
  createRecallState({
    moves: MOVES,
    firstMover: "white",
    startMoveNumber: 1,
    playerColor: "white",
    autoOpponent: false,
    ...over,
  });

describe("recall state", () => {
  it("logs a wrong try before the move it belongs to", () => {
    let s = submitRecallMove(fresh(), "d4");
    expect(s.index).toBe(0);
    expect(s.lastFeedback).toEqual({
      type: "incorrect",
      moveNumber: 1,
      isWhiteMove: true,
      move: "d4",
    });
    s = submitRecallMove(s, "e4");
    expect(s.index).toBe(1);
    expect(s.log.map((e) => e.status)).toEqual(["incorrect", "correct"]);
    expect(s.log[0].incorrectMove).toBe("d4");
    expect(s.log[0].move).toBe("e4");
  });

  it("ignores check marks when comparing", () => {
    const s = createRecallState({
      moves: ["Qh5+"],
      firstMover: "white",
      startMoveNumber: 1,
      playerColor: "white",
      autoOpponent: false,
    });
    expect(isRecallComplete(submitRecallMove(s, "Qh5"))).toBe(true);
  });

  it("plays the opponent's moves with auto-opponent on", () => {
    let s = fresh({ playerColor: "black", autoOpponent: true });
    expect(s.index).toBe(1);
    expect(s.log[0].status).toBe("auto");
    s = submitRecallMove(s, "e5");
    expect(s.index).toBe(3);
  });

  it("plays the opponent's move at once when auto-opponent is turned on", () => {
    let s = submitRecallMove(fresh(), "e4");
    s = setAutoOpponent(s, true);
    expect(s.index).toBe(2);
    expect(s.log.at(-1)?.status).toBe("auto");
  });

  it("numbers moves from a black-to-move start", () => {
    const s = createRecallState({
      moves: ["e5", "Nf3"],
      firstMover: "black",
      startMoveNumber: 7,
      playerColor: "black",
      autoOpponent: false,
    });
    const after = revealRecallMove(revealRecallMove(s));
    expect(after.log.map((e) => [e.moveNumber, e.isWhiteMove])).toEqual([
      [7, false],
      [8, true],
    ]);
    expect(after.dontKnowCount).toBe(2);
  });

  it("auto-fills the rest, keeping the opponent's share out of the misses", () => {
    let s = fresh({ autoOpponent: true });
    s = submitRecallMove(s, "e4");
    s = autoFillAll(s);
    expect(isRecallComplete(s)).toBe(true);
    expect(s.log.map((e) => e.status)).toEqual([
      "correct",
      "auto",
      "autoFilled",
      "auto",
      "autoFilled",
    ]);
    expect(computeRecallStats(s.log)).toMatchObject({
      total: 3,
      nailed: 1,
      missed: 2,
    });
  });

  it("counts the wrong tries at the move not yet resolved", () => {
    let s = submitRecallMove(fresh(), "d4");
    s = submitRecallMove(s, "c4");
    expect(countCurrentMoveMistakes(s.log)).toBe(2);
    s = submitRecallMove(s, "e4");
    expect(countCurrentMoveMistakes(s.log)).toBe(0);
  });

  it("counts a stumbled move as recalled, as the web does", () => {
    let s = fresh();
    s = submitRecallMove(s, "e4");
    s = submitRecallMove(s, "d5");
    s = submitRecallMove(s, "e5");
    s = revealRecallMove(s);
    expect(computeRecallStats(s.log)).toEqual({
      total: 3,
      nailed: 1,
      struggled: 1,
      missed: 1,
      mistakes: 1,
      recalled: 2,
      recallRate: 2 / 3,
    });
  });

  it("opens a wrong try at its board and other moves after them", () => {
    let s = submitRecallMove(fresh(), "e4");
    s = submitRecallMove(s, "d5");
    s = submitRecallMove(s, "e5");
    // log: correct e4, incorrect (e5), correct e5
    expect(positionOfEntry(s.log, 0)).toBe(1);
    expect(positionOfEntry(s.log, 1)).toBe(1);
    expect(positionOfEntry(s.log, 2)).toBe(2);
  });
});
