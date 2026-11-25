import { describe, expect, it } from "vitest";

import {
  EMPTY_ROUTE_ENTRY,
  routeEntryReducer,
  type RouteEntry,
  type RouteEntryAction,
} from "./route-entry";

function run(...actions: RouteEntryAction[]): RouteEntry {
  return actions.reduce(routeEntryReducer, EMPTY_ROUTE_ENTRY);
}

describe("routeEntryReducer", () => {
  it("commits a square from a file then a rank", () => {
    expect(
      run({ type: "file", file: "c" }, { type: "rank", rank: "3" }),
    ).toEqual({ moves: ["c3"], selectedFile: null, selectedRank: null });
  });

  it("commits a square from a rank then a file", () => {
    expect(
      run({ type: "rank", rank: "3" }, { type: "file", file: "c" }),
    ).toEqual({ moves: ["c3"], selectedFile: null, selectedRank: null });
  });

  it("takes a staged key back when it is pressed again", () => {
    expect(
      run({ type: "file", file: "c" }, { type: "file", file: "c" }),
    ).toEqual(EMPTY_ROUTE_ENTRY);
  });

  it("replaces a staged file with another", () => {
    const state = run(
      { type: "file", file: "c" },
      { type: "file", file: "d" },
      { type: "rank", rank: "5" },
    );
    expect(state.moves).toEqual(["d5"]);
  });

  it("drops the last square and the stage on undo", () => {
    const state = run(
      { type: "file", file: "c" },
      { type: "rank", rank: "3" },
      { type: "file", file: "d" },
      { type: "rank", rank: "5" },
      { type: "file", file: "e" },
      { type: "undo" },
    );
    expect(state).toEqual({
      moves: ["c3"],
      selectedFile: null,
      selectedRank: null,
    });
  });
});
