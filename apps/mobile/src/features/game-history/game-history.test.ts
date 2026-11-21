import { describe, expect, it } from "vitest";

import {
  MAX_SAVED_GAMES,
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

  it("adds newest first and caps the list", () => {
    let games: SavedGame[] = [];
    for (let i = 0; i < MAX_SAVED_GAMES + 3; i++) {
      games = withGameAdded(games, game(String(i)));
    }
    expect(games).toHaveLength(MAX_SAVED_GAMES);
    expect(games[0].id).toBe(String(MAX_SAVED_GAMES + 2));
  });
});
