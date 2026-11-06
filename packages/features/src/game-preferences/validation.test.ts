import { describe, expect, it } from "vitest";

import { DEFAULT_GAME_PREFERENCES } from "./defaults";
import {
  resolveStoredGamePreferences,
  validateGamePreferences,
} from "./validation";

describe("validateGamePreferences", () => {
  it("returns an empty partial for non-objects", () => {
    expect(validateGamePreferences(null)).toEqual({});
    expect(validateGamePreferences("x")).toEqual({});
    expect(validateGamePreferences(42)).toEqual({});
  });

  it("keeps valid values and drops invalid or unknown keys", () => {
    expect(
      validateGamePreferences({
        showCoordinates: false,
        highlightLastMove: "yes",
        boardTheme: "chesscom",
        pieceShapeMode: "circles-own",
        pieceColors: "purple",
        pawnHideMode: "opponent",
        moveInputMode: "text",
        buttonInputPieceLabel: "text",
        aiReplyDuration: 7000,
        somethingElse: true,
      }),
    ).toEqual({
      showCoordinates: false,
      boardTheme: "chesscom",
      pieceShapeMode: "circles-own",
      pawnHideMode: "opponent",
      moveInputMode: "text",
      buttonInputPieceLabel: "text",
    });
  });

  it("filters enabledMoveInputModes and drops it when nothing valid is left", () => {
    expect(
      validateGamePreferences({ enabledMoveInputModes: ["text", "voice"] }),
    ).toEqual({ enabledMoveInputModes: ["text"] });
    expect(
      validateGamePreferences({ enabledMoveInputModes: ["voice"] }),
    ).toEqual({});
  });

  it("migrates the legacy showBoardButtonInGame boolean", () => {
    expect(validateGamePreferences({ showBoardButtonInGame: true })).toEqual({
      boardVisibility: "peek",
    });
    expect(validateGamePreferences({ showBoardButtonInGame: false })).toEqual({
      boardVisibility: "never",
    });
  });

  it("prefers boardVisibility over the legacy boolean when both are present", () => {
    expect(
      validateGamePreferences({
        boardVisibility: "always",
        showBoardButtonInGame: false,
      }),
    ).toEqual({ boardVisibility: "always" });
  });
});

describe("resolveStoredGamePreferences", () => {
  it("fills absent keys from the defaults", () => {
    expect(
      resolveStoredGamePreferences(
        { showCoordinates: false },
        DEFAULT_GAME_PREFERENCES,
      ),
    ).toEqual({ ...DEFAULT_GAME_PREFERENCES, showCoordinates: false });
  });

  it("repairs a moveInputMode that is not among the enabled modes", () => {
    const resolved = resolveStoredGamePreferences(
      { moveInputMode: "text", enabledMoveInputModes: ["select", "button"] },
      DEFAULT_GAME_PREFERENCES,
    );
    expect(resolved.moveInputMode).toBe("select");
  });

  it("does not mutate the defaults", () => {
    const before = structuredClone(DEFAULT_GAME_PREFERENCES);
    resolveStoredGamePreferences(
      { moveInputMode: "text" },
      DEFAULT_GAME_PREFERENCES,
    );
    expect(DEFAULT_GAME_PREFERENCES).toEqual(before);
  });
});
