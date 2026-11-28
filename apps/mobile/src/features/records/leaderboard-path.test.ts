import { describe, expect, it } from "vitest";

import { leaderboardPath } from "./leaderboard-path";

describe("leaderboardPath", () => {
  it("builds the web's score leaderboard path from the module's slug", () => {
    expect(leaderboardPath("weekly", "square_colors", "white")).toBe(
      "/leaderboard/score/weekly/square-colors/white",
    );
  });

  it("keeps the period and the key as given", () => {
    expect(leaderboardPath("all-time", "legal_moves", "knight")).toBe(
      "/leaderboard/score/all-time/legal-moves/knight",
    );
  });

  it("has no path for a module the registry does not know", () => {
    expect(leaderboardPath("monthly", "no_such_module", "white")).toBe(
      undefined,
    );
  });
});
