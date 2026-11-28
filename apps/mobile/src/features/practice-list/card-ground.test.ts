import { describe, expect, it } from "vitest";
import { boardThemeColors } from "@blindfold-chess/ui";

import { cardGround, mixHex } from "./card-ground";

describe("mixHex", () => {
  it("keeps the first colour at 0 and gives the second at 1", () => {
    expect(mixHex("#102030", "#ffffff", 0)).toBe("#102030");
    expect(mixHex("#102030", "#ffffff", 1)).toBe("#ffffff");
  });

  it("mixes each channel and pads single digits", () => {
    expect(mixHex("#000000", "#101010", 0.5)).toBe("#080808");
  });
});

describe("cardGround", () => {
  const lichess = boardThemeColors.lichess;

  it("lays the light scheme's example on the board's light square", () => {
    expect(cardGround(lichess, false, "#ffffff")).toEqual({
      fill: lichess.light,
      frame: lichess.dark,
    });
  });

  it("tints the dark card with the dark square instead of the glaring light one", () => {
    const { fill } = cardGround(lichess, true, "#1c1917");
    expect(fill).not.toBe(lichess.light);
    expect(fill).toBe(mixHex("#1c1917", lichess.dark, 0.3));
  });
});
