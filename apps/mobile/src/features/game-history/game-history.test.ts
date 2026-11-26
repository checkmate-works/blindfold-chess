import { describe, expect, it } from "vitest";

import {
  MAX_SAVED_GAMES,
  isInProgress,
  parseSavedGames,
  withGameAdded,
  type SavedGame,
} from "./game-history";

const game = (id: string): SavedGame => ({
  id,
  finishedAt: "2026-01-01T00:00:00.000Z",
  playerColor: "white",
  skillLevel: 5,
  result: "win",
  moves: ["e4", "e5"],
});

describe("game history", () => {
  it("drops entries that are not saved games", () => {
    expect(
      parseSavedGames(JSON.stringify([game("a"), { id: 1 }, "x"])),
    ).toEqual([game("a")]);
    expect(parseSavedGames("not json")).toEqual([]);
    expect(parseSavedGames(null)).toEqual([]);
  });

  it("keeps a game in progress, which has no result yet", () => {
    const { result: _result, ...unfinished } = game("a");
    expect(parseSavedGames(JSON.stringify([unfinished]))).toEqual([unfinished]);
    expect(isInProgress(unfinished)).toBe(true);
    expect(isInProgress(game("a"))).toBe(false);
  });

  it("drops a game whose operation logs are not logs", () => {
    expect(
      parseSavedGames(
        JSON.stringify([{ ...game("a"), operationLogs: [{ peekCount: "1" }] }]),
      ),
    ).toEqual([]);
  });

  it("replaces a game saved again under the same id", () => {
    const first = { ...game("a"), moves: ["e4"] };
    const later = { ...game("a"), moves: ["e4", "e5", "Nf3"] };
    expect(withGameAdded([game("b"), first], later)).toEqual([
      later,
      game("b"),
    ]);
  });

  it("adds newest first and caps the list", () => {
    let games: SavedGame[] = [];
    for (let i = 0; i < MAX_SAVED_GAMES + 3; i++) {
      games = withGameAdded(games, game(String(i)));
    }
    expect(games).toHaveLength(MAX_SAVED_GAMES);
    expect(games[0].id).toBe(String(MAX_SAVED_GAMES + 2));
  });
});
