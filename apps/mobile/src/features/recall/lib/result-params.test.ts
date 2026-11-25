import { describe, expect, it } from "vitest";

import type { MoveLogEntry } from "../recall-state";
import { decodeRecallLog, encodeRecallLog } from "./result-params";

const LOG: MoveLogEntry[] = [
  { moveNumber: 1, isWhiteMove: true, move: "e4", status: "correct" },
  {
    moveNumber: 1,
    isWhiteMove: false,
    move: "e5",
    status: "incorrect",
    incorrectMove: "d5",
  },
  { moveNumber: 1, isWhiteMove: false, move: "e5", status: "skipped" },
];

describe("recall result params", () => {
  it("round-trips the log", () => {
    expect(decodeRecallLog(encodeRecallLog(LOG))).toEqual(LOG);
  });

  it("reads anything else as an empty log", () => {
    expect(decodeRecallLog(undefined)).toEqual([]);
    expect(decodeRecallLog("not json")).toEqual([]);
    expect(decodeRecallLog('[{"move":"e4"}]')).toEqual([]);
    expect(decodeRecallLog('{"a":1}')).toEqual([]);
  });
});
