import {
  DEFAULT_GAME_PREFERENCES,
  pickPerGamePreferences,
} from "@blindfold-chess/features/game-preferences";
import { describe, expect, it } from "vitest";

import { decodeGamePrefsParam, encodeGamePrefsParam } from "./game-prefs-param";

describe("gamePrefs route param", () => {
  it("round-trips a snapshot", () => {
    const snapshot = {
      ...pickPerGamePreferences(DEFAULT_GAME_PREFERENCES),
      boardVisibility: "never" as const,
      aiReplyDuration: 0 as const,
    };
    expect(decodeGamePrefsParam(encodeGamePrefsParam(snapshot))).toEqual(
      snapshot,
    );
  });

  it("yields no overrides for a missing or unreadable param", () => {
    expect(decodeGamePrefsParam(undefined)).toEqual({});
    expect(decodeGamePrefsParam("{not json")).toEqual({});
  });

  it("drops invalid values and keys a game does not snapshot", () => {
    expect(
      decodeGamePrefsParam(
        JSON.stringify({
          boardVisibility: "sometimes",
          pawnHideMode: "all",
          boardTheme: "lichess",
        }),
      ),
    ).toEqual({ pawnHideMode: "all" });
  });
});
