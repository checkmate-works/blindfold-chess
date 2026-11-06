import { describe, expect, it, vi } from "vitest";
import { DEFAULT_GAME_PREFERENCES } from "@blindfold-chess/features/game-preferences";

import { createSanitizingPreferencesStorage } from "./sanitizing-storage";

function storageReturning(raw: string | null) {
  return {
    get: vi.fn(async () => raw),
    set: vi.fn(async () => {}),
  };
}

describe("createSanitizingPreferencesStorage", () => {
  it("passes an absent value through", async () => {
    const storage = createSanitizingPreferencesStorage(
      storageReturning(null),
      DEFAULT_GAME_PREFERENCES,
    );
    expect(await storage.get("k")).toBeNull();
  });

  it("returns unparseable JSON untouched so the caller keeps its defaults", async () => {
    const storage = createSanitizingPreferencesStorage(
      storageReturning("{not json"),
      DEFAULT_GAME_PREFERENCES,
    );
    expect(await storage.get("k")).toBe("{not json");
  });

  it("drops invalid values, migrates the legacy flag and fills the defaults", async () => {
    const storage = createSanitizingPreferencesStorage(
      storageReturning(
        JSON.stringify({
          showCoordinates: false,
          pieceColors: "purple",
          showBoardButtonInGame: false,
          extra: 1,
        }),
      ),
      DEFAULT_GAME_PREFERENCES,
    );
    const raw = await storage.get("k");
    expect(JSON.parse(raw as string)).toEqual({
      ...DEFAULT_GAME_PREFERENCES,
      showCoordinates: false,
      boardVisibility: "never",
    });
  });

  it("writes through unchanged", async () => {
    const inner = storageReturning(null);
    const storage = createSanitizingPreferencesStorage(
      inner,
      DEFAULT_GAME_PREFERENCES,
    );
    await storage.set("k", "v");
    expect(inner.set).toHaveBeenCalledWith("k", "v");
  });
});
